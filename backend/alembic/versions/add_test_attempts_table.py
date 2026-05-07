"""Add test_attempts table

Revision ID: add_test_attempts_table
Revises: add_query_limit_columns
Create Date: 2025-05-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_test_attempts_table'
down_revision = 'add_query_limit_columns'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'test_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('test_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('total_questions', sa.Integer(), nullable=True),
        sa.Column('percentage', sa.Integer(), nullable=True),
        sa.Column('answers_snapshot', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['test_id'], ['tests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_test_attempts_id'), 'test_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_test_attempts_test_id'), 'test_attempts', ['test_id'], unique=False)
    op.create_index(op.f('ix_test_attempts_user_id'), 'test_attempts', ['user_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_test_attempts_user_id'), table_name='test_attempts')
    op.drop_index(op.f('ix_test_attempts_test_id'), table_name='test_attempts')
    op.drop_index(op.f('ix_test_attempts_id'), table_name='test_attempts')
    op.drop_table('test_attempts')
