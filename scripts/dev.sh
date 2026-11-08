#!/usr/bin/env bash
# One command to run the demo: open the tunnels to the Spark (Whisper, Qwen and the voice) if they are not up, then start the app.
# If the Spark is unreachable the app still runs: presets work and voice falls back to the browser.
cd "$(dirname "$0")/.." || exit 1

args=()
nc -z 127.0.0.1 8765 2>/dev/null || args+=(-L 8765:127.0.0.1:8765)   # Whisper
nc -z 127.0.0.1 8800 2>/dev/null || args+=(-L 8800:127.0.0.1:8000)   # Qwen
nc -z 127.0.0.1 8766 2>/dev/null || args+=(-L 8766:127.0.0.1:8766)   # Piper voice

if [ ${#args[@]} -gt 0 ]; then
  echo "Opening tunnels to the Spark..."
  if ssh -f -N -o ExitOnForwardFailure=yes -o ConnectTimeout=6 -o BatchMode=yes "${args[@]}" spark; then
    echo "Spark connected."
  else
    echo "Could not reach the Spark: starting without voice AI."
  fi
fi

exec npx vite "$@"
