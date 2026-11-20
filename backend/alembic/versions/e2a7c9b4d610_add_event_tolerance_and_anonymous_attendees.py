"""add_event_tolerance_and_anonymous_attendees

Revision ID: e2a7c9b4d610
Revises: b7d4c1a9e2f0
Create Date: 2026-11-19 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2a7c9b4d610"
down_revision: Union[str, Sequence[str], None] = "b7d4c1a9e2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("match_tolerance", sa.Float(), nullable=False, server_default="0.5"),
    )

    op.alter_column(
        "event_attendees",
        "user_id",
        existing_type=sa.UUID(),
        nullable=True,
    )
    op.add_column(
        "event_attendees",
        sa.Column("attendee_key", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_event_attendees_attendee_key"),
        "event_attendees",
        ["attendee_key"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_event_attendee_key",
        "event_attendees",
        ["event_id", "attendee_key"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_event_attendee_key", "event_attendees", type_="unique")
    op.drop_index(op.f("ix_event_attendees_attendee_key"), table_name="event_attendees")
    op.drop_column("event_attendees", "attendee_key")
    op.alter_column(
        "event_attendees",
        "user_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.drop_column("events", "match_tolerance")
