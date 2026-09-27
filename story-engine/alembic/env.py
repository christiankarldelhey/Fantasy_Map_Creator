import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# story-engine/ is the working directory when running `alembic`; make `app`
# importable so migrations share the service's Base metadata and DATABASE_URL.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import DATABASE_URL, Base, MIND_SCHEMA  # noqa: E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def ensure_schema(connection):
    """Alembic's version table lives inside `mind`, so the schema must exist
    before Alembic even checks the current version."""
    connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS {MIND_SCHEMA}'))
    connection.commit()


def run_migrations_offline():
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        version_table_schema=MIND_SCHEMA,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )
    with context.begin_transaction():
        context.execute(text(f'CREATE SCHEMA IF NOT EXISTS {MIND_SCHEMA}'))
        context.run_migrations()


def run_migrations_online():
    connectable = create_engine(DATABASE_URL)
    with connectable.connect() as connection:
        ensure_schema(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=MIND_SCHEMA,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
