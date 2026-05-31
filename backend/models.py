from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from database import Base


class Article(Base):
    __tablename__ = "articles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    bullet_points = Column(JSON, nullable=False)
    skeleton = Column(JSON, nullable=True)
    mentor_feedback = Column(JSON, nullable=True)

    progress_log = Column(JSON, nullable=True)
    publish_records = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class UserArticle(Base):
    __tablename__ = "user_articles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
