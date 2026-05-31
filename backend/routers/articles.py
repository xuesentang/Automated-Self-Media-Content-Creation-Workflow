from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from schemas import ArticleCreateRequest, ArticleOut

router = APIRouter(prefix="/api/articles", tags=["articles"])


@router.post("")
async def create_article(req: ArticleCreateRequest, db: Session = Depends(get_db)):
    article = Article(
        title=req.title,
        content=req.content,
        bullet_points=req.bulletPoints,
        skeleton=req.skeleton,
        mentor_feedback=req.mentorFeedback,

        progress_log=req.progressLog,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return {"code": 0, "message": "保存成功", "data": {"id": article.id}}


@router.get("")
async def list_articles(page: int = 1, pageSize: int = 20, db: Session = Depends(get_db)):
    total = db.query(Article).count()
    articles = (
        db.query(Article)
        .order_by(Article.created_at.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )
    return {
        "code": 0,
        "message": "ok",
        "data": {
            "items": [ArticleOut.model_validate(a).model_dump(by_alias=True) for a in articles],
            "total": total,
        },
    }


@router.get("/{id}")
async def get_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    return {"code": 0, "data": ArticleOut.model_validate(article).model_dump(by_alias=True)}


@router.delete("/{id}")
async def delete_article(id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == id).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(article)
    db.commit()
    return {"code": 0, "message": "删除成功"}
