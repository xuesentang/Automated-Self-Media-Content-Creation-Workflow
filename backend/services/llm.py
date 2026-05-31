from openai import AsyncOpenAI
from config import DEEPSEEK_API_KEY, LLM_BASE_URL, LLM_MODEL

client = AsyncOpenAI(api_key=DEEPSEEK_API_KEY, base_url=LLM_BASE_URL)


async def stream_llm(system_prompt: str, user_message: str, max_tokens: int = 8192):
    stream = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        stream=True,
        temperature=0.7,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def call_llm(system_prompt: str, user_message: str) -> str:
    response = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.7,
    )
    return response.choices[0].message.content
