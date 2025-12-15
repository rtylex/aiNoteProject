"""Add full_name to user_profiles

Revision ID: add_fullname_to_profiles
Revises: remove_email_from_profiles
Create Date: 2025-12-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_fullname_to_profiles'
down_revision: Union[str, None] = 'remove_email_from_profiles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add full_name column to user_profiles
    op.add_column('user_profiles', sa.Column('full_name', sa.String(100), nullable=True))


def downgrade() -> None:
    # Remove full_name column
    op.drop_column('user_profiles', 'full_name')
