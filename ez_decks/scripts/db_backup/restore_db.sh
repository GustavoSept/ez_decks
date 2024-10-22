#!/bin/zsh

# NOTE: make sure the db container is running and ~/.pgdump/ez_decks_db_backup.dump exists

# Exit immediately if a command exits with a non-zero status
set -e

# >>>> Setting up variables
# Getting the directory where the script is located
SCRIPT_DIR=$(dirname "$(realpath "$0")")

# Extracting POSTGRES_USER and POSTGRES_DB from the .env.development file
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$SCRIPT_DIR/../../.env.development.local" | cut -d '=' -f2)

# Defining backup file paths
LOCAL_BACKUP_PATH="$HOME/.pgdump/ez_decks_db_backup.dump"
CONTAINER_BACKUP_PATH="/var/lib/postgresql/data/ez_decks_db_backup.dump"

# Ensure the local backup file exists
if [[ ! -f "$LOCAL_BACKUP_PATH" ]]; then
    echo "Error: Backup file not found at $LOCAL_BACKUP_PATH"
    exit 1
fi

# Copying the backup file to the container
docker cp "$LOCAL_BACKUP_PATH" postgres_db:$CONTAINER_BACKUP_PATH

# Restoring the backup within the container
docker exec -t postgres_db pg_restore -U $POSTGRES_USER -d $POSTGRES_DB -v --clean --if-exists $CONTAINER_BACKUP_PATH

# Cleanup: Remove the backup file from the container after restoring
docker exec -t postgres_db rm -f $CONTAINER_BACKUP_PATH
