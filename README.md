# AI深度创作引擎

**AI教你怎么写得更好，写作这件事人自己来。**

一个面向学习者的深度文章写作工具。不是AI代写，而是**学习反馈闭环**：通过知识库获取素材 → 将碎片化洞察转化为结构化文章 → 完成从输入到输出的完整链路。

5个人工卡点，AI只负责"审"和"改格式"，人负责"写"和"定方向"。

## 核心工作流

```
结构化输入(≥60字) → 架构师生成骨架 → 用户审核骨架 → 用户写初稿 → 导师审阅 → 用户回应修改 → 终审定稿 → 格式适配 → 存入仓库
```

- **架构师 Agent**：基于用户输入的实操经历和洞察生成文章骨架+引导问题，不给正文
- **导师 Agent**：DanKoe风格表达审视，不改内容，只优化表达。输出具体到字词层面的修改建议
- **知识库查阅**：独立面板，写作全程可随时打开搜索/提问（约60篇vibe coding和产品变现相关文章）
- **风格 Skill**：独立工具，从历史文章提炼个人写作风格 Prompt

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Vite + TypeScript + XState v5 + Ant Design 5 + Tailwind CSS + TipTap |
| 后端 | FastAPI + SQLAlchemy + SQLite + OpenAI Python SDK（接 DeepSeek V4 Pro） |
| 通信 | SSE（流式AI接口）+ REST（普通接口） |

## 项目结构

```
frontend/src/
├── state/          # XState 状态机
├── hooks/          # React Hooks
├── services/       # API 调用 + SSE 封装
├── pages/          # WorkflowPage, WarehousePage, StyleSkillPage
├── components/
│   ├── workflow/   # 步骤组件（InputStep → CompletedStep）
│   ├── knowledge/  # 知识库面板
│   ├── warehouse/  # 文章仓库
│   └── common/     # 通用组件
└── styles/

backend/
├── main.py              # FastAPI 入口 + CORS
├── config.py            # 配置常量
├── database.py          # 数据库连接
├── models.py            # ORM 模型
├── schemas.py           # Pydantic 请求模型
├── routers/             # skeleton, mentor, knowledge, articles, style_skill, publish
├── services/
│   ├── llm.py           # LLM 调用封装
│   ├── knowledge_service.py  # 知识库检索 + RAG
│   ├── prompt_templates.py   # Agent 提示词
│   └── publish_service.py    # 发布平台适配
└── data/                # SQLite 数据库

knowledge-base/          # 知识库原始 Markdown 文件
├── 01-vibe-coding基础/
├── 02-编程工具/
├── 03-经验技巧/
└── 04-产品变现/
```

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- DeepSeek API Key

### 后端

```bash
cd backend

# 创建虚拟环境
python -m venv heartwrite-venv

# 安装依赖
heartwrite-venv/Scripts/pip install -r requirements.txt

# 配置 API Key
cp ../.env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY

# 启动（端口 8000）
heartwrite-venv/Scripts/uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（端口 5173）
npm run dev
```

浏览器打开 `http://localhost:5173`。

> 网络问题：pip 直连 PyPI 超时，加 `--proxy http://127.0.0.1:7890` 走本地代理。

## 产品价值观

- **卡点设计**：思考和表达是人独有的能力，AI不代劳
- **导师质疑**：人需要对抗性反馈才能进步，不需要廉价鼓励
- **成长可见**：表达能力可以训练，进步应该被自己看到

## 文档索引

| 文件 | 内容 |
|------|------|
| [PRD.md](PRD.md) | 产品设计文档 |
| [tect-design.md](tect-design.md) | 融合方案完整技术文档 |
| [mentor-agent-prompt.md](mentor-agent-prompt.md) | 导师Agent系统提示词 |
| [CLAUDE.md](CLAUDE.md) | AI 辅助开发上下文 |
