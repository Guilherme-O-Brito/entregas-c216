import os

from dotenv import load_dotenv

load_dotenv()

APP_KEY = os.getenv("APP_KEY")
if not APP_KEY:
    raise RuntimeError("APP_KEY precisa estar definida no ambiente")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://backend_user:backend_password@localhost:5432/backend_db",
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
