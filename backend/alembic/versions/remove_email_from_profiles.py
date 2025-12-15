"""Remove redundant email column from user_profiles

Revision ID: remove_email_from_profiles
Revises: bc35b3193593
Create Date: 2025-12-13

Email is already available from Supabase Auth via current_user.get("email"),
so storing it in user_profiles is redundant and violates normalization.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_email_from_profiles'
down_revision = 'bc35b3193593'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop redundant email column - email is available from Supabase Auth
    op.drop_column('user_profiles', 'email')


def downgrade() -> None:
    # Re-add email column if needed
    op.add_column('user_profiles', sa.Column('email', sa.String(255), nullable=True))
