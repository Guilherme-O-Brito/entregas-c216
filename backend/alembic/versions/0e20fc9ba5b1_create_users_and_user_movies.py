"""create users and user movies

Revision ID: 0e20fc9ba5b1
Revises:
Create Date: 2026-11-25 11:46:27.949846

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0e20fc9ba5b1"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "user_movies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("rating", sa.SmallInteger(), nullable=True),
        sa.Column("review", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status = 'assistido' OR (rating IS NULL AND review IS NULL)",
            name="ck_user_movies_watchlist_review",
        ),
        sa.CheckConstraint(
            "status IN ('quero_assistir', 'assistido')", name="ck_user_movies_status"
        ),
        sa.CheckConstraint(
            "rating IS NULL OR rating BETWEEN 0 AND 10",
            name="ck_user_movies_rating_range",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("user_movies")
    op.drop_table("users")
