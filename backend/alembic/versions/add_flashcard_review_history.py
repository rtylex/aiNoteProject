"""Add flashcard review history table

Revision ID: add_flashcard_review_history
Revises: add_test_attempts_table
Create Date: 2025-05-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_flashcard_review_history'
down_revision = 'add_test_attempts_table'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'flashcard_review_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('flashcard_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('flashcards.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('set_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('flashcard_sets.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('quality', sa.Integer(), nullable=False),
        sa.Column('ease_factor', sa.Float(), nullable=True),
        sa.Column('interval', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
    )
    op.create_index('ix_history_user_set', 'flashcard_review_history', ['user_id', 'set_id'])
    op.create_index('ix_history_card', 'flashcard_review_history', ['flashcard_id', 'reviewed_at'])


def downgrade():
    op.drop_index('ix_history_card', table_name='flashcard_review_history')
    op.drop_index('ix_history_user_set', table_name='flashcard_review_history')
    op.drop_table('flashcard_review_history')
