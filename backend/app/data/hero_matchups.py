"""
Hero synergy and counter data for draft analysis.

Synergy scores: 0.0 (no synergy) to 1.0 (perfect combo)
Counter scores: 0.0 (not a counter) to 1.0 (hard counter)

Hero IDs reference: https://api.opendota.com/api/heroes
"""

# Hero ID constants for readability
ANTI_MAGE = 1
AXE = 2
BANE = 3
BLOODSEEKER = 4
CRYSTAL_MAIDEN = 5
DROW_RANGER = 6
EARTHSHAKER = 7
JUGGERNAUT = 8
MIRANA = 9
MORPHLING = 10
PHANTOM_LANCER = 12
PUCK = 13
PUDGE = 14
RAZOR = 15
SAND_KING = 16
STORM_SPIRIT = 17
SVEN = 18
TINY = 19
VENGEFUL_SPIRIT = 20
WINDRANGER = 21
ZEUS = 22
KUNKKA = 23
LINA = 25
LION = 26
SHADOW_SHAMAN = 27
SLARDAR = 28
TIDEHUNTER = 29
WITCH_DOCTOR = 30
LICH = 31
RIKI = 32
ENIGMA = 33
TINKER = 34
SNIPER = 35
NECROPHOS = 36
WARLOCK = 37
BEASTMASTER = 38
FACELESS_VOID = 41
WRAITH_KING = 42
DEATH_PROPHET = 43
PHANTOM_ASSASSIN = 44
PUGNA = 45
TEMPLAR_ASSASSIN = 46
VIPER = 47
LUNA = 48
DRAGON_KNIGHT = 49
DAZZLE = 50
CLOCKWERK = 51
LESHRAC = 52
FURION = 53
LIFESTEALER = 54
DARK_SEER = 55
CLINKZ = 56
OMNIKNIGHT = 57
ENCHANTRESS = 58
HUSKAR = 59
NIGHT_STALKER = 60
BROODMOTHER = 61
BOUNTY_HUNTER = 62
WEAVER = 63
JAKIRO = 64
BATRIDER = 65
CHEN = 66
SPECTRE = 67
ANCIENT_APPARITION = 68
DOOM = 69
URSA = 70
SPIRIT_BREAKER = 71
GYROCOPTER = 72
ALCHEMIST = 73
INVOKER = 74
SILENCER = 75
OUTWORLD_DESTROYER = 76
LYCAN = 77
BREWMASTER = 78
SHADOW_DEMON = 79
LONE_DRUID = 80
CHAOS_KNIGHT = 81
MEEPO = 82
TREANT_PROTECTOR = 83
OGRE_MAGI = 84
UNDYING = 85
RUBICK = 86
DISRUPTOR = 87
NYX_ASSASSIN = 88
NAGA_SIREN = 89
KEEPER_OF_THE_LIGHT = 90
IO = 91
VISAGE = 92
SLARK = 93
MEDUSA = 94
TROLL_WARLORD = 95
CENTAUR_WARRUNNER = 96
MAGNUS = 97
TIMBERSAW = 98
BRISTLEBACK = 99
TUSK = 100
SKYWRATH_MAGE = 101
ABADDON = 102
ELDER_TITAN = 103
LEGION_COMMANDER = 104
TECHIES = 105
EMBER_SPIRIT = 106
EARTH_SPIRIT = 107
UNDERLORD = 108
TERRORBLADE = 109
PHOENIX = 110
ORACLE = 111
WINTER_WYVERN = 112
ARC_WARDEN = 113
MONKEY_KING = 114
DARK_WILLOW = 119
PANGOLIER = 120
GRIMSTROKE = 121
HOODWINK = 123
VOID_SPIRIT = 126
SNAPFIRE = 128
MARS = 129
DAWNBREAKER = 135
MARCI = 136
PRIMAL_BEAST = 137
MUERTA = 138
RINGMASTER = 145


# Strong synergy combinations: (hero_id_1, hero_id_2) -> score
# Order-independent - will check both directions
HERO_SYNERGIES: dict[tuple[int, int], float] = {
    # Io combos - Tether enables aggressive plays
    (IO, TINY): 0.95,            # Io + Tiny - iconic combo
    (IO, GYROCOPTER): 0.85,      # Io + Gyro - global presence
    (IO, CHAOS_KNIGHT): 0.85,    # Io + CK - strength hero synergy
    (IO, CENTAUR_WARRUNNER): 0.80,  # Io + Centaur
    (IO, SVEN): 0.80,            # Io + Sven
    (IO, URSA): 0.80,            # Io + Ursa
    (IO, WRAITH_KING): 0.75,     # Io + WK

    # Magnus combos - Empower + RP
    (MAGNUS, JUGGERNAUT): 0.90,  # Magnus + Jug - spin in RP
    (MAGNUS, SVEN): 0.90,        # Magnus + Sven - cleave synergy
    (MAGNUS, PHANTOM_ASSASSIN): 0.85,  # Magnus + PA
    (MAGNUS, CHAOS_KNIGHT): 0.90,  # Magnus + CK - illusion cleave
    (MAGNUS, TROLL_WARLORD): 0.80,  # Magnus + Troll
    (MAGNUS, TERRORBLADE): 0.85,   # Magnus + TB - illusion cleave

    # Faceless Void combos - Chrono setups
    (FACELESS_VOID, INVOKER): 0.90,   # Void + Invoker - Sunstrike/Meteor
    (FACELESS_VOID, LESHRAC): 0.85,   # Void + Lesh - AoE in Chrono
    (FACELESS_VOID, DEATH_PROPHET): 0.85,  # Void + DP
    (FACELESS_VOID, WITCH_DOCTOR): 0.85,   # Void + WD - full Death Ward
    (FACELESS_VOID, SKYWRATH_MAGE): 0.90,  # Void + Sky - Mystic Flare
    (FACELESS_VOID, JAKIRO): 0.80,    # Void + Jakiro

    # Dark Seer combos - Vacuum + Wall
    (DARK_SEER, SVEN): 0.85,          # DS + Sven
    (DARK_SEER, LESHRAC): 0.80,       # DS + Lesh
    (DARK_SEER, FACELESS_VOID): 0.85, # DS + Void
    (DARK_SEER, ENIGMA): 0.85,        # DS + Enigma

    # Enigma combos - Black Hole
    (ENIGMA, INVOKER): 0.85,          # Enigma + Invoker
    (ENIGMA, LESHRAC): 0.80,          # Enigma + Lesh
    (ENIGMA, WITCH_DOCTOR): 0.80,     # Enigma + WD

    # Setup combos
    (SHADOW_DEMON, MIRANA): 0.85,     # SD + Mirana - arrow setup
    (BANE, MIRANA): 0.90,             # Bane + Mirana - guaranteed arrow
    (SHADOW_DEMON, KUNKKA): 0.85,     # SD + Kunkka - boat setup

    # Oracle combos
    (ORACLE, HUSKAR): 0.90,           # Oracle + Huskar
    (ORACLE, PHANTOM_ASSASSIN): 0.80, # Oracle + PA

    # Drow Ranger aura
    (DROW_RANGER, LUNA): 0.75,        # Drow + Luna - ranged agility
    (DROW_RANGER, MEDUSA): 0.75,      # Drow + Medusa
    (DROW_RANGER, VENGEFUL_SPIRIT): 0.70,  # Drow + VS

    # Grimstroke combos
    (GRIMSTROKE, LION): 0.85,         # Grim + Lion - double Finger
    (GRIMSTROKE, LINA): 0.85,         # Grim + Lina - double Laguna
    (GRIMSTROKE, DOOM): 0.85,         # Grim + Doom - double Doom

    # Chen/Enchantress push
    (CHEN, NATURE_FURION := FURION): 0.75,  # Chen + NP - push strat
    (CHEN, LYCAN): 0.75,              # Chen + Lycan

    # Lifestealer combos - Infest bombs
    (LIFESTEALER, SPIRIT_BREAKER): 0.85,  # LS + SB - charge bomb
    (LIFESTEALER, STORM_SPIRIT): 0.80,    # LS + Storm
    (LIFESTEALER, PHOENIX): 0.80,         # LS + Phoenix

    # Bristleback + sustain
    (BRISTLEBACK, IO): 0.80,          # BB + Io
    (BRISTLEBACK, DAZZLE): 0.75,      # BB + Dazzle - armor

    # Spectre combos
    (SPECTRE, ZEUS): 0.80,            # Spectre + Zeus - global
    (SPECTRE, ANCIENT_APPARITION): 0.75,  # Spectre + AA

    # Tinker combos
    (TINKER, NAGA_SIREN): 0.75,       # Tinker + Naga - control
    (TINKER, KEEPER_OF_THE_LIGHT): 0.70,  # Tinker + Kotl
}


# Counter matchups: (hero_being_countered, counter_hero) -> effectiveness
HERO_COUNTERS: dict[tuple[int, int], float] = {
    # Anti-Mage counters
    (ANTI_MAGE, FACELESS_VOID): 0.75,     # Chrono locks AM
    (ANTI_MAGE, PHANTOM_LANCER): 0.70,    # Hard to find real one
    (ANTI_MAGE, AXE): 0.70,               # Call through Blink
    (ANTI_MAGE, BLOODSEEKER): 0.75,       # Rupture prevents Blink

    # Illusion hero counters
    (PHANTOM_LANCER, EARTHSHAKER): 0.90,  # Echo Slam
    (PHANTOM_LANCER, LESHRAC): 0.85,      # AoE damage
    (PHANTOM_LANCER, SVEN): 0.80,         # Cleave
    (PHANTOM_LANCER, EMBER_SPIRIT): 0.80, # Sleight + Flame Guard
    (CHAOS_KNIGHT, EARTHSHAKER): 0.85,    # Echo Slam
    (CHAOS_KNIGHT, LESHRAC): 0.80,        # AoE damage
    (TERRORBLADE, EARTHSHAKER): 0.80,     # Echo Slam
    (NAGA_SIREN, EARTHSHAKER): 0.85,      # Echo Slam

    # Meepo counters
    (MEEPO, EARTHSHAKER): 0.95,           # Hard counter
    (MEEPO, WINTER_WYVERN): 0.90,         # Curse
    (MEEPO, SVEN): 0.85,                  # Cleave
    (MEEPO, EMBER_SPIRIT): 0.85,          # Sleight of Fist
    (MEEPO, LESHRAC): 0.80,               # AoE damage

    # Broodmother counters
    (BROODMOTHER, EARTHSHAKER): 0.90,     # Echo on spiders
    (BROODMOTHER, LESHRAC): 0.85,         # AoE damage
    (BROODMOTHER, LEGION_COMMANDER): 0.80, # Overwhelming Odds
    (BROODMOTHER, AXE): 0.80,             # Counter Helix
    (BROODMOTHER, TIMBERSAW): 0.80,       # Whirling Death

    # Huskar counters
    (HUSKAR, ANCIENT_APPARITION): 0.95,   # Ice Blast prevents heal
    (HUSKAR, AXE): 0.80,                  # Culling Blade threshold
    (HUSKAR, NECROPHOS): 0.80,            # Reaper's Scythe
    (HUSKAR, VIPER): 0.75,                # Break

    # Medusa counters
    (MEDUSA, ANTI_MAGE): 0.85,            # Mana Break
    (MEDUSA, PHANTOM_LANCER): 0.80,       # Mana burn
    (MEDUSA, INVOKER): 0.75,              # EMP
    (MEDUSA, NYX_ASSASSIN): 0.75,         # Mana Burn

    # Tinker counters
    (TINKER, SPIRIT_BREAKER): 0.85,       # Charge global
    (TINKER, CLOCKWERK): 0.85,            # Hookshot
    (TINKER, NYX_ASSASSIN): 0.85,         # Vendetta
    (TINKER, ZEUS): 0.75,                 # Reveal

    # Storm Spirit counters
    (STORM_SPIRIT, ANTI_MAGE): 0.80,      # Mana Break
    (STORM_SPIRIT, DOOM): 0.85,           # Silence
    (STORM_SPIRIT, SILENCER): 0.85,       # Global Silence
    (STORM_SPIRIT, BLOODSEEKER): 0.80,    # Rupture

    # Slark counters
    (SLARK, BLOODSEEKER): 0.80,           # Thirst reveals
    (SLARK, ANCIENT_APPARITION): 0.80,    # Prevents heal in ult
    (SLARK, DOOM): 0.80,                  # Doom removes ult
    (SLARK, AXE): 0.75,                   # Call locks

    # Invisible hero counters
    (RIKI, BOUNTY_HUNTER): 0.75,          # Track
    (RIKI, SLARDAR): 0.80,                # Amplify Damage
    (RIKI, ZEUS): 0.75,                   # Lightning Bolt reveal
    (CLINKZ, BOUNTY_HUNTER): 0.75,        # Track
    (CLINKZ, SLARDAR): 0.75,              # Amplify Damage

    # Wraith King counters
    (WRAITH_KING, ANTI_MAGE): 0.80,       # Mana Break
    (WRAITH_KING, PHANTOM_LANCER): 0.80,  # Mana burn
    (WRAITH_KING, INVOKER): 0.75,         # EMP

    # Lycan counters
    (LYCAN, BEASTMASTER): 0.75,           # Roar pierces BKB
    (LYCAN, FACELESS_VOID): 0.80,         # Chrono
    (LYCAN, BLOODSEEKER): 0.75,           # Rupture

    # Invoker counters
    (INVOKER, NYX_ASSASSIN): 0.80,        # Mana Burn
    (INVOKER, ANTI_MAGE): 0.75,           # Mana Break
    (INVOKER, SPIRIT_BREAKER): 0.75,      # Charge

    # Sniper counters
    (SNIPER, SPIRIT_BREAKER): 0.85,       # Charge
    (SNIPER, CLOCKWERK): 0.85,            # Hookshot
    (SNIPER, STORM_SPIRIT): 0.80,         # Gap close
    (SNIPER, PHANTOM_ASSASSIN): 0.80,     # Blink Strike

    # Chen/Enchantress counters
    (CHEN, AXE): 0.75,                    # Kills creeps
    (CHEN, SAND_KING): 0.75,              # Caustic Finale
    (ENCHANTRESS, DOOM): 0.75,            # Doom removes passive

    # Ember Spirit counters
    (EMBER_SPIRIT, DOOM): 0.85,           # Doom
    (EMBER_SPIRIT, SILENCER): 0.80,       # Silence
    (EMBER_SPIRIT, ORCHID_HEROES := CLINKZ): 0.70,  # Orchid carriers
}


def get_synergy_score(hero1_id: int, hero2_id: int) -> float:
    """Get synergy score for a hero pair, order-independent."""
    key1 = (hero1_id, hero2_id)
    key2 = (hero2_id, hero1_id)
    return HERO_SYNERGIES.get(key1) or HERO_SYNERGIES.get(key2) or 0.0


def get_counter_score(hero_id: int, counter_id: int) -> float:
    """Get how effectively counter_id counters hero_id."""
    return HERO_COUNTERS.get((hero_id, counter_id), 0.0)


def get_hero_synergies(hero_ids: list[int]) -> list[tuple[int, int, float]]:
    """
    Get all synergies for a list of heroes on the same team.
    Returns list of (hero1, hero2, score) tuples with score > 0.
    """
    synergies = []
    for i, h1 in enumerate(hero_ids):
        for h2 in hero_ids[i + 1:]:
            score = get_synergy_score(h1, h2)
            if score > 0:
                synergies.append((h1, h2, score))
    return sorted(synergies, key=lambda x: x[2], reverse=True)


def get_team_counters(
    team_heroes: list[int],
    enemy_heroes: list[int]
) -> tuple[list[tuple[int, int, float]], list[tuple[int, int, float]]]:
    """
    Analyze counter relationships between two teams.

    Returns:
        (team_counters, enemy_counters) where each is a list of
        (countered_hero, counter_hero, score) tuples.

        team_counters = heroes on enemy_team that get countered by team_heroes
        enemy_counters = heroes on team that get countered by enemy_heroes
    """
    # What we counter on enemy team
    team_counters = []
    for enemy in enemy_heroes:
        for ally in team_heroes:
            score = get_counter_score(enemy, ally)
            if score > 0:
                team_counters.append((enemy, ally, score))

    # What enemy counters on our team
    enemy_counters = []
    for ally in team_heroes:
        for enemy in enemy_heroes:
            score = get_counter_score(ally, enemy)
            if score > 0:
                enemy_counters.append((ally, enemy, score))

    return (
        sorted(team_counters, key=lambda x: x[2], reverse=True),
        sorted(enemy_counters, key=lambda x: x[2], reverse=True)
    )


# Hero names for display (partial list, extend as needed)
HERO_NAMES: dict[int, str] = {
    1: "Anti-Mage", 2: "Axe", 3: "Bane", 4: "Bloodseeker",
    5: "Crystal Maiden", 6: "Drow Ranger", 7: "Earthshaker",
    8: "Juggernaut", 9: "Mirana", 10: "Morphling", 12: "Phantom Lancer",
    13: "Puck", 14: "Pudge", 15: "Razor", 16: "Sand King",
    17: "Storm Spirit", 18: "Sven", 19: "Tiny", 20: "Vengeful Spirit",
    21: "Windranger", 22: "Zeus", 23: "Kunkka", 25: "Lina",
    26: "Lion", 27: "Shadow Shaman", 28: "Slardar", 29: "Tidehunter",
    30: "Witch Doctor", 31: "Lich", 32: "Riki", 33: "Enigma",
    34: "Tinker", 35: "Sniper", 36: "Necrophos", 37: "Warlock",
    41: "Faceless Void", 42: "Wraith King", 43: "Death Prophet",
    44: "Phantom Assassin", 45: "Pugna", 46: "Templar Assassin",
    47: "Viper", 48: "Luna", 49: "Dragon Knight", 50: "Dazzle",
    51: "Clockwerk", 52: "Leshrac", 53: "Nature's Prophet", 54: "Lifestealer",
    55: "Dark Seer", 56: "Clinkz", 57: "Omniknight", 58: "Enchantress",
    59: "Huskar", 60: "Night Stalker", 61: "Broodmother", 62: "Bounty Hunter",
    63: "Weaver", 64: "Jakiro", 65: "Batrider", 66: "Chen",
    67: "Spectre", 68: "Ancient Apparition", 69: "Doom", 70: "Ursa",
    71: "Spirit Breaker", 72: "Gyrocopter", 73: "Alchemist", 74: "Invoker",
    75: "Silencer", 76: "Outworld Destroyer", 77: "Lycan", 78: "Brewmaster",
    79: "Shadow Demon", 80: "Lone Druid", 81: "Chaos Knight", 82: "Meepo",
    83: "Treant Protector", 84: "Ogre Magi", 85: "Undying", 86: "Rubick",
    87: "Disruptor", 88: "Nyx Assassin", 89: "Naga Siren", 90: "Keeper of the Light",
    91: "Io", 92: "Visage", 93: "Slark", 94: "Medusa",
    95: "Troll Warlord", 96: "Centaur Warrunner", 97: "Magnus", 98: "Timbersaw",
    99: "Bristleback", 100: "Tusk", 101: "Skywrath Mage", 102: "Abaddon",
    103: "Elder Titan", 104: "Legion Commander", 105: "Techies", 106: "Ember Spirit",
    107: "Earth Spirit", 108: "Underlord", 109: "Terrorblade", 110: "Phoenix",
    111: "Oracle", 112: "Winter Wyvern", 113: "Arc Warden", 114: "Monkey King",
    119: "Dark Willow", 120: "Pangolier", 121: "Grimstroke", 123: "Hoodwink",
    126: "Void Spirit", 128: "Snapfire", 129: "Mars", 135: "Dawnbreaker",
    136: "Marci", 137: "Primal Beast", 138: "Muerta",
}


def get_hero_name(hero_id: int) -> str:
    """Get hero name by ID, returns 'Unknown Hero' if not found."""
    return HERO_NAMES.get(hero_id, f"Hero {hero_id}")
