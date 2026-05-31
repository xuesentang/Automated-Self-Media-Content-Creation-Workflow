import httpx
from config import YIXIAOER_API_BASE, YIXIAOER_APP_ID, YIXIAOER_APP_SECRET


def _headers() -> dict:
    return {
        "X-App-ID": YIXIAOER_APP_ID,
        "X-App-Secret": YIXIAOER_APP_SECRET,
        "Content-Type": "application/json",
    }


async def get_accounts() -> list[dict]:
    """获取已授权媒体账号列表。

    TODO: 等拿到完整API文档后替换以下占位：
    - 确认端点 path
    - 确认请求参数/头
    - 确认返回字段映射
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{YIXIAOER_API_BASE}/v1/accounts",
            headers=_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        # 占位字段映射，等文档确认
        return data.get("accounts", data.get("data", []))


async def submit_publish(
    title: str,
    content: str,
    platforms: list[str],
    article_id: int,
) -> dict:
    """提交发布任务到蚁小二。

    TODO: 等拿到完整API文档后替换以下占位：
    - 确认端点 path
    - 确认请求体字段名
    - 确认返回字段映射（taskId 等）
    """
    payload = {
        "title": title,
        "content": content,
        "platforms": platforms,
        "externalId": str(article_id),
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{YIXIAOER_API_BASE}/v1/publish/submit",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "taskId": data.get("taskId", data.get("id", "")),
            "status": data.get("status", "pending"),
            "results": data.get("results", []),
        }


async def get_publish_status(task_id: str) -> dict:
    """查询发布任务状态。

    TODO: 等拿到完整API文档后替换占位。
    """
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{YIXIAOER_API_BASE}/v1/publish/status/{task_id}",
            headers=_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "taskId": task_id,
            "status": data.get("status", "unknown"),
            "results": data.get("results", []),
        }
