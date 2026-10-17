.PHONY: install run test lint help

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