#!/bin/zsh

# NOTE: don't forget to have the db container already running.
# Also, create the .pgdump directory on both local and remote  locations

# Exit immediately if a command exits with a non-zero status
set -e

# >>>> Setting up variables
# Getting the directory where the script is located
SCRIPT_DIR=$(dirname "$(realpath "$0")")

# Extracting POSTGRES_USER and POSTGRES_DB from the .env.development file
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)

# Defining backup file paths
CONTAINER_BACKUP_PATH="/var/lib/postgresql/data/ez_decks_db_backup.dump"
LOCAL_BACKUP_PATH="$HOME/.pgdump/ez_decks_db_backup.dump"


# Ensure the local backup directory exists
mkdir -p $HOME/.pgdump

# Executing pg_dump command inside the container
docker exec -t postgres_db pg_dump -U $POSTGRES_USER -F c -b -v -f $CONTAINER_BACKUP_PATH $POSTGRES_DB

# Copying the backup file from the container to the local machine
docker cp postgres_db:$CONTAINER_BACKUP_PATH $LOCAL_BACKUP_PATH

