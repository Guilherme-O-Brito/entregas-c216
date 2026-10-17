import os


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://dast_api:123ab@localhost:3306/fast_api_db",
)
