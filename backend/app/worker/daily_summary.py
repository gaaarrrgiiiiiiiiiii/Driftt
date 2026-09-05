import logging
import httpx
from datetime import date
from sqlalchemy import select, cast, Date, func
from sqlalchemy.dialects.postgresql import insert
from app.database import AsyncSessionLocal
from app.models.event import Event
from app.models.summary import DailySummary
from app.config import settings

logger = logging.getLogger(__name__)


async def _call_llm_summary(prompt: str) -> str:
    # 1. Anthropic (claude-3-haiku / claude-haiku-4-5)
    if settings.anthropic_api_key:
        headers = {
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 400,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["content"][0]["text"].strip()

    # 2. Google Gemini
    if settings.gemini_api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 400, "temperature": 0.2},
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    # 3. OpenAI
    if settings.openai_api_key:
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "max_tokens": 400,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()

    return ""


async def generate_daily_summary(target_date: date) -> None:
    """
    Generate daily market summary for a specific calendar date.
    Isolated job: read-only against events, writes exclusively to daily_summaries.
    Never raises exceptions — handles LLM or DB errors gracefully.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Query: SELECT * FROM events WHERE occurred_at::date = :date
            result = await db.execute(
                select(Event)
                .where(cast(Event.occurred_at, Date) == target_date)
                .order_by(Event.materiality_score.desc())
            )
            events = result.scalars().all()
            event_count = len(events)

            text = None
            if event_count == 0:
                text = "Quiet day — nothing crossed your thresholds."
            else:
                prompt_lines = [
                    "You are a market analyst summarizing the day's market activity across an investor's watchlist.",
                    "Write ONE cohesive summary sentence or short paragraph (max 400 tokens) covering the most significant events.",
                    "Focus on high materiality movements, price deviations, and thesis triggers. Be direct, clear, and professional.\n",
                    f"Market Date: {target_date.isoformat()}",
                    f"Total Material Events: {event_count}",
                    "Events:",
                ]
                for e in events[:25]:
                    baseline = float(e.price_baseline) if e.price_baseline else float(e.price_at_event)
                    pct = ((float(e.price_at_event) - baseline) / baseline) * 100 if baseline > 0 else 0.0
                    prompt_lines.append(
                        f"- {e.symbol.replace('.NS', '')}: type={e.event_type}, score={float(e.materiality_score):.1f}, "
                        f"price=₹{float(e.price_at_event):,.2f}, return={pct:+.2f}%, z_score={e.z_score}"
                    )

                prompt = "\n".join(prompt_lines)

                try:
                    llm_result = await _call_llm_summary(prompt)
                    if llm_result:
                        text = llm_result
                except Exception as llm_err:
                    logger.warning(f"Daily summary LLM call failed for {target_date}: {llm_err}")
                    text = None

            # Upsert into daily_summaries (ON CONFLICT date DO UPDATE)
            stmt = insert(DailySummary).values(
                date=target_date,
                event_count=event_count,
                text=text,
                generated_at=func.now(),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["date"],
                set_={
                    "event_count": stmt.excluded.event_count,
                    "text": stmt.excluded.text,
                    "generated_at": stmt.excluded.generated_at,
                },
            )
            await db.execute(stmt)
            await db.commit()
            logger.info(f"Daily summary for {target_date} generated (events: {event_count}, has_text: {bool(text)})")

        except Exception as err:
            logger.error(f"Error generating daily summary for {target_date}: {err}", exc_info=True)
            # Never raise; on failure record text = None and best-effort count if possible
            try:
                await db.rollback()
                fallback_stmt = insert(DailySummary).values(
                    date=target_date,
                    event_count=0,
                    text=None,
                    generated_at=func.now(),
                )
                fallback_stmt = fallback_stmt.on_conflict_do_nothing(index_elements=["date"])
                await db.execute(fallback_stmt)
                await db.commit()
            except Exception:
                pass
