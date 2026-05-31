from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.llm import stream_llm
from services.prompt_templates import build_mentor_prompt
from schemas import MentorReviewRequest
import json
import logging

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/api/mentor", tags=["mentor"])


@router.post("/review")
async def review_draft(req: MentorReviewRequest):
    user_message = (
        f"文章骨架：\n{json.dumps(req.skeleton.model_dump(), ensure_ascii=False)}\n\n"
        f"文章初稿：\n{req.draft}"
    )

    prompt = build_mentor_prompt(req.stylePrompt)

    async def event_stream():
        full_response = ""
        try:
            async for chunk in stream_llm(prompt, user_message):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
            if not full_response.strip():
                logger.warning("[Mentor] LLM returned empty content (DeepSeek JSON mode bug)")
                yield f"data: {json.dumps({'type': 'error', 'message': 'AI返回了空内容，请点击重试按钮重新审阅'}, ensure_ascii=False)}\n\n"
                return
            logger.info(f"[Mentor] Raw LLM response ({len(full_response)} chars): {full_response[:300]}")
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"[Mentor] LLM error: {e}, partial response: {full_response[:300]}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
