import logging
import httpx
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.event import Event
from app.config import settings

logger = logging.getLogger(__name__)


def build_prompt(event: Event) -> str:
    baseline = float(event.price_baseline) if event.price_baseline else float(event.price_at_event)
    pct_move = ((float(event.price_at_event) - baseline) / baseline) if baseline > 0 else 0.0
    return (
        "Write one plain-English sentence (max 20 words) summarizing this stock event. "
        "No preamble, no markdown, just the sentence.\n\n"
        f"Symbol: {event.symbol}\n"
        f"Event type: {event.event_type}\n"
        f"Price move: {pct_move:.2%}\n"
        f"Z-score: {event.z_score}\n"
        f"Volume ratio: {event.volume_ratio}x\n"
        f"Thesis crossed: {event.event_type == 'thesis_crossed'}\n"
    )


def fallback_explanation(event: Event) -> str:
    sym = event.symbol.replace(".NS", "")
    baseline = float(event.price_baseline) if event.price_baseline else float(event.price_at_event)
    pct_move = ((float(event.price_at_event) - baseline) / baseline) if baseline > 0 else 0.0

    if event.event_type == "thesis_crossed":
        return f"{sym} breached stated thesis level with {pct_move:+.2%} move to ₹{float(event.price_at_event):,.2f}."
    elif event.event_type == "volatility_breakout":
        return f"{sym} broke out with {pct_move:+.2%} move at {event.z_score}σ volatility on {event.volume_ratio}× volume."
    elif event.event_type == "volume_surge":
        return f"{sym} saw an unusual volume spike of {event.volume_ratio}× against historical baseline."
    else:
        return f"{sym} shifted {pct_move:+.2%} to ₹{float(event.price_at_event):,.2f} ({event.z_score}σ from baseline)."


async def call_llm(prompt: str) -> str:
    """Call free Gemini / Anthropic / OpenAI or return empty for fallback."""
    # 1. Google Gemini (free tier via Google AI Studio)
    if settings.gemini_api_key:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 60, "temperature": 0.2},
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return text

    # 2. Anthropic Claude (if configured)
    if settings.anthropic_api_key:
        headers = {
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 60,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["content"][0]["text"].strip()

    # 3. OpenAI (if configured)
    if settings.openai_api_key:
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "max_tokens": 60,
            "messages": [{"role": "user", "content": prompt}],
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()

    return ""


async def generate_explanation(event_id: int):
    """
    Generate an LLM one-liner explanation for an already-scored event.
    Fire-and-forget; never blocks the event pipeline.
    """
    async with AsyncSessionLocal() as db:
        event = await db.get(Event, event_id)
        if not event:
            return

        prompt = build_prompt(event)
        text = ""
        try:
            text = await call_llm(prompt)
        except Exception as e:
            logger.warning(f"LLM explain request failed for event {event_id}: {e}")

        # If LLM didn't return text, use domain fallback
        if not text:
            text = fallback_explanation(event)

        event.explanation = text[:200]
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            logger.warning(f"Failed saving explanation for event {event_id}: {e}")
