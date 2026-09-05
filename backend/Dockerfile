FROM python:3.11-slim
WORKDIR /app

# Install build & runtime dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY backend/ .

# Copy seed directory for entrypoint database initialization
COPY seed/ ./seed/

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
