#!/usr/bin/env bash
# Convert Steam game-recording clips (DASH .mpd + .m4s) in pc/ct-ref into plain mp4 files in pc/ct-work/clips.
set -u
BIN="/c/Users/Micha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
SRC="/c/NightShift/Mobile-Coop-locomotion/pc/ct-ref"
OUT="/c/NightShift/Mobile-Coop-locomotion/pc/ct-work/clips"
mkdir -p "$OUT"
for clip in "$SRC"/clip_*; do
  name=$(basename "$clip")
  mpd=$(find "$clip/video" -name session.mpd | head -1)
  [ -z "$mpd" ] && { echo "$name: no mpd"; continue; }
  dest="$OUT/$name.mp4"
  [ -f "$dest" ] || timeout 300 "$BIN/ffmpeg.exe" -v error -y -i "$mpd" -map 0:v:0 -c copy "$dest"
  info=$(timeout 60 "$BIN/ffprobe.exe" -v error -select_streams v:0 -show_entries stream=avg_frame_rate,width,height:format=duration -of csv=p=0 "$dest" | tr '\n' ' ')
  echo "$name $info"
done
