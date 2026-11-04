#!/bin/sh
set -e

# Mount persistent ext4 image if not mounted
if ! mountpoint -q /var/pgdata; then
  mkdir -p /var/pgdata
  mount -o loop /mnt/host/c/Users/mayan/pgdata.img /var/pgdata
fi

mkdir -p /var/pgdata/data /run/postgresql
chown -R postgres:postgres /var/pgdata /run/postgresql

# Initialize if needed
if [ ! -f /var/pgdata/data/PG_VERSION ]; then
  su-exec postgres initdb -D /var/pgdata/data
  echo "listen_addresses = '*'" >> /var/pgdata/data/postgresql.conf
  echo "host all all 0.0.0.0/0 trust" >> /var/pgdata/data/pg_hba.conf
  echo "host all all ::0/0 trust" >> /var/pgdata/data/pg_hba.conf
fi

# Start postgres if not running
if ! su-exec postgres pg_ctl -D /var/pgdata/data status > /dev/null 2>&1; then
  su-exec postgres pg_ctl -D /var/pgdata/data -l /var/pgdata/data/logfile start
  sleep 2
fi

# Ensure user and database exist
su-exec postgres psql -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';" 2>/dev/null || true
su-exec postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
su-exec postgres psql -c "CREATE DATABASE collab_editor OWNER postgres;" 2>/dev/null || true

# Start redis if not running
if ! redis-cli ping > /dev/null 2>&1; then
  redis-server --daemonize yes --protected-mode no
fi

echo "POSTGRES_AND_REDIS_RUNNING"
