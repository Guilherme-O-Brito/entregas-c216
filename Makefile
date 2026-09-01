.PHONY: install run test lint help

UVICORN := poetry run uvicorn
PYTEST := poetry run pytest
RUFF := poetry run ruff

install:
	poetry install

run:
	$(UVICORN) main:app --reload

test:
	$(PYTEST)

lint:
	&(RUFF) check .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +

help:
	@echo "make install - instala dependencias"
	@echo "make run     - inicia servidor"
	@echo "make test    - executa testes automatizados"
	@echo "make lint    - verifica o código"
	@echo "make clean   - limpa caches de execução"