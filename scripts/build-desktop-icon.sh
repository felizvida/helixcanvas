#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SVG="$ROOT_DIR/public/icon.svg"
OUTPUT_DIR="$ROOT_DIR/desktop/icons"
WORK_DIR="$(mktemp -d /tmp/helixcanvas-icon.XXXXXX)"
ICONSET_DIR="$WORK_DIR/HelixCanvas.iconset"

cleanup() {
  rm -rf "$WORK_DIR"
}

trap cleanup EXIT

if [[ ! -f "$SOURCE_SVG" ]]; then
  echo "Missing source icon: $SOURCE_SVG" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR" "$ICONSET_DIR"

qlmanage -t -s 1024 -o "$WORK_DIR" "$SOURCE_SVG" >/dev/null
SOURCE_PNG="$WORK_DIR/$(basename "$SOURCE_SVG").png"

for size in 16 32 128 256 512; do
  retina_size=$((size * 2))
  sips -z "$size" "$size" "$SOURCE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
  sips -z "$retina_size" "$retina_size" "$SOURCE_PNG" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done

cp "$SOURCE_PNG" "$OUTPUT_DIR/icon-1024.png"
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_DIR/icon.icns"
