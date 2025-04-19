#!/bin/bash

# Get today's date in the format used in the filenames (YY.M.D)
VERSION=$(date +"%y.%-m.%-d")

BASE_URL="https://github.com/railmapgen/railmapgen.github.io/releases/latest/download"

declare -A FILES
FILES=(
  ["windows_x86"]="railmapgen_${VERSION}_x64-setup.exe"
  # ["windows_arm"]="railmapgen_${VERSION}_arm64-setup.exe"
  # ["macos_x86"]="railmapgen_${VERSION}_x64.dmg"
  ["macos_arm"]="railmapgen_${VERSION}_aarch64.dmg"
  ["linux_x86"]="railmapgen_${VERSION}_amd64.AppImage"
)

cd /www/app

for PLATFORM in "${!FILES[@]}"; do
  FILE="${FILES[$PLATFORM]}"
  SYMLINK="railmapgen_${PLATFORM}.${FILE##*.}"

  echo "Downloading $FILE..."
  curl -LO "$BASE_URL/$FILE"

  if [ -f "$FILE" ]; then
    echo "Updating symlink: $SYMLINK -> $FILE"
    ln -sf "$FILE" "$SYMLINK"
  else
    echo "Warning: $FILE was not downloaded properly."
  fi
done

echo "All files and symlinks are now in /www/app"
ls /www/app -lah
