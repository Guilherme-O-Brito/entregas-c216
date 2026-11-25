import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://backend_user:backend_password@localhost:5432/backend_db",
)
