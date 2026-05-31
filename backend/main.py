from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

import logging
from config import DEEPSEEK_API_KEY, CORS_ORIGINS, YIXIAOER_ENABLED

logger = logging.getLogger("uvicorn")
if DEEPSEEK_API_KEY in ("your-api-key-here", "", None):
    logger.warning("=" * 60)
    logger.warning("⚠️  DEEPSEEK_API_KEY 未配置！")
    logger.warning("   请在项目根目录 .env 文件中设置有效的 API Key")
    logger.warning("   LLM 调用（骨架生成/导师审阅/格式适配）将无法正常工作")
    logger.warning("=" * 60)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import skeleton, mentor, knowledge, articles, style_skill, publish

app = FastAPI(title="AI深度创作引擎")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

from routers.knowledge import load_user_articles_into_kb
load_user_articles_into_kb()

app.include_router(skeleton.router)
app.include_router(mentor.router)

app.include_router(knowledge.router)
app.include_router(articles.router)
app.include_router(style_skill.router)
if YIXIAOER_ENABLED:
    app.include_router(publish.router)


@app.get("/api/health")
def health():
    return {"code": 0, "message": "ok", "data": {"publishEnabled": YIXIAOER_ENABLED}}
