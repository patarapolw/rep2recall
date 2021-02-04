#!/usr/bin/env bash

pid=0

# SIGINT-handler
int_handler() {
  if [ $pid -ne 0 ]; then
    /app/backup.sh
    kill -SIGTERM "$pid"
    wait "$pid"
    
  fi
  exit 130; # 128 + 2 -- SIGINT
}
trap 'kill ${!}; int_handler' SIGINT

# SIGTERM-handler
term_handler() {
  if [ $pid -ne 0 ]; then
    /app/backup.sh
    kill -SIGTERM "$pid"
    wait "$pid"
  fi
  exit 143; # 128 + 15 -- SIGTERM
}
trap 'kill ${!}; term_handler' SIGTERM

echo "${BACKUP_CRON}    /app/backup.sh" > /etc/crontab.d/root

/usr/bin/crontab
/usr/local/bin/docker-entrypoint.sh postgres &

pid="$!"

# wait forever
while true
do
  tail -f /dev/null & wait ${!}
done
