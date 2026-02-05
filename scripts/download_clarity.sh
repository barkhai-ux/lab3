#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="$(dirname "$0")/../parser"

mkdir -p "$DEST_DIR"

cat <<'MSG'
This project no longer supports downloading a prebuilt runnable `clarity.jar`
via this script.

Upstream `skadistats/clarity` is primarily a Java library and does not publish
a drop-in "fat JAR" CLI that matches this project's expected JSON output.

Recommended: run without `parser/clarity.jar` and let the backend fall back to
OpenDota's parsed match endpoint.

Advanced: build your own runnable CLI jar and place it at `parser/clarity.jar`.
See `parser/README.md` for details.
MSG

exit 1
