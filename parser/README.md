# Dota 2 Replay Parser

This directory holds the clarity JAR used for parsing Dota 2 replay files.

## Setup

Run the download script:

```bash
bash scripts/download_clarity.sh
```

This downloads the clarity fat JAR from
[skadistats/clarity](https://github.com/skadistats/clarity) and places it
here as `clarity.jar`.

## Usage

The backend invokes clarity via subprocess. No manual interaction is needed
once the JAR is in place.
