.PHONY: help up build db-up down db-down db-upgrade db-delete app-key install test test-backend test-front test-e2e lint-backend lint-front format-check-front check-front check-all

COMPOSE := docker compose
POETRY := poetry
BUILD := docker build .

help:
	@echo "install  instala dependencias"
	@echo "test     executa suite de testes completa"
	@echo "test-backend executa os testes do backend"
	@echo "test-front executa os testes unitarios e de integracao do frontend"
	@echo "test-e2e executa os testes end-to-end do frontend"
	@echo "lint-backend verifica o codigo Python com Ruff"
	@echo "lint-front verifica o codigo do frontend com Biome"
	@echo "format-check-front verifica a formatacao do frontend com Biome"
	@echo "check-front executa as verificacoes completas do Biome no frontend"
	@echo "check-all instala as dependencias e executa testes e verificacoes do backend e frontend, sem builds"
	@echo "up       constrói e inicia todos os serviços do Compose"
	@echo "build    faz build das imagens docker"
	@echo "db-up    inicia apenas o PostgreSQL"
	@echo "down     para os serviços do Compose"
	@echo "db-down  para apenas o PostgreSQL"
	@echo "db-upgrade aplica as migrations no banco (o container web deve estar iniciado)"
	@echo "db-delete para o PostgreSQL e deleta seu volume de dados"
	@echo "app-key  gera uma chave APP_KEY usando OpenSSL (NECESSITA OPENSSL INSTALADO NO HOST)"

up:
	$(COMPOSE) up -d

build:
	cd backend && $(BUILD) -t backend:1.0
	cd frontend && $(BUILD) -t frontend:1.0

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
	cd frontend && npm ci

test:
	cd backend && poetry run pytest
	cd frontend && npm test
	cd frontend && npm run test:e2e

test-backend:
	cd backend && poetry run pytest

test-front:
	cd frontend && npm test

test-e2e:
	cd frontend && npm run test:e2e

lint-backend:
	cd backend && poetry run ruff format --check .

lint-front:
	cd frontend && npm run lint

format-check-front:
	cd frontend && npm run format:check

check-front:
	cd frontend && npm run check

check-all: install lint-backend check-front test-backend test-front test-e2e
