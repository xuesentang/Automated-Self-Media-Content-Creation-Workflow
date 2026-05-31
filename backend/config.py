import os

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "your-api-key-here")
LLM_BASE_URL = "https://api.deepseek.com"
LLM_MODEL = "deepseek-v4-flash"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/app.db")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
KB_DIR = os.getenv("KB_DIR", "../knowledge-base")
YIXIAOER_API_BASE = os.getenv("YIXIAOER_API_BASE", "https://open-api.yixiaoer.cn")
YIXIAOER_APP_ID = os.getenv("YIXIAOER_APP_ID", "app_EGWF5zGMIOLMnHE-")
YIXIAOER_APP_SECRET = os.getenv("YIXIAOER_APP_SECRET", "")
YIXIAOER_ENABLED = os.getenv("YIXIAOER_ENABLED", "false").lower() == "true"
# 用户在蚁小二已绑定的平台
YIXIAOER_PLATFORMS = ["微信公众号", "头条号", "知乎", "微博"]
