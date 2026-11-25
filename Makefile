.PHONY: help up db-up down db-down db-upgrade

COMPOSE := docker compose
POETRY := poetry

help:
	@echo "up       inicia o PostgreSQL e o FastAPI"
	@echo "db-up    inicia apenas o PostgreSQL"
	@echo "down     para os serviços do Compose"
	@echo "db-down  para apenas o PostgreSQL"
	@echo "db-upgrade aplica as migrations no banco"

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
