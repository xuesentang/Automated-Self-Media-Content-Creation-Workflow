from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.knowledge_service import KnowledgeService
from config import KB_DIR
from schemas import KnowledgeSearchRequest, KnowledgeAskRequest, KnowledgeArticleCreate, KnowledgeArticleOut
from database import get_db, SessionLocal
from models import UserArticle

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

try:
    kb = KnowledgeService(KB_DIR)
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"知识库初始化失败（搜索/问答不可用）: {e}")
    kb = None


def load_user_articles_into_kb():
    """在 main.py 中 create_all 后调用，加载数据库中的用户文章到索引"""
    if kb is None:
        return
    kb.load_user_articles_from_db(SessionLocal)


@router.post("/search")
async def search(req: KnowledgeSearchRequest):
    if kb is None:
        return {"code": 0, "message": "ok", "data": {"results": []}}
    results = kb.search(req.query, req.topK)
    return {"code": 0, "message": "ok", "data": {"results": results}}


@router.post("/ask")
async def ask(req: KnowledgeAskRequest):
    if kb is None:
        return {"code": 0, "message": "ok", "data": {"answer": "知识库当前不可用", "sources": []}}
    result = await kb.ask(req.question)
    return {"code": 0, "message": "ok", "data": result}


@router.post("/articles")
async def create_user_article(req: KnowledgeArticleCreate, db: Session = Depends(get_db)):
    """添加用户文章到知识库"""
    if kb is None:
        return {"code": 0, "message": "知识库未就绪，请稍后重试", "data": None}
    article = UserArticle(title=req.title, content=req.content)
    db.add(article)
    db.commit()
    db.refresh(article)
    kb.add_user_article_chunks(article.id, article.title, article.content)
    return {"code": 0, "message": "添加成功", "data": {"id": article.id}}


@router.get("/articles")
async def list_user_articles(db: Session = Depends(get_db)):
    """获取所有用户文章列表"""
    articles = (
        db.query(UserArticle)
        .order_by(UserArticle.created_at.desc())
        .all()
    )
    return {
        "code": 0,
        "message": "ok",
        "data": [KnowledgeArticleOut.model_validate(a).model_dump() for a in articles],
    }


@router.delete("/articles/{article_id}")
async def delete_user_article(article_id: int, db: Session = Depends(get_db)):
    """删除用户文章并从索引中移除"""
    if kb is None:
        raise HTTPException(status_code=503, detail="知识库未就绪")
    article = db.query(UserArticle).filter(UserArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(article)
    db.commit()
    kb.remove_user_article_chunks(article_id)
    return {"code": 0, "message": "删除成功"}
