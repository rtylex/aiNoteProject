"""Add social features columns to documents table

Revision ID: add_social_features
Revises: 5a225a9e0dd0
Create Date: 2025-12-09

This migration adds the following columns to support social learning features:
- course_name: Course categorization (e.g., CS101, MATH201)
- topic: Topic within the course (e.g., Algorithms, Calculus)
- visibility: 'private' or 'public'
- is_approved: Admin approval status for public documents
- approved_at: Timestamp of approval
- approved_by: Admin user who approved
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_social_features'
down_revision = '5a225a9e0dd0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add course categorization columns
    op.add_column('documents', sa.Column('course_name', sa.String(100), nullable=True))
    op.add_column('documents', sa.Column('topic', sa.String(200), nullable=True))

    # Add visibility and approval columns
    op.add_column('documents', sa.Column('visibility', sa.String(20), nullable=True, server_default='private'))
    op.add_column('documents', sa.Column('is_approved', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('documents', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('documents', sa.Column('approved_by', postgresql.UUID(as_uuid=True), nullable=True))

    # Create indexes for efficient queries
    op.create_index('ix_documents_course_name', 'documents', ['course_name'])
    op.create_index('ix_documents_topic', 'documents', ['topic'])
    op.create_index('ix_documents_visibility', 'documents', ['visibility'])
    op.create_index('ix_documents_is_approved', 'documents', ['is_approved'])

    # Update existing records to have default visibility
    op.execute("UPDATE documents SET visibility = 'private' WHERE visibility IS NULL")
    op.execute("UPDATE documents SET is_approved = false WHERE is_approved IS NULL")


def downgrade() -> None:
    # Remove indexes
    op.drop_index('ix_documents_is_approved', table_name='documents')
    op.drop_index('ix_documents_visibility', table_name='documents')
    op.drop_index('ix_documents_topic', table_name='documents')
    op.drop_index('ix_documents_course_name', table_name='documents')

    # Remove columns
    op.drop_column('documents', 'approved_by')
    op.drop_column('documents', 'approved_at')
    op.drop_column('documents', 'is_approved')
    op.drop_column('documents', 'visibility')
    op.drop_column('documents', 'topic')
    op.drop_column('documents', 'course_name')
