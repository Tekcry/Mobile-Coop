#!/usr/bin/env bash
# Convert Steam game-recording clips (DASH .mpd + .m4s) into plain mp4 files (video only, stream copy).
#   bash scripts/ct-ref/convert-clips.sh [src=pc/ct-work] [out=pc/ct-work/clips]
# (ct-prototype 2026-10-19: source and output are arguments; the first run used the locomotion worktree's pc/ct-ref.)
set -u
BIN="/c/Users/Micha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
SRC="$(cd "${1:-pc/ct-work}" && pwd)"
OUT="${2:-pc/ct-work/clips}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
mkdir -p "$OUT"
for clip in "$SRC"/clip_*; do
  [ -d "$clip" ] || continue
  name=$(basename "$clip")
  mpd=$(find "$clip/video" -name session.mpd | head -1)
  [ -z "$mpd" ] && { echo "$name: no mpd"; continue; }
  dest="$OUT/$name.mp4"
  # ffmpeg.exe resolves the DASH fragments only from an absolute Windows path
  [ -f "$dest" ] || timeout 300 "$BIN/ffmpeg.exe" -v error -y -i "$(cygpath -w "$mpd")" -map 0:v:0 -c copy "$(cygpath -w "$dest")" < /dev/null
  info=$(timeout 60 "$BIN/ffprobe.exe" -v error -select_streams v:0 -show_entries stream=avg_frame_rate,width,height:format=duration -of csv=p=0 "$(cygpath -w "$dest")" | tr '\n' ' ')
  echo "$name $info"
done
