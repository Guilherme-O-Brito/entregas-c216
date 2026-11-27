"""create friendships

Revision ID: 082246282b15
Revises: 0e20fc9ba5b1
Create Date: 2026-11-26 18:05:22.916095

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "082246282b15"
down_revision: str | Sequence[str] | None = "0e20fc9ba5b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_low_id", sa.Integer(), nullable=False),
        sa.Column("user_high_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(8), server_default="pending", nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_low_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_high_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "user_low_id", "user_high_id", name="uq_friendships_user_pair"
        ),
        sa.CheckConstraint(
            "user_low_id < user_high_id", name="ck_friendships_user_order"
        ),
        sa.CheckConstraint(
            "requested_by_id IN (user_low_id, user_high_id)",
            name="ck_friendships_requester",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted')", name="ck_friendships_status"
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("friendships")
