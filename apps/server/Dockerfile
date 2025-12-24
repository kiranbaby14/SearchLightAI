# Base image with CUDA support for GPU inference
FROM nvidia/cuda:12.8.0-cudnn-runtime-ubuntu24.04

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies including Python 3.13 from deadsnakes PPA
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common \
    gnupg \
    && add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    python3.13 \
    python3.13-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.13 /usr/bin/python \
    && ln -sf /usr/bin/python3.13 /usr/bin/python3

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files and README (required by pyproject.toml)
COPY pyproject.toml uv.lock* README.md ./

# Install dependencies
RUN uv sync --no-dev --frozen || uv sync --no-dev

# Copy application code
COPY . .

# Create directories for uploads, frames, audio
RUN mkdir -p uploads frames audio

# Expose port
EXPOSE 8000

# Run migrations and start server
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn main:app --host 0.0.0.0 --port 8000"]