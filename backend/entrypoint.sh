#!/bin/sh
set -e

echo "🚀 Starting Driftt backend container..."

# 1. Wait for database to be ready
echo "⏳ Verifying database connection..."
python -c "
import asyncio, sys
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

async def check():
    for attempt in range(1, 31):
        try:
            engine = create_async_engine(settings.database_url)
            async with engine.connect() as conn:
                print('✅ Database connection confirmed.')
                await engine.dispose()
                return
        except Exception as e:
            await asyncio.sleep(1)
    print('❌ Database connection timed out after 30 seconds.')
    sys.exit(1)

asyncio.run(check())
"

# 2. Run Alembic database migrations
echo "📦 Running Alembic database migrations..."
alembic upgrade head

# 3. Seed demo data (idempotent - skips if data already exists)
echo "🌱 Initializing demo data if empty..."
python seed/seed.py

# 4. Start production Uvicorn server
echo "✨ Starting Uvicorn server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
