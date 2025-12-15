"""Add email back to user_profiles

Revision ID: add_email_back_to_profiles
Revises: add_fullname_to_profiles
Create Date: 2025-12-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_email_back_to_profiles'
down_revision: Union[str, None] = 'add_fullname_to_profiles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column back to user_profiles for display in admin panel
    op.add_column('user_profiles', sa.Column('email', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('user_profiles', 'email')
