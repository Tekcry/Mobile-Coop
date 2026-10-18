# Encode WAV files to MP3 with the Windows Media Foundation encoder (no ffmpeg needed). MP3 decodes in iOS Safari,
# Chrome, Edge, Firefox and the test Chromium (which has no AAC). Usage:
# powershell -NoProfile -ExecutionPolicy Bypass -File encode-mp3.ps1 -Kbps 128 in1.wav out1.mp3 [in2.wav out2.mp3 ...]
param([int]$Kbps = 128, [Parameter(ValueFromRemainingArguments = $true)][string[]]$Pairs)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime]
$null = [Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }
function AwaitP($op, [Type]$p) { $task = $asTaskAction.MakeGenericMethod($p).Invoke($null, @($op)); $task.Wait() }
for ($i = 0; $i -lt $Pairs.Count; $i += 2) {
  $in = [IO.Path]::GetFullPath($Pairs[$i]); $out = [IO.Path]::GetFullPath($Pairs[$i + 1])
  $outDir = [IO.Path]::GetDirectoryName($out); $outName = [IO.Path]::GetFileName($out)
  $src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($in)) ([Windows.Storage.StorageFile])
  $folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDir)) ([Windows.Storage.StorageFolder])
  $dst = Await ($folder.CreateFileAsync($outName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $prof = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateMp3([Windows.Media.MediaProperties.AudioEncodingQuality]::High)
  $prof.Audio.Bitrate = [uint32]($Kbps * 1000)
  $prof.Audio.SampleRate = 48000
  $prof.Audio.ChannelCount = 2
  $tc = New-Object Windows.Media.Transcoding.MediaTranscoder
  $prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $prof)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
  if (-not $prep.CanTranscode) { throw "cannot transcode $in : $($prep.FailureReason)" }
  AwaitP ($prep.TranscodeAsync()) ([double])
  Write-Output "$outName $((Get-Item $out).Length)"
}
