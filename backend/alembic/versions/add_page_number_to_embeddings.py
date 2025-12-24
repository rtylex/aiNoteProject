"""Add page_number to document_embeddings

Revision ID: add_page_number
Revises: add_query_limit_columns
Create Date: 2025-12-24

This migration adds a page_number column to track the order of chunks
within a document, enabling full-document context retrieval for cache optimization.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_page_number'
down_revision = 'add_query_limit_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add page_number column to document_embeddings
    op.add_column('document_embeddings',
        sa.Column('page_number', sa.Integer(), nullable=True, server_default='0')
    )
    # Create index for efficient ordering by page_number
    op.create_index('ix_document_embeddings_page_number',
        'document_embeddings', ['page_number'])


def downgrade() -> None:
    op.drop_index('ix_document_embeddings_page_number', table_name='document_embeddings')
    op.drop_column('document_embeddings', 'page_number')
