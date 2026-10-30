.PHONY: install run test lint help frontend-install frontend-dev frontend-lint frontend-format frontend-check frontend-test frontend-test-e2e frontend-build check-all

PYTHON := poetry run python
PYTEST := poetry run pytest
RUFF := poetry run ruff
COMPOSE := docker compose
ALEMBIC := poetry run alembic

install:
	cd backend && poetry install

run:
	cd backend && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

docker-build:
	docker build -t lab:1.0 ./backend/

docker-clean:
	docker rmi lab:1.0

run-compose:
	$(COMPOSE) up -d

stop-compose:
	$(COMPOSE) down

run-db:
	$(COMPOSE) up -d mariadb

clean-compose:
	$(COMPOSE) down -v

test:
	cd backend && $(PYTEST)

lint:
	cd backend && $(RUFF) check .

frontend-install:
	npm --prefix frontend ci

frontend-dev:
	npm --prefix frontend run dev

frontend-lint:
	npm --prefix frontend run lint

frontend-format:
	npm --prefix frontend run format

frontend-check:
	npm --prefix frontend run check

frontend-test:
	npm --prefix frontend run test

frontend-test-e2e:
	npm --prefix frontend run test:e2e

frontend-build:
	npm --prefix frontend run build

check-all: lint test frontend-check frontend-test frontend-build frontend-test-e2e

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +

db-upgrade:
	cd backend && $(ALEMBIC) upgrade head

db-migration:
	cd backend && $(ALEMBIC) revision --autogenerate -m "$(msg)"

db-current:
	cd backend && $(ALEMBIC) current

help:
	@echo "make install                        - instala dependencias"
	@echo "make run                            - inicia servidor"
	@echo "make test                           - executa testes automatizados"
	@echo "make lint                           - verifica o código"
	@echo "make frontend-install               - instala dependencias do frontend"
	@echo "make frontend-dev                   - inicia o frontend"
	@echo "make frontend-lint                  - verifica o frontend"
	@echo "make frontend-format                - formata o frontend"
	@echo "make frontend-check                 - verifica qualidade do frontend"
	@echo "make frontend-test                  - executa testes do frontend"
	@echo "make frontend-test-e2e              - executa testes E2E"
	@echo "make frontend-build                 - compila o frontend"
	@echo "make check-all                      - verifica backend e frontend"
	@echo "make clean                          - limpa caches de execução"
	@echo "make run-compose                    - executa a aplicação usando docker compose"
	@echo "make stop-compose                   - para a aplicação que esta rodando no compose sem deletar dados persistentes"
	@echo "make run-db                         - executa apenas o banco de dados do compose"
	@echo "make clean-compose                  - para a aplicação no compose limpando todos os dados persistentes"
	@echo "make docker-build                   - faz o build da aplicação no docker"
	@echo "make docker-clean                   - deleta a imagem de build construida usando docker"
	@echo "make db-upgrade                     - executa as migrations"
	@echo "make db-migration  msg="mensagem"   - gera migrations automaticamente"
	@echo "make db-current                     - mostra informações atuais do banco"