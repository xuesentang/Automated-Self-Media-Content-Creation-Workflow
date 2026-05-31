from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.llm import stream_llm
from services.prompt_templates import build_architect_prompt
from schemas import BulletPointsRequest
import json

router = APIRouter(prefix="/api/skeleton", tags=["skeleton"])


@router.post("/generate")
async def generate_skeleton(req: BulletPointsRequest):
    user_message = f"要点：{req.experience}\n洞察：{req.insight}\n疑问：{req.question}"

    prompt = build_architect_prompt(req.stylePrompt)

    async def event_stream():
        try:
            async for chunk in stream_llm(prompt, user_message):
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
