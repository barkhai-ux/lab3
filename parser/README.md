# Dota 2 Replay Parser

This directory holds (optional) replay parsing tooling.

## Current Behavior (Recommended)
If `parser/clarity.jar` is **not** present, the backend will fall back to using
OpenDota’s parsed match endpoint to generate timeline events (item purchases,
ward placements, etc). This is the easiest way to get replay-ish data working
without installing Java locally.

## Local Parsing (Advanced)
Local replay parsing requires a **runnable** `clarity.jar` that accepts a `.dem`
path and prints JSON events to stdout.

Upstream `skadistats/clarity` is primarily a library and does not provide a
drop‑in “fat JAR” CLI that matches this project’s expected JSON format.

If you still want local parsing, you’ll need to build a custom CLI JAR (for
example using `skadistats/clarity-examples` as a starting point) and place it
here as `clarity.jar`.

## Usage

The backend invokes clarity via subprocess. No manual interaction is needed
once the JAR is in place.
