from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


def to_camel(snake: str) -> str:
    parts = snake.split('_')
    return parts[0] + ''.join(p.title() for p in parts[1:])


class BulletPointsRequest(BaseModel):
    experience: str = Field(default='', description="我的实操经历/具体案例")
    insight: str = Field(default='', description="我的个人感悟")
    question: str = Field(default='', description="我的待解疑问")
    stylePrompt: Optional[str] = Field(default=None, description="用户自定义写作风格偏好")


class SkeletonSectionInput(BaseModel):
    title: str
    purpose: str
    guidingQuestions: List[str]


class SkeletonInput(BaseModel):
    title: str
    sections: List[SkeletonSectionInput]


class MentorReviewRequest(BaseModel):
    draft: str = Field(..., min_length=1, description="纯文本初稿")
    skeleton: SkeletonInput
    stylePrompt: Optional[str] = Field(default=None, description="用户自定义写作风格偏好")



class PublishRequest(BaseModel):
    articleId: int
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    platforms: List[str] = Field(..., min_length=1)


class PublishStatusResponse(BaseModel):
    taskId: str
    status: str  # pending | processing | completed | failed
    results: List[dict] = []


class PlatformAccount(BaseModel):
    id: str
    platform: str
    accountName: str
    avatar: str = ""


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    topK: int = Field(default=5, ge=1, le=20)


class KnowledgeAskRequest(BaseModel):
    question: str = Field(..., min_length=1)


class KnowledgeArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)


class KnowledgeArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    created_at: datetime


class ArticleCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    bulletPoints: dict
    skeleton: Optional[dict] = None
    mentorFeedback: Optional[dict] = None

    progressLog: Optional[List[dict]] = None


class StyleSkillRequest(BaseModel):
    articleIds: List[int] = Field(..., min_length=1)


class ArticleOut(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

    id: int
    title: str
    content: str
    bullet_points: dict
    skeleton: Optional[dict] = None
    mentor_feedback: Optional[dict] = None

    progress_log: Optional[List[dict]] = None
    created_at: datetime
