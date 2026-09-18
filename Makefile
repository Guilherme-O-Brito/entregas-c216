.PHONY: install run test lint help

UVICORN := poetry run uvicorn
PYTEST := poetry run pytest
RUFF := poetry run ruff
COMPOSE := docker compose

install:
	poetry install

run:
	$(UVICORN) main:app --reload

docker-build:
	docker build -t lab:1.0 ./backend/

docker-clean:
	docker rmi lab:1.0

run-compose:
	$(COMPOSE) up -d

stop-compose:
	$(COMPOSE) down

clean-compose:
	$(COMPOSE) down -v

test:
	$(PYTEST)

lint:
	&(RUFF) check .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +

help:
	@echo "make install          - instala dependencias"
	@echo "make run              - inicia servidor"
	@echo "make test             - executa testes automatizados"
	@echo "make lint             - verifica o código"
	@echo "make clean            - limpa caches de execução"
	@echo "make run-compose      - executa a aplicação usando docker compose"
	@echo "make stop-compose     - para a aplicação que esta rodando no compose sem deletar dados persistentes"
	@echo "make clean-compose    - para a aplicação no compose limpando todos os dados persistentes"
	@echo "make docker-build     - faz o build da aplicação no docker"
	@echo "make docker-clean     - deleta a imagem de build construida usando docker"