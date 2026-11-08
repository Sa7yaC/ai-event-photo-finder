"""create_face_embeddings_table

Revision ID: a3c7e2f19b80
Revises: f1fb3405deed
Create Date: 2026-10-20 11:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'a3c7e2f19b80'
down_revision: Union[str, Sequence[str], None] = 'f1fb3405deed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create face_embeddings table with pgvector column and IVFFlat ANN index."""

    # Ensure the pgvector extension is installed in the database
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        'face_embeddings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('photo_id', sa.UUID(), nullable=False),
        sa.Column('event_id', sa.UUID(), nullable=False),
        sa.Column('embedding', Vector(128), nullable=False),
        sa.Column('face_top', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('face_right', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('face_bottom', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('face_left', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['photo_id'], ['photos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_index(
        op.f('ix_face_embeddings_photo_id'),
        'face_embeddings',
        ['photo_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_face_embeddings_event_id'),
        'face_embeddings',
        ['event_id'],
        unique=False,
    )

    # IVFFlat index for approximate nearest-neighbour cosine search.
    # lists=100 is appropriate for up to ~1M rows. Increase for larger datasets.
    # Use CONCURRENTLY in production (requires data to already exist).
    op.execute(
        """
        CREATE INDEX ix_face_embeddings_embedding_ivfflat
        ON face_embeddings
        USING ivfflat (embedding vector_l2_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    """Drop face_embeddings table and associated indexes."""
    op.drop_index('ix_face_embeddings_embedding_ivfflat', table_name='face_embeddings')
    op.drop_index(op.f('ix_face_embeddings_event_id'), table_name='face_embeddings')
    op.drop_index(op.f('ix_face_embeddings_photo_id'), table_name='face_embeddings')
    op.drop_table('face_embeddings')
