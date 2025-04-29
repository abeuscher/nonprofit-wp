#!/bin/bash
set -e

# Load environment variables if .env file exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
fi

# Create backup directory if it doesn't exist
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
mkdir -p $BACKUP_DIR

# Backup timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if containers are already running
if [ "$(docker ps -q -f name=wcgmysql)" ]; then
  echo "Creating database backup before deployment..."
  docker exec wcgmysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} > $BACKUP_DIR/pre_deploy_backup_$TIMESTAMP.sql
  
  if [ $? -eq 0 ]; then
    echo "Backup created successfully at $BACKUP_DIR/pre_deploy_backup_$TIMESTAMP.sql"
  else
    echo "Backup failed! Aborting deployment."
    exit 1
  fi
else
  echo "MySQL container not running. Skipping backup step."
fi

# Pull latest code if git repository exists
if [ -d .git ]; then
  echo "Pulling latest code changes..."
  git pull origin ${GIT_BRANCH:-"main"}
fi

# Rebuild and restart containers
echo "Building and starting Docker containers..."
docker-compose down
docker-compose build
docker-compose up -d

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
sleep 10

# Optional: Run WordPress-specific tasks if needed
# For example, clear caches, run WP-CLI commands, etc.
if [ "$(docker ps -q -f name=wcgwebsite)" ]; then
  echo "Running post-deployment tasks..."
  # Uncomment and modify as needed:
  # docker exec wcgwebsite wp cache flush
  # docker exec wcgwebsite wp plugin update --all
fi

echo "Deployment completed successfully!"