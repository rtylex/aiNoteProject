"""Add daily query limit columns to user_profiles

Revision ID: add_query_limit_columns
Revises: bc35b3193593
Create Date: 2024-12-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_query_limit_columns'
down_revision = 'add_email_back_to_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add daily_query_count column with default 0
    op.add_column('user_profiles', 
        sa.Column('daily_query_count', sa.Integer(), nullable=False, server_default='0')
    )
    
    # Add last_query_date column
    op.add_column('user_profiles', 
        sa.Column('last_query_date', sa.Date(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('user_profiles', 'last_query_date')
    op.drop_column('user_profiles', 'daily_query_count')
