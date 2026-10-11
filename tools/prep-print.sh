#!/bin/bash
# Convert an iPhone ProRAW .DNG into a print-ready file for creativehub.
#
#   ./tools/prep-print.sh ~/Desktop/IMG_1234.DNG
#
# Produces an 8-bit sRGB TIFF (losslessly compressed) next to the source, and
# reports the largest print the file actually supports. creativehub accepts
# JPEG/PNG/TIFF — not DNG — so the conversion is required, not optional.
#
# 8-bit is what sips can emit; it's standard and fine for printing straight
# through. If a piece needs heavy colour correction to match the real painting,
# edit the DNG in Photos/Lightroom first and export 16-bit from there instead.
#
# Embedding the colour profile is the part that matters: an untagged file gets
# guessed at by the printer, which is how prints come back with shifted colour.

set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "usage: $0 <file.dng>" >&2
  exit 1
fi

BASE="${SRC%.*}"
OUT="${BASE}-print.tiff"
PROFILE="/System/Library/ColorSync/Profiles/sRGB Profile.icc"

# --- what did we actually capture? ---------------------------------------
W=$(sips -g pixelWidth  "$SRC" | awk '/pixelWidth/{print $2}')
H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/{print $2}')
LONG=$(( W > H ? W : H ))
MP=$(python3 -c "print(f'{$W*$H/1e6:.0f}')")

echo "source : $(basename "$SRC")"
echo "pixels : ${W} x ${H}  (${MP} MP)"
python3 - "$LONG" <<'PY'
import sys
long_edge = int(sys.argv[1])
print(f"max print (long edge):")
for dpi, label in ((300, "300dpi fine-art"), (240, "240dpi good"), (180, "180dpi floor")):
    print(f"           {long_edge/dpi*2.54:5.0f} cm   {label}")
if long_edge < 4724:
    print("\n  WARNING: under 4,724px — not enough for a 40cm print at 300dpi.")
    print("  This is almost certainly a 12MP ProRAW, not 48MP. Check")
    print("  Settings > Camera > Formats > ProRAW Resolution = 48MP and reshoot.")
elif long_edge < 7087:
    print("\n  NOTE: enough for 40cm, short of 60cm at 300dpi (needs 7,087px).")
PY

# --- convert --------------------------------------------------------------
echo
echo "converting to TIFF, sRGB embedded, 300dpi tagged…"
sips -s format tiff \
     --matchTo "$PROFILE" \
     -s dpiWidth 300 -s dpiHeight 300 \
     "$SRC" --out "$OUT" >/dev/null

OW=$(sips  -g pixelWidth   "$OUT" | awk '/pixelWidth/{print $2}')
OH=$(sips  -g pixelHeight  "$OUT" | awk '/pixelHeight/{print $2}')
BIT=$(sips -g bitsPerSample "$OUT" | awk '/bitsPerSample/{print $2}')
DPI=$(sips -g dpiWidth     "$OUT" | awk '/dpiWidth/{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)
PROF=$(sips -g profile     "$OUT" | awk -F': ' '/profile/{print $2}')

echo
echo "output : $OUT"
echo "pixels : ${OW} x ${OH}"
echo "depth  : ${BIT}-bit per channel"
echo "dpi tag: ${DPI}"
echo "profile: ${PROF:-none}"
echo "size   : ${SIZE}"
echo
echo "Next: straighten and crop to the canvas edge before uploading, then check"
echo "the cropped pixel count still clears the target for the size you're selling."
