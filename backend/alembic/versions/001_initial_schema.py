"""initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint('email')
    )

    # 2. watchlists
    op.create_table(
        'watchlists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # 3. watchlist_items
    op.create_table(
        'watchlist_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('watchlist_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('watchlists.id'), nullable=False),
        sa.Column('symbol', sa.String(), nullable=False),
        sa.Column('thesis_type', sa.String(), nullable=True),
        sa.Column('thesis_value', sa.Numeric(), nullable=True),
        sa.Column('thesis_entry', sa.Numeric(), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint('watchlist_id', 'symbol', name='uq_watchlist_items_watchlist_symbol')
    )

    # 4. snapshots
    op.create_table(
        'snapshots',
        sa.Column('id', sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column('symbol', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('price', sa.Numeric(), nullable=False),
        sa.Column('volume', sa.BigInteger(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('market_open', sa.Boolean(), default=True),
        sa.Column('data_age_seconds', sa.Integer(), nullable=True),
        sa.Column('conflict_flag', sa.Boolean(), default=False),
    )
    op.create_index(op.f('ix_snapshots_symbol'), 'snapshots', ['symbol'], unique=False)

    # 5. events
    op.create_table(
        'events',
        sa.Column('seq', sa.BigInteger(), autoincrement=True, primary_key=True),
        sa.Column('symbol', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('materiality_score', sa.Numeric(), nullable=False),
        sa.Column('z_score', sa.Numeric(), nullable=True),
        sa.Column('volume_ratio', sa.Numeric(), nullable=True),
        sa.Column('price_at_event', sa.Numeric(), nullable=False),
        sa.Column('price_baseline', sa.Numeric(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_fresh', sa.Boolean(), default=True),
        sa.Column('source_conflict', sa.Boolean(), default=False),
        sa.Column('yahoo_price', sa.Numeric(), nullable=True),
        sa.Column('nse_price', sa.Numeric(), nullable=True),
        sa.Column('divergence_pct', sa.Numeric(), nullable=True),
        sa.Column('preferred_source', sa.String(), nullable=True),
    )
    op.create_index(op.f('ix_events_symbol'), 'events', ['symbol'], unique=False)

    # Bug 5 FIX: unique index per (symbol, event_type, IST day)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS ix_events_symbol_type_day
        ON events (
            symbol,
            event_type,
            DATE(occurred_at AT TIME ZONE 'Asia/Kolkata')
        );
    """)

    # 6. baselines
    op.create_table(
        'baselines',
        sa.Column('symbol', sa.String(), primary_key=True),
        sa.Column('session_count', sa.Integer(), default=0),
        sa.Column('mean_return', sa.Numeric(), default=0),
        sa.Column('m2_return', sa.Numeric(), default=0),
        sa.Column('stddev_return', sa.Numeric(), default=0),
        sa.Column('mean_volume', sa.BigInteger(), default=0),
        sa.Column('last_close', sa.Numeric(), nullable=True),
        sa.Column('last_session_date', sa.Date(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    # 7. seen_cursors
    op.create_table(
        'seen_cursors',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('watchlist_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('watchlists.id'), primary_key=True),
        sa.Column('last_seen_seq', sa.BigInteger(), default=0),
        sa.Column('seen_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('seen_cursors')
    op.drop_table('baselines')
    op.execute("DROP INDEX IF EXISTS ix_events_symbol_type_day;")
    op.drop_index(op.f('ix_events_symbol'), table_name='events')
    op.drop_table('events')
    op.drop_index(op.f('ix_snapshots_symbol'), table_name='snapshots')
    op.drop_table('snapshots')
    op.drop_table('watchlist_items')
    op.drop_table('watchlists')
    op.drop_table('users')
