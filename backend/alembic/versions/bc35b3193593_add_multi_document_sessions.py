"""add multi document sessions

Revision ID: bc35b3193593
Revises: add_user_profiles
Create Date: 2025-12-11 10:28:13.036911

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bc35b3193593'
down_revision: Union[str, Sequence[str], None] = 'add_user_profiles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create multi_document_sessions table
    op.create_table('multi_document_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_multi_document_sessions_id'), 'multi_document_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_multi_document_sessions_user_id'), 'multi_document_sessions', ['user_id'], unique=False)
    
    # Create multi_session_messages table
    op.create_table('multi_session_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('sender', sa.String(length=10), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['multi_document_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_multi_session_messages_id'), 'multi_session_messages', ['id'], unique=False)
    
    # Create multi_session_documents (many-to-many) table
    op.create_table('multi_session_documents',
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['multi_document_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('session_id', 'document_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('multi_session_documents')
    op.drop_index(op.f('ix_multi_session_messages_id'), table_name='multi_session_messages')
    op.drop_table('multi_session_messages')
    op.drop_index(op.f('ix_multi_document_sessions_user_id'), table_name='multi_document_sessions')
    op.drop_index(op.f('ix_multi_document_sessions_id'), table_name='multi_document_sessions')
    op.drop_table('multi_document_sessions')
