# backend/services/knowledge_service.py

import os, re, logging, jieba
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════
# 同义词映射 — 中文AI写作场景
# ═══════════════════════════════════════

SYNONYM_MAP: Dict[str, List[str]] = {
    "提示词": ["prompt", "咒语", "指令"],
    "prompt": ["提示词", "咒语", "指令"],
    "编程": ["写代码", "coding", "开发"],
    "coding": ["编程", "写代码", "开发"],
    "vibe coding": ["氛围编程", "直觉编程", "AI编程"],
    "ai编程": ["vibe coding", "人工智能编程", "AI coding"],
    "部署": ["上线", "deploy", "发布"],
    "调试": ["debug", "排查", "排错"],
    "工具": ["平台", "软件", "应用", "tool"],
    "变现": ["赚钱", "商业化", "盈利", "monetization"],
    "写作": ["创作", "写文章", "输出"],
    "效率": ["速度", "生产力", "productivity"],
}

@dataclass
class Chunk:
    title: str
    source_path: str
    category: str
    content: str
    content_lower: str
    source_type: str = "system"
    article_id: Optional[int] = None

@dataclass
class SearchResult:
    title: str
    snippet: str
    source: str
    category: str
    score: float
    matchType: str  # "title" | "content" | "synonym"
    sourceType: str = "system"


class KnowledgeService:
    def __init__(self, kb_dir: str):
        self.chunks: List[Chunk] = []
        self._load_all(kb_dir)

    def _load_all(self, kb_dir: str):
        """启动时扫描知识库目录，按段落切分后构建内存索引"""
        kb_path = Path(kb_dir)
        if not kb_path.exists():
            raise FileNotFoundError(f"知识库目录不存在: {kb_dir}。请检查 KB_DIR 配置。")
        if not kb_path.is_dir():
            raise NotADirectoryError(f"知识库路径不是目录: {kb_dir}")

        article_count = 0

        # 1. 加载根目录下的 .md 文件
        for md_file in kb_path.glob("*.md"):
            content = md_file.read_text(encoding='utf-8')
            title = self._extract_title(content) or md_file.stem
            for chunk_text in self._chunk_article(content):
                self.chunks.append(Chunk(
                    title=title,
                    source_path=str(md_file.relative_to(kb_path)),
                    category="根目录",
                    content=chunk_text,
                    content_lower=chunk_text.lower(),
                ))
            article_count += 1

        # 2. 加载子目录下的 .md 文件（递归处理嵌套子目录）
        for category_dir in kb_path.iterdir():
            if not category_dir.is_dir():
                continue
            for md_file in category_dir.rglob("*.md"):
                content = md_file.read_text(encoding='utf-8')
                title = self._extract_title(content) or md_file.stem
                for chunk_text in self._chunk_article(content):
                    self.chunks.append(Chunk(
                        title=title,
                        source_path=str(md_file.relative_to(kb_path)),
                        category=category_dir.name,
                        content=chunk_text,
                        content_lower=chunk_text.lower(),
                    ))
                article_count += 1

        logger.info(f"知识库加载完成: {article_count} 篇文章, {len(self.chunks)} 个chunk, 目录: {kb_dir}")
        if article_count == 0:
            logger.warning(f"知识库目录存在但未找到任何 .md 文件: {kb_dir}")

    def _extract_title(self, content: str) -> str:
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        return match.group(1).strip() if match else ""

    def _chunk_article(self, content: str, chunk_size: int = 500) -> List[str]:
        """按段落切分，尽量保持语义完整。超过chunk_size的段落作为独立chunk"""
        paragraphs = re.split(r'\n\n+', content)
        chunks, current = [], ''
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            if len(current) + len(p) > chunk_size and current:
                chunks.append(current)
                current = p
            else:
                current = (current + '\n\n' + p).strip()
        if current:
            chunks.append(current)
        return chunks or [content]

    def load_user_articles_from_db(self, db_session_factory):
        """启动时从 SQLite 加载用户文章到内存索引（先清除已有 user chunk，保证幂等）"""
        self.chunks = [c for c in self.chunks if c.source_type == "system"]
        db = db_session_factory()
        try:
            from models import UserArticle
            articles = db.query(UserArticle).all()
            for article in articles:
                for chunk_text in self._chunk_article(article.content):
                    self.chunks.append(Chunk(
                        title=article.title,
                        source_path=f"user://{article.id}",
                        category="用户素材",
                        content=chunk_text,
                        content_lower=chunk_text.lower(),
                        source_type="user",
                        article_id=article.id,
                    ))
            logger.info(f"从数据库加载了 {len(articles)} 篇用户文章, 当前总chunks: {len(self.chunks)}")
        finally:
            db.close()

    def add_user_article_chunks(self, article_id: int, title: str, content: str):
        """运行时添加一篇用户文章的chunks到内存索引"""
        added = 0
        for chunk_text in self._chunk_article(content):
            self.chunks.append(Chunk(
                title=title,
                source_path=f"user://{article_id}",
                category="用户素材",
                content=chunk_text,
                content_lower=chunk_text.lower(),
                source_type="user",
                article_id=article_id,
            ))
            added += 1
        logger.info(f"已添加用户文章到索引: '{title}' (id={article_id}, {added} chunks)")

    def remove_user_article_chunks(self, article_id: int):
        """运行时从内存索引移除一篇用户文章的所有chunks"""
        before = len(self.chunks)
        self.chunks = [c for c in self.chunks if c.article_id != article_id]
        logger.info(f"已从索引移除用户文章 id={article_id} ({before - len(self.chunks)} chunks)")

    def search(self, query: str, top_k: int = 5) -> List[dict]:
        """
        多路加权搜索：
          - 标题命中：+10 分
          - 正文TF：每出现一次 +1 分
          - 同义词匹配：标记 matchType='synonym'
        返回带 matchType 的结果，前端可据此差异化展示
        """
        raw_tokens = query.lower().split() + [t.strip().lower() for t in jieba.lcut(query) if len(t.strip()) > 1]
        query_terms = list(set(raw_tokens))
        expanded_terms = list(set(
            term
            for qt in query_terms
            for term in ([qt] + SYNONYM_MAP.get(qt, []) + SYNONYM_MAP.get(qt.lower(), []))
        ))

        scored: List[tuple] = []

        for chunk in self.chunks:
            score = 0
            match_type = 'content'

            for term in expanded_terms:
                term_lower = term.lower()
                if term_lower in chunk.title.lower():
                    score += 10
                    match_type = 'title'
                score += chunk.content_lower.count(term_lower)

            if match_type != 'title':
                original_hit = any(
                    t.lower() in chunk.title.lower()
                    for t in query_terms
                )
                if not original_hit:
                    synonym_hit = any(
                        t.lower() in chunk.content_lower and t.lower() not in query_terms
                        for t in expanded_terms
                    )
                    if synonym_hit:
                        match_type = 'synonym'

            if score > 0:
                snippet = self._extract_snippet(chunk.content, query_terms)
                scored.append((chunk, score, snippet, match_type))

        scored.sort(key=lambda x: x[1], reverse=True)

        return [
            {
                'title': c.title,
                'snippet': snippet,
                'source': c.source_path,
                'category': c.category,
                'score': min(s / 100, 1.0),
                'matchType': mt,
                'sourceType': c.source_type,
            }
            for c, s, snippet, mt in scored[:top_k]
        ]

    def _extract_snippet(
        self, content: str, query_terms: List[str], max_len: int = 200
    ) -> str:
        """提取包含关键词的文本片段作为摘要"""
        content_lower = content.lower()
        for term in query_terms:
            idx = content_lower.find(term.lower())
            if idx != -1:
                start = max(0, idx - 50)
                end = min(len(content), idx + max_len)
                snippet = content[start:end]
                return (snippet[:max_len] + '...') if len(snippet) > max_len else snippet
        return content[:max_len] + '...'

    async def ask(self, question: str) -> dict:
        """RAG问答：检索Top-10 → 拼接上下文 → LLM生成回答"""
        results = self.search(question, top_k=10)
        context_text = '\n\n'.join(
            f"【来源：{r['title']}】{r['snippet']}" for r in results
        )

        prompt = f"""基于以下参考资料回答用户问题。尽力用已有信息作答，如果某部分信息不足或不确定，请在回答中标注"（不确定）"。

参考资料：
{context_text}

用户问题：{question}

要求：简洁直接，引用资料时标注来源标题。"""

        from services.llm import call_llm
        answer = await call_llm(
            "你是知识库助手，基于给定资料简洁准确地回答用户问题。",
            prompt,
        )

        return {
            'answer': answer,
            'sources': [
                {'title': r['title'], 'snippet': r['snippet'], 'matchType': r['matchType']}
                for r in results
            ],
        }
