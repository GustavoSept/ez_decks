#!/bin/zsh

# Exit immediately if a command exits with a non-zero status
set -e

# >>>> Setting up variables
# Getting the directory where the script is located
SCRIPT_DIR=$(dirname "$(realpath "$0")")

# Extracting POSTGRES_USER and POSTGRES_PASSWORD from the .env.development file
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)

# Executing psql command inside the container with PGPASSWORD set inline
docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD db psql -U $POSTGRES_USER -d $POSTGRES_DB
