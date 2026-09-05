from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.worker.scheduler import start_scheduler, stop_scheduler
from app.config import settings
from app.routers import auth, watchlist, feed, quotes, replay, health, stats, summaries


@asynccontextmanager
async def lifespan(app: FastAPI):
    await start_scheduler()
    yield
    await stop_scheduler()


app = FastAPI(title="Driftt — Smart Market Watchlist", version="1.0.0", lifespan=lifespan)

cors_origins = settings.cors_origins_list
is_wildcard = cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/auth",      tags=["auth"])
app.include_router(watchlist.router, prefix="/watchlist",  tags=["watchlist"])
app.include_router(feed.router,      prefix="/feed",       tags=["feed"])
app.include_router(quotes.router,    prefix="/quotes",     tags=["quotes"])
app.include_router(replay.router,    prefix="/replay",     tags=["replay"])
app.include_router(stats.router,     prefix="/stats",      tags=["stats"])
app.include_router(summaries.router, prefix="/summaries",  tags=["summaries"])
app.include_router(summaries.admin_router, prefix="/admin/summaries", tags=["admin-summaries"])
app.include_router(health.router,    prefix="/health",     tags=["health"])
