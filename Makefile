.PHONY: help up build db-up down db-down db-upgrade db-delete app-key install test

COMPOSE := docker compose
POETRY := poetry
BUILD := docker build .

help:
	@echo "install  instala dependencias"
	@echo "test     executa suite de testes completa"
	@echo "up       constrói e inicia todos os serviços do Compose"
	@echo "build    builda as imagens docker"
	@echo "db-up    inicia apenas o PostgreSQL"
	@echo "down     para os serviços do Compose"
	@echo "db-down  para apenas o PostgreSQL"
	@echo "db-upgrade aplica as migrations no banco (o container web deve estar iniciado)"
	@echo "db-delte para o PostgreSQL e deleta seu volume de dados"
	@echo "app-key  gera uma chave APP_KEY usando OpenSSL (NECESSITA OPENSSL INSTALADO NO HOST)"

up:
	$(COMPOSE) up -d

build:
	cd backend && $(BUILD) -t backend:1.0

db-up:
	$(COMPOSE) up -d postgres

down:
	$(COMPOSE) down

db-down:
	$(COMPOSE) stop postgres

db-upgrade:
	$(COMPOSE) exec web poetry run alembic upgrade head

db-delete:
	$(COMPOSE) down postgres -v

app-key:
	openssl rand -hex 32

install:
	cd backend && poetry install

test:
	cd backend && poetry run pytest
