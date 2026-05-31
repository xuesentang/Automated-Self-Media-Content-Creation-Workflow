import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import StyleSkillRequest
from services.llm import call_llm
from services.prompt_templates import STYLE_SKILL_PROMPT

router = APIRouter(prefix="/api/style-skill", tags=["style_skill"])


@router.post("/generate")
async def generate_style_skill(req: StyleSkillRequest, db: Session = Depends(get_db)):
    articles = db.query(Article).filter(Article.id.in_(req.articleIds)).all()
    if not articles:
        raise HTTPException(status_code=400, detail="未找到所选文章，请至少选择1篇")

    articles_text = "\n\n---\n\n".join(
        f"【文章{a.id}】{a.title}\n\n{a.content}" for a in articles
    )
    result = await call_llm(STYLE_SKILL_PROMPT, f"请分析以下文章的风格特征：\n\n{articles_text}")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, dict) and 'stylePrompt' in parsed:
            result = parsed['stylePrompt']
    except (json.JSONDecodeError, TypeError):
        pass
    return {"code": 0, "data": {"stylePrompt": result}}
