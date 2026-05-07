"""initial full DB

Revision ID: 8d256d9c66f1
Revises: 342436a9489f
Create Date: 2025-11-05 21:03:59.856523

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d256d9c66f1'
down_revision: Union[str, Sequence[str], None] = '342436a9489f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Все таблицы уже созданы в первой миграции (342436a9489f)
    pass


def downgrade() -> None:
    """Downgrade schema."""
    # Возврат к состоянию до этой миграции
    pass