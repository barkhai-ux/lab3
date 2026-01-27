"""
Subprocess wrapper for the clarity Dota 2 replay parser.

clarity (https://github.com/skadistats/clarity) is a Java library for parsing
Dota 2 replay files (.dem). We invoke it as a fat JAR via subprocess and
capture its JSON output.

Assumption: The clarity JAR has been pre-built or downloaded with a main class
that accepts a replay file path and outputs JSON to stdout. In practice, you
would use a custom Java main class or the clarity-examples project compiled
into a fat JAR. The expected output format is a JSON array of game events.
"""

import json
import logging
import subprocess
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

TICK_RATE = 30  # Dota 2 uses 30 ticks per second


class ClarityParseError(Exception):
    """Raised when clarity fails to parse a replay."""


def parse_replay(replay_path: str) -> list[dict]:
    """
    Parse a Dota 2 replay file using clarity.

    Args:
        replay_path: Path to the .dem replay file.

    Returns:
        List of parsed event dicts.

    Raises:
        ClarityParseError: If the parsing process fails.
    """
    jar_path = Path(settings.clarity_jar_path)
    replay = Path(replay_path)

    if not jar_path.exists():
        raise ClarityParseError(f"clarity JAR not found at {jar_path}")
    if not replay.exists():
        raise ClarityParseError(f"Replay file not found at {replay}")

    cmd = [
        "java",
        "-jar",
        str(jar_path),
        str(replay),
    ]

    logger.info("Running clarity: %s", " ".join(cmd))

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout for large replays
        )
    except subprocess.TimeoutExpired:
        raise ClarityParseError(f"clarity timed out parsing {replay}")
    except OSError as e:
        raise ClarityParseError(f"Failed to run clarity: {e}")

    if result.returncode != 0:
        stderr_snippet = result.stderr[:500] if result.stderr else "(no stderr)"
        raise ClarityParseError(
            f"clarity exited with code {result.returncode}: {stderr_snippet}"
        )

    stdout = result.stdout.strip()
    if not stdout:
        raise ClarityParseError("clarity produced no output")

    try:
        events = json.loads(stdout)
    except json.JSONDecodeError as e:
        raise ClarityParseError(f"clarity output is not valid JSON: {e}")

    if not isinstance(events, list):
        # Try wrapping a single object
        events = [events]

    logger.info("Parsed %d raw events from %s", len(events), replay.name)
    return events


def tick_to_game_time(tick: int) -> float:
    """Convert a game tick to seconds. Dota 2 uses 30 ticks/second."""
    return tick / TICK_RATE
