"""Add operation_type and name fields to deals (safe version)

Revision ID: a0ed4f9a4826
Revises: b84d51acec26
Create Date: 2025-12-12 20:41:00.656700
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a0ed4f9a4826"
down_revision: Union[str, Sequence[str], None] = "b84d51acec26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_has_column(table: str, column: str) -> bool:
    """Check if column exists"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    return column in [c["name"] for c in inspector.get_columns(table)]


def upgrade() -> None:
    """Safe upgrade with conditional logic."""

    # --- 1) Create ENUM (important: checkfirst=True) ---
    deal_operation_enum = sa.Enum(
        "ПОКУПКА",
        "ПРОДАЖА",
        name="dealoperationtype",
    )
    deal_operation_enum.create(op.get_bind(), checkfirst=True)

    # --- 2) Add new columns (conditionally) ---
    if not table_has_column("deals", "operation_type"):
        op.add_column(
            "deals",
            sa.Column("operation_type", deal_operation_enum, nullable=False, server_default="ПОКУПКА"),
        )

    if not table_has_column("deals", "buyer_name"):
        op.add_column("deals", sa.Column("buyer_name", sa.String(), nullable=True))

    if not table_has_column("deals", "seller_name"):
        op.add_column("deals", sa.Column("seller_name", sa.String(), nullable=True))

    # --- 3) Modify nullable constraints ---
    if table_has_column("deals", "buyer_id"):
        op.alter_column(
            "deals", "buyer_id",
            existing_type=sa.Integer(),
            nullable=True
        )

    if table_has_column("deals", "seller_id"):
        op.alter_column(
            "deals", "seller_id",
            existing_type=sa.Integer(),
            nullable=True
        )


def downgrade() -> None:
    """Safe downgrade"""

    if table_has_column("deals", "seller_id"):
        op.alter_column(
            "deals", "seller_id",
            existing_type=sa.Integer(),
            nullable=False
        )

    if table_has_column("deals", "buyer_id"):
        op.alter_column(
            "deals", "buyer_id",
            existing_type=sa.Integer(),
            nullable=False
        )

    if table_has_column("deals", "seller_name"):
        op.drop_column("deals", "seller_name")

    if table_has_column("deals", "buyer_name"):
        op.drop_column("deals", "buyer_name")

    if table_has_column("deals", "operation_type"):
        op.drop_column("deals", "operation_type")

    # Drop ENUM only if exists
    op.execute("DROP TYPE IF EXISTS dealoperationtype CASCADE")
