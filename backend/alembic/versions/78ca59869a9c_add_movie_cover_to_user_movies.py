"""add movie cover to user movies

Revision ID: 78ca59869a9c
Revises: 082246282b15
Create Date: 2026-11-26 18:45:58.537735

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "78ca59869a9c"
down_revision: str | Sequence[str] | None = "082246282b15"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("user_movies", sa.Column("movie_cover", sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("user_movies", "movie_cover")
