from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Article
from services import publish_service
from schemas import PublishRequest
from datetime import datetime, timezone

router = APIRouter(prefix="/api/publish", tags=["publish"])


@router.get("/accounts")
async def get_accounts():
    """获取已授权媒体账号列表。"""
    try:
        accounts = await publish_service.get_accounts()
        return {"code": 0, "data": accounts}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"蚁小二接口调用失败：{str(e)}")


@router.post("/submit")
async def submit_publish(req: PublishRequest, db: Session = Depends(get_db)):
    """提交发布任务。"""
    article = db.query(Article).filter(Article.id == req.articleId).first()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")

    try:
        result = await publish_service.submit_publish(
            title=req.title,
            content=req.content,
            platforms=req.platforms,
            article_id=req.articleId,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"蚁小二发布失败：{str(e)}")

    # 记录发布历史到文章
    record = {
        "taskId": result["taskId"],
        "platforms": req.platforms,
        "status": result["status"],
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    if article.publish_records:
        article.publish_records.append(record)
    else:
        article.publish_records = [record]
    db.commit()

    return {"code": 0, "data": result}


@router.get("/status/{task_id}")
async def get_publish_status(task_id: str):
    """查询发布任务状态。"""
    try:
        result = await publish_service.get_publish_status(task_id)
        return {"code": 0, "data": result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"蚁小二状态查询失败：{str(e)}")
