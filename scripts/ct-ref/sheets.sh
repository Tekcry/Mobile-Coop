#!/usr/bin/env bash
# Contact sheets of the CT reference clips (headless ffmpeg): 6 x 4 tiles a sheet, the clip time burned into each tile.
#   bash scripts/ct-ref/sheets.sh <fps> <out dir> <clip.mp4 ...>
# Writes <out>/<clip>-NN.jpg (NN from 01; a sheet covers 24 / fps seconds). (ct-prototype 2026-10-19, overnight catalogue)
set -u
BIN="/c/Users/Micha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
FPS="$1"; OUT="$2"; shift 2
mkdir -p "$OUT"
OUTW="$(cygpath -w "$(cd "$OUT" && pwd)")"
for f in "$@"; do
  name=$(basename "$f" .mp4)
  [ -f "$OUT/$name-01.jpg" ] && continue
  timeout 600 "$BIN/ffmpeg.exe" -v error -y -i "$(cygpath -w "$(cd "$(dirname "$f")" && pwd)/$(basename "$f")")" \
    -vf "fps=$FPS,scale=320:-2,drawtext=fontfile='C\:/Windows/Fonts/consola.ttf':text='%{pts\:flt}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=6x4:padding=2" \
    -q:v 4 "$OUTW/$name-%02d.jpg" < /dev/null && echo "$name $(ls "$OUT"/$name-*.jpg | wc -l)"
done
