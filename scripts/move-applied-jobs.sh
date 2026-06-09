#!/usr/bin/env bash
#
# move-applied-jobs.sh
# --------------------
# Collects generated job-application documents out of your Downloads folder and
# moves them into the OneDrive "Applied Jobs" folder.
#
# Handles BOTH shapes the app can produce:
#   • gen_<jobId>.zip   — the ZIP download (e.g. when generated on Vercel)
#   • gen_<jobId>/      — an already-extracted folder
#
# Each ends up as:  <DEST>/gen_<jobId>/<files>
#
# Usage:
#   ./scripts/move-applied-jobs.sh                 # scans ~/Downloads
#   ./scripts/move-applied-jobs.sh /some/other/dir # scans a different source
#
set -euo pipefail

SRC="${1:-$HOME/Downloads}"
DEST="${RESUME_OUTPUT_DIR:-/Users/srinivasanselvam/Library/CloudStorage/OneDrive-Linfox/Priya Resume/Applied Jobs}"

mkdir -p "$DEST"
shopt -s nullglob

moved=0

# 1) Unzip any gen_*.zip into DEST (the zip already contains a gen_<id>/ folder)
for zip in "$SRC"/gen_*.zip; do
  name="$(basename "${zip%.zip}")"
  echo "📦 Unzipping $(basename "$zip") → $name/"
  rm -rf "${DEST:?}/$name"          # replace any previous version
  unzip -o -q "$zip" -d "$DEST"
  rm -f "$zip"
  moved=$((moved + 1))
done

# 2) Move any already-extracted gen_* folders into DEST
for dir in "$SRC"/gen_*/; do
  [ -d "$dir" ] || continue
  name="$(basename "$dir")"
  echo "📁 Moving $name/"
  rm -rf "${DEST:?}/$name"          # replace any previous version
  mv "$dir" "$DEST/"
  moved=$((moved + 1))
done

if [ "$moved" -eq 0 ]; then
  echo "Nothing to move — no gen_* zips or folders found in: $SRC"
else
  echo "✅ Moved $moved item(s) into: $DEST"
fi
