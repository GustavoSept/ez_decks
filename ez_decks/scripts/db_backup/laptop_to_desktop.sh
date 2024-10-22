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

echo "POSTGRES_USER is: $POSTGRES_USER"
echo "POSTGRES_DB is: $POSTGRES_DB"

# Defining backup file paths
CONTAINER_BACKUP_PATH="/var/lib/postgresql/data/ez_decks_db_backup.dump"
LOCAL_BACKUP_PATH="$HOME/.pgdump/ez_decks_db_backup.dump"
REMOTE_BACKUP_PATH="$HOME/.pgdump/ez_decks_db_backup.dump"

# Check if --cleanup argument is passed
CLEANUP=false
if [[ "$1" == "--cleanup" ]]; then
    CLEANUP=true
fi

# Ensure the local backup directory exists
mkdir -p $HOME/.pgdump

# Executing pg_dump command inside the container
docker exec -t postgres_db pg_dump -U $POSTGRES_USER -F c -b -v -f $CONTAINER_BACKUP_PATH $POSTGRES_DB

# Copying the backup file from the container to the local machine
docker cp postgres_db:$CONTAINER_BACKUP_PATH $LOCAL_BACKUP_PATH

# Transfer the backup file to the desktop (remote machine)
scp $LOCAL_BACKUP_PATH desktop:$REMOTE_BACKUP_PATH

# Cleanup: Remove local backup file after transferring if --cleanup is passed
if $CLEANUP; then
    rm -f $LOCAL_BACKUP_PATH
fi
