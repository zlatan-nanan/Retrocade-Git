#!/bin/bash

GAME_PATH="$1"

if [ -z "$GAME_PATH" ]; then
  echo "Usage: $0 /path/to/game.html"
  exit 1
fi

# If callers still pass the old folder name, transparently remap it.
if [ ! -e "$GAME_PATH" ] && [[ "$GAME_PATH" == *"/scratch/"* ]]; then
  REMAPPED_PATH="${GAME_PATH//\/scratch\//\/retrocade\/}"
  if [ -e "$REMAPPED_PATH" ]; then
    GAME_PATH="$REMAPPED_PATH"
  fi
fi

# macOS can create AppleDouble sidecar files prefixed with "._".
# If one is passed, switch to the real file beside it.
GAME_DIR="$(dirname "$GAME_PATH")"
GAME_FILE="$(basename "$GAME_PATH")"
if [[ "$GAME_FILE" == ._* ]]; then
  REAL_FILE="$GAME_DIR/${GAME_FILE#._}"
  if [ -e "$REAL_FILE" ]; then
    GAME_PATH="$REAL_FILE"
  fi
fi

if [ ! -e "$GAME_PATH" ]; then
  echo "Game file not found: $GAME_PATH"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

URL="$(python3 - "$GAME_PATH" <<'PY'
import pathlib
import sys
from urllib.parse import quote

p = pathlib.Path(sys.argv[1]).resolve()
print("file://" + quote(str(p), safe="/"))
PY
)"
export DISPLAY=:0
export XAUTHORITY=/home/nanan/.Xauthority
ES_HEX="0x02a0000b"

if command -v chromium-browser >/dev/null 2>&1; then
  CHROME="chromium-browser"
elif command -v chromium >/dev/null 2>&1; then
  CHROME="chromium"
else
  echo "Chromium not found."
  sleep 3; exit 1
fi


hex_to_dec() { python3 - <<PY
print(int("$1", 16))
PY
}

ES_DEC="$(hex_to_dec "$ES_HEX")"
xdotool windowminimize "$ES_DEC" 2>/dev/null || true
sleep 0.2

"${CHROME}" \
  --kiosk \
  --app="${URL}" \
  --start-fullscreen \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI \
  --overscroll-history-navigation=0 \
  --check-for-update-interval=31536000 \
  >/dev/null 2>&1 &

CHROME_PID=$!

# Start quit monitor -- kills Chromium when Start+Select held together
python3 "$SCRIPT_DIR/quit_monitor.py" "$CHROME_PID" &
QUIT_PID=$!

CH_DEC=""
for i in {1..40}; do
  CH_HEX="$(wmctrl -lx | awk 'tolower($3) ~ /chromium/ {print $1; exit}')"
  if [ -n "$CH_HEX" ]; then
    CH_DEC="$(hex_to_dec "$CH_HEX")"
    break
  fi
  sleep 0.1
done

while kill -0 "$CHROME_PID" 2>/dev/null; do
  if [ -n "$CH_DEC" ]; then
    xdotool windowactivate "$CH_DEC" 2>/dev/null || true
  fi
  sleep 0.3
done

# Clean up quit monitor
kill "$QUIT_PID" 2>/dev/null

xdotool windowactivate "$ES_DEC" 2>/dev/null || true
