from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://driftt:changeme@localhost:5432/driftt"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    jwt_secret: str = "replace-with-random-64-char-string-for-dev-driftt"
    jwt_expire_minutes: int = 10080
    yahoo_timeout_s: int = 10
    nse_timeout_s: int = 8
    conflict_threshold: float = 0.005
    demo_user_email: str = "demo@driftt.app"
    demo_user_password: str = "demo123"
    enable_llm: bool = True
    gemini_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://") and not v.startswith("postgresql+"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        if not self.cors_origins:
            return ["http://localhost:3000", "http://localhost:5173"]
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

