import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://dast_api:123ab@localhost:3306/fast_api_db",
)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
