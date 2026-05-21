#!/bin/sh
# On first deploy (empty volume), seed bundled .db files so existing data is preserved
if [ -z "$(ls -A /data 2>/dev/null)" ]; then
  echo "[seed] Copying initial data to persistent volume..."
  cp -r /app/server/data_seed/. /data/
  echo "[seed] Done."
fi
exec node /app/server/index.js
