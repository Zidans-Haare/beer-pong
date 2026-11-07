#!/usr/bin/env bash
# Macht aus den README-Aufnahmen (e2e/readme-media.spec.ts) die GIFs in docs/media.
# Ablauf:
#   RECORD_README=1 E2E_MODE=isolated npx playwright test e2e/readme-media.spec.ts --project=chromium
#   bash scripts/readme-gifs.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=test-results/readme-media
OUT=docs/media
mkdir -p "$OUT"

# Name, Start (s), Länge (s): nur der spannende Teil jeder Aufnahme
CLIPS=(
  "tour 1.2 15"
  "minigame 7.5 12.5"
  "film 6.2 12"
  "podium 1.0 6.5"
  "wrapped 2.0 15"
  "chat 1.0 10"
  "themes 1.2 10.5"
)

for clip in "${CLIPS[@]}"; do
  read -r name start length <<<"$clip"
  ffmpeg -v error -y -ss "$start" -t "$length" -i "$SRC/$name.webm" \
    -vf "fps=10,scale=280:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    -loop 0 "$OUT/$name.gif"
  echo "$OUT/$name.gif $(du -h "$OUT/$name.gif" | cut -f1)"
done
