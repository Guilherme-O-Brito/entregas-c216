.PHONY: help up db-up down db-down db-upgrade db-delete app-key

COMPOSE := docker compose
POETRY := poetry

help:
	@echo "up       inicia o PostgreSQL e o FastAPI"
	@echo "db-up    inicia apenas o PostgreSQL"
	@echo "down     para os serviços do Compose"
	@echo "db-down  para apenas o PostgreSQL"
	@echo "db-upgrade aplica as migrations no banco"
	@echo "db-delte para o PostgreSQL e deleta seu volume de dados"
	@echo "app-key  gera uma chave APP_KEY usando OpenSSL (NECESSITA OPENSSL INSTALADO NO HOST)"

up: db-up
	@cd backend && $(POETRY) run python -m app.main

db-up:
	$(COMPOSE) up -d postgres

down:
	$(COMPOSE) down

db-down:
	$(COMPOSE) stop postgres

db-upgrade:
	cd backend && $(POETRY) run alembic upgrade head

db-delete:
	$(COMPOSE) down postgres -v

app-key:
	openssl rand -hex 32
