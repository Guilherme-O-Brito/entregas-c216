FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml poetry.lock ./
COPY app ./app

RUN pip install --no-cache-dir poetry \
    && poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi --no-root

CMD ["python", "app/main.py"]