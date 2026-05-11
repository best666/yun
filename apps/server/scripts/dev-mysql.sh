#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${MYSQL_DEV_STATE_DIR:-$ROOT_DIR/.local/mysql}"
DATA_DIR="${MYSQL_DEV_DATA_DIR:-$STATE_DIR/data}"
RUN_DIR="$STATE_DIR/run"
LOG_DIR="$STATE_DIR/log"
SOCKET="$RUN_DIR/mysql.sock"
PID_FILE="$RUN_DIR/mysql.pid"
ERROR_LOG="$LOG_DIR/mysql.err"
BOOTSTRAP_MARKER="$STATE_DIR/.bootstrapped"
HOST="${MYSQL_DEV_HOST:-127.0.0.1}"
PORT="${MYSQL_DEV_PORT:-3306}"
ROOT_PASSWORD="${MYSQL_DEV_ROOT_PASSWORD:-password}"
DB_NAME="${MYSQL_DEV_DB_NAME:-yun_food}"

find_mysql_base() {
  local candidates=()

  if [[ -n "${MYSQL_INSTALL_DIR:-}" ]]; then
    candidates+=("$MYSQL_INSTALL_DIR")
  fi

  candidates+=(
    "/usr/local/mysql"
    "/usr/local/mysql-8.2.0-macos13-arm64"
    "/opt/homebrew/opt/mysql"
    "/opt/homebrew/opt/mysql@8.0"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate/bin/mysqld" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v mysqld >/dev/null 2>&1; then
    local mysqld_path
    mysqld_path="$(command -v mysqld)"
    cd "$(dirname "$mysqld_path")/.." && pwd
    return 0
  fi

  return 1
}

MYSQL_BASE="$(find_mysql_base || true)"
if [[ -z "$MYSQL_BASE" ]]; then
  echo "Cannot find mysqld. Set MYSQL_INSTALL_DIR to your MySQL installation path." >&2
  exit 1
fi

MYSQLD="$MYSQL_BASE/bin/mysqld"
MYSQL="$MYSQL_BASE/bin/mysql"
MYSQLADMIN="$MYSQL_BASE/bin/mysqladmin"

mkdir -p "$STATE_DIR" "$RUN_DIR" "$LOG_DIR"

is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

wait_for_socket_ready() {
  local retries="${1:-60}"
  local i
  for ((i = 0; i < retries; i++)); do
    if "$MYSQLADMIN" --protocol=socket --socket="$SOCKET" -uroot ping --silent >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_tcp_ready() {
  local retries="${1:-60}"
  local i
  for ((i = 0; i < retries; i++)); do
    if "$MYSQLADMIN" --protocol=tcp -h "$HOST" -P "$PORT" -uroot -p"$ROOT_PASSWORD" ping --silent >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

ensure_initialized() {
  if [[ -d "$DATA_DIR/mysql" ]]; then
    echo "MySQL data dir already initialized: $DATA_DIR"
    return 0
  fi

  mkdir -p "$DATA_DIR"
  "$MYSQLD" --initialize-insecure --basedir="$MYSQL_BASE" --datadir="$DATA_DIR"
  rm -f "$BOOTSTRAP_MARKER"
  echo "Initialized MySQL data dir: $DATA_DIR"
}

bootstrap_database() {
  if "$MYSQLADMIN" --protocol=tcp -h "$HOST" -P "$PORT" -uroot -p"$ROOT_PASSWORD" ping --silent >/dev/null 2>&1; then
    "$MYSQL" --protocol=tcp -h "$HOST" -P "$PORT" -uroot -p"$ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;" >/dev/null 2>&1 || true
    touch "$BOOTSTRAP_MARKER"
    echo "MySQL credentials already configured for ${HOST}:${PORT}"
    return 0
  fi

  if [[ -f "$BOOTSTRAP_MARKER" ]]; then
    return 0
  fi

  "$MYSQL" --protocol=socket --socket="$SOCKET" -uroot <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED BY '${ROOT_PASSWORD}';
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '${ROOT_PASSWORD}';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
FLUSH PRIVILEGES;
SQL

  touch "$BOOTSTRAP_MARKER"
  echo "Bootstrapped database ${DB_NAME} on ${HOST}:${PORT}"
}

start_server() {
  ensure_initialized

  if is_running; then
    echo "MySQL dev server already running on ${HOST}:${PORT}"
    return 0
  fi

  "$MYSQLD" \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATA_DIR" \
    --port="$PORT" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --bind-address="$HOST" \
    --skip-networking=0 \
    --mysqlx=0 \
    --daemonize \
    --log-error="$ERROR_LOG"

  if wait_for_tcp_ready 5; then
    touch "$BOOTSTRAP_MARKER"
  else
    wait_for_socket_ready 60 || {
      echo "MySQL did not become ready for bootstrap. Check $ERROR_LOG" >&2
      exit 1
    }
    bootstrap_database
    wait_for_tcp_ready 60 || {
      echo "MySQL did not become ready on TCP after bootstrap. Check $ERROR_LOG" >&2
      exit 1
    }
  fi

  echo "MySQL dev server started"
  echo "  host: $HOST"
  echo "  port: $PORT"
  echo "  data: $DATA_DIR"
}

stop_server() {
  if ! is_running; then
    echo "MySQL dev server is not running"
    return 0
  fi

  if ! "$MYSQLADMIN" --protocol=tcp -h "$HOST" -P "$PORT" -uroot -p"$ROOT_PASSWORD" shutdown >/dev/null 2>&1; then
    "$MYSQLADMIN" --protocol=socket --socket="$SOCKET" -uroot shutdown >/dev/null 2>&1 || true
  fi

  local retries=30
  local i
  for ((i = 0; i < retries; i++)); do
    if ! is_running; then
      break
    fi
    sleep 1
  done

  if is_running; then
    echo "MySQL dev server did not stop cleanly. Check $ERROR_LOG" >&2
    exit 1
  fi

  rm -f "$PID_FILE" "$SOCKET"
  echo "MySQL dev server stopped"
}

status_server() {
  echo "mysql_base=$MYSQL_BASE"
  echo "data_dir=$DATA_DIR"
  echo "error_log=$ERROR_LOG"

  if ! is_running; then
    echo "status=stopped"
    return 0
  fi

  if [[ -f "$BOOTSTRAP_MARKER" ]] && "$MYSQLADMIN" --protocol=tcp -h "$HOST" -P "$PORT" -uroot -p"$ROOT_PASSWORD" ping --silent >/dev/null 2>&1; then
    touch "$BOOTSTRAP_MARKER"
    echo "status=running"
    echo "host=$HOST"
    echo "port=$PORT"
    echo "database=$DB_NAME"
    return 0
  fi

  if "$MYSQLADMIN" --protocol=socket --socket="$SOCKET" -uroot ping --silent >/dev/null 2>&1; then
    echo "status=running (bootstrap pending)"
    return 0
  fi

  echo "status=unknown"
  return 1
}

case "${1:-}" in
  init)
    ensure_initialized
    ;;
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    stop_server
    start_server
    ;;
  status)
    status_server
    ;;
  *)
    echo "Usage: $0 {init|start|stop|restart|status}" >&2
    exit 1
    ;;
esac
