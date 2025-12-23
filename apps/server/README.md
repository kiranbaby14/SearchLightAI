## Database Migrations

This project uses [Alembic](https://alembic.sqlalchemy.org/) for database migrations.

### Commands
```bash
# Apply migrations
uv run alembic upgrade head

# Create new migration (after model changes)
uv run alembic revision --autogenerate -m "description"

# Rollback last migration
uv run alembic downgrade -1

# View migration history
uv run alembic history
```

### Workflow

1. Modify models in `app/models/`
2. Generate migration: `uv run alembic revision --autogenerate -m "add user table"`
3. Review generated file in `alembic/versions/`
4. Apply: `uv run alembic upgrade head`

### Fresh Setup
```bash
# Create database
createdb searchlight

# Apply all migrations
uv run alembic upgrade head
```