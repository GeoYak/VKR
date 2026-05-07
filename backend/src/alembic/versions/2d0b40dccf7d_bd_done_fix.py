"""BD done - fix with conditional logic

Revision ID: 2d0b40dccf7d
Revises: dacbd2addef8
Create Date: 2025-12-03 16:19:17.341982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d0b40dccf7d'
down_revision: Union[str, Sequence[str], None] = 'dacbd2addef8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_has_column(table_name: str, column_name: str) -> bool:
    """Check if column exists in table"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    """Create ENUM types and migrate columns"""
    
    # --- Step 1: Create ENUM types ---
    appointment_enum = sa.Enum('ЗАПЛАНИРОВАНО', 'ЗАВЕРШЕНО', 'ОТМЕНЕНО', name='appointmenttype')
    appointment_enum.create(op.get_bind(), checkfirst=True)

    client_enum = sa.Enum('ПРОДАВЕЦ', 'ПОКУПАТЕЛЬ', name='clienttype')
    client_enum.create(op.get_bind(), checkfirst=True)

    document_enum = sa.Enum('СОГЛАШЕНИЕ_КОМИССИИ', 'ДОГОВОР_ПРОДАЖИ', name='documenttype')
    document_enum.create(op.get_bind(), checkfirst=True)

    interaction_enum = sa.Enum('ВЫЗОВ', 'ВСТРЕЧА', 'EMAIL', name='interactiontype')
    interaction_enum.create(op.get_bind(), checkfirst=True)

    property_enum = sa.Enum('КВАРТИРА', 'ДОМ', name='propertytype')
    property_enum.create(op.get_bind(), checkfirst=True)

    deal_enum = sa.Enum('ЗАВЕРШЕНО', 'ОПЛАЧЕНО', 'ОТМЕНЕНО', 'АКТИВНО', name='dealtype')
    deal_enum.create(op.get_bind(), checkfirst=True)

    # --- Step 2: Convert columns to ENUM (conditional) ---
    
    # Appointments - type column exists
    if table_has_column('appointments', 'type'):
        op.execute("ALTER TABLE appointments ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE appointments ALTER COLUMN type TYPE appointmenttype USING type::text::appointmenttype")
        op.execute("ALTER TABLE appointments ALTER COLUMN type SET DEFAULT 'ЗАПЛАНИРОВАНО'::appointmenttype")

    # Clients - type column exists
    if table_has_column('clients', 'type'):
        op.execute("ALTER TABLE clients ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE clients ALTER COLUMN type TYPE clienttype USING type::text::clienttype")
        op.execute("ALTER TABLE clients ALTER COLUMN type SET DEFAULT 'ПОКУПАТЕЛЬ'::clienttype")

    # Documents - type column exists
    if table_has_column('documents', 'type'):
        op.execute("ALTER TABLE documents ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE documents ALTER COLUMN type TYPE documenttype USING type::text::documenttype")

    # Interactions - type column exists
    if table_has_column('interactions', 'type'):
        op.execute("ALTER TABLE interactions ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE interactions ALTER COLUMN type TYPE interactiontype USING type::text::interactiontype")
        op.execute("ALTER TABLE interactions ALTER COLUMN type SET DEFAULT 'ВЫЗОВ'::interactiontype")

    # Properties - type column exists
    if table_has_column('properties', 'type'):
        op.execute("ALTER TABLE properties ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE properties ALTER COLUMN type TYPE propertytype USING type::text::propertytype")
        op.execute("ALTER TABLE properties ALTER COLUMN type SET DEFAULT 'КВАРТИРА'::propertytype")

    # Deals - type column exists (conditionally)
    if table_has_column('deals', 'type'):
        op.execute("ALTER TABLE deals ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE deals ALTER COLUMN type TYPE dealtype USING type::text::dealtype")
        op.execute("ALTER TABLE deals ALTER COLUMN type SET DEFAULT 'АКТИВНО'::dealtype")

    # --- Step 3: Modify clients table ---
    if not table_has_column('clients', 'first_name'):
        op.add_column('clients', sa.Column('first_name', sa.String(), nullable=False, server_default=''))
    if not table_has_column('clients', 'last_name'):
        op.add_column('clients', sa.Column('last_name', sa.String(), nullable=False, server_default=''))
    if table_has_column('clients', 'full_name'):
        op.drop_column('clients', 'full_name')

    # --- Step 4: Modify deals table ---
    if not table_has_column('deals', 'agency_commission_rate'):
        op.add_column('deals', sa.Column('agency_commission_rate', sa.Integer(), server_default='50', nullable=False))
    if not table_has_column('deals', 'agency_commission_amount'):
        op.add_column('deals', sa.Column('agency_commission_amount', sa.Float(), server_default='0.0', nullable=False))
    if not table_has_column('deals', 'agent_commission_rate'):
        op.add_column('deals', sa.Column('agent_commission_rate', sa.Integer(), server_default='3', nullable=False))
    if not table_has_column('deals', 'agent_commission_amount'):
        op.add_column('deals', sa.Column('agent_commission_amount', sa.Float(), server_default='0.0', nullable=False))

    if table_has_column('deals', 'deal_amount'):
        op.alter_column('deals', 'deal_amount',
            existing_type=sa.INTEGER(),
            type_=sa.Float(),
            existing_nullable=False
        )
    
    if table_has_column('deals', 'commission'):
        op.drop_column('deals', 'commission')

    # --- Step 5: Modify users table ---
    if not table_has_column('users', 'first_name'):
        op.add_column('users', sa.Column('first_name', sa.String(), nullable=False, server_default=''))
    if not table_has_column('users', 'last_name'):
        op.add_column('users', sa.Column('last_name', sa.String(), nullable=False, server_default=''))
    if not table_has_column('users', 'phone_number'):
        op.add_column('users', sa.Column('phone_number', sa.String(), nullable=False, server_default=''))
        op.create_unique_constraint('uq_users_phone_number', 'users', ['phone_number'])


def downgrade() -> None:
    """Revert all changes"""
    
    # --- Step 1: Remove new columns and constraints ---
    if table_has_column('users', 'phone_number'):
        try:
            op.drop_constraint('uq_users_phone_number', 'users', type_='unique')
        except Exception:
            pass
        op.drop_column('users', 'phone_number')
    
    if table_has_column('users', 'last_name'):
        op.drop_column('users', 'last_name')
    if table_has_column('users', 'first_name'):
        op.drop_column('users', 'first_name')

    # --- Step 2: Revert deals table ---
    if table_has_column('deals', 'agent_commission_amount'):
        op.drop_column('deals', 'agent_commission_amount')
    if table_has_column('deals', 'agent_commission_rate'):
        op.drop_column('deals', 'agent_commission_rate')
    if table_has_column('deals', 'agency_commission_amount'):
        op.drop_column('deals', 'agency_commission_amount')
    if table_has_column('deals', 'agency_commission_rate'):
        op.drop_column('deals', 'agency_commission_rate')
    
    if not table_has_column('deals', 'commission') and table_has_column('deals', 'deal_amount'):
        op.add_column('deals', sa.Column('commission', sa.INTEGER(), nullable=False, server_default='0'))
    
    if table_has_column('deals', 'deal_amount'):
        op.alter_column('deals', 'deal_amount',
            existing_type=sa.Float(),
            type_=sa.INTEGER(),
            existing_nullable=False
        )

    # --- Step 3: Revert clients table ---
    if not table_has_column('clients', 'full_name') and (table_has_column('clients', 'first_name') or table_has_column('clients', 'last_name')):
        op.add_column('clients', sa.Column('full_name', sa.VARCHAR(), nullable=False, server_default=''))
    
    if table_has_column('clients', 'last_name'):
        op.drop_column('clients', 'last_name')
    if table_has_column('clients', 'first_name'):
        op.drop_column('clients', 'first_name')

    # --- Step 4: Convert ENUM columns back to VARCHAR (conditional) ---
    
    if table_has_column('appointments', 'type'):
        op.execute("ALTER TABLE appointments ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE appointments ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    if table_has_column('clients', 'type'):
        op.execute("ALTER TABLE clients ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE clients ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    if table_has_column('documents', 'type'):
        op.execute("ALTER TABLE documents ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE documents ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    if table_has_column('interactions', 'type'):
        op.execute("ALTER TABLE interactions ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE interactions ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    if table_has_column('properties', 'type'):
        op.execute("ALTER TABLE properties ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE properties ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    if table_has_column('deals', 'type'):
        op.execute("ALTER TABLE deals ALTER COLUMN type DROP DEFAULT")
        op.execute("ALTER TABLE deals ALTER COLUMN type TYPE VARCHAR(50) USING type::text")

    # --- Step 5: Drop ENUM types ---
    op.execute("DROP TYPE IF EXISTS appointmenttype CASCADE")
    op.execute("DROP TYPE IF EXISTS clienttype CASCADE")
    op.execute("DROP TYPE IF EXISTS documenttype CASCADE")
    op.execute("DROP TYPE IF EXISTS interactiontype CASCADE")
    op.execute("DROP TYPE IF EXISTS propertytype CASCADE")
    op.execute("DROP TYPE IF EXISTS dealtype CASCADE")