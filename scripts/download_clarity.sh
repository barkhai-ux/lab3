#!/usr/bin/env bash
set -euo pipefail

CLARITY_VERSION="3.0.0"
CLARITY_JAR="clarity-${CLARITY_VERSION}-all.jar"
DOWNLOAD_URL="https://github.com/skadistats/clarity/releases/download/v${CLARITY_VERSION}/${CLARITY_JAR}"
DEST_DIR="$(dirname "$0")/../parser"

mkdir -p "$DEST_DIR"

if [ -f "$DEST_DIR/clarity.jar" ]; then
    echo "clarity.jar already exists at $DEST_DIR/clarity.jar"
    exit 0
fi

echo "Downloading clarity v${CLARITY_VERSION}..."
curl -fSL "$DOWNLOAD_URL" -o "$DEST_DIR/clarity.jar"
echo "Downloaded to $DEST_DIR/clarity.jar"
