"""Add user_profiles table for role management

Revision ID: add_user_profiles
Revises: add_social_features
Create Date: 2025-12-09

This migration creates a user_profiles table to store user roles.
The table references Supabase auth.users via user_id.

Roles:
- user: Default role, can upload and use documents
- admin: Can approve/reject public documents
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_profiles'
down_revision = 'add_social_features'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_profiles table
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), unique=True, nullable=False, index=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('role', sa.String(20), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'))
    )

    # Create index on role for efficient admin queries
    op.create_index('ix_user_profiles_role', 'user_profiles', ['role'])


def downgrade() -> None:
    op.drop_index('ix_user_profiles_role', table_name='user_profiles')
    op.drop_table('user_profiles')
