from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.worker.ingestion import run_ingestion

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


async def _scheduled_daily_summary() -> None:
    from datetime import datetime, timezone, timedelta
    from app.worker.daily_summary import generate_daily_summary
    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(ist).date()
    await generate_daily_summary(today)


async def start_scheduler() -> None:
    scheduler.add_job(run_ingestion, "interval", seconds=60, id="ingestion",
                      max_instances=1, coalesce=True)
    # Cron-triggered at 15:35 IST (5 min after market close)
    scheduler.add_job(_scheduled_daily_summary, "cron", hour=15, minute=35, id="daily_summary",
                      max_instances=1, coalesce=True)
    scheduler.start()


async def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
