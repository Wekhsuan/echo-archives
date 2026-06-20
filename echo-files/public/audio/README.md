# ECHO FILES — Audio Assets

Place the following audio files in this directory for the game's audio system.

## BGM (Background Music) — Looping

| File | Format | Usage |
|------|--------|-------|
| `bgm_menu.mp3` | MP3, loopable | Start page / Archive hub ambient. Dark cyber drone, low tension. Suggested: 60-90s loop, ~85 BPM. |
| `bgm_game.mp3` | MP3, loopable | MemoryPage gameplay BGM. Tension-building, slightly unsettling. Suggested: 90-120s loop, gradual intensity rise. |

**Technical notes:**
- Both tracks fade-in over **1 second** on play
- Both tracks fade-out over **1 second** on stop (for EndingPage dead silence)
- Default volume: **35%** of master
- Recommended: use `.ogg` fallback alongside `.mp3` for browser compatibility

## SFX (Sound Effects) — One-shot

| File | Format | Trigger | Description |
|------|--------|---------|-------------|
| `sfx_click.mp3` | MP3 | UI button clicks, word reveals | Short, crisp UI click/tap. ~100-200ms. Clean digital sound. |
| `sfx_error.mp3` | MP3 | Wrong credential, system alert | Low buzz / error tone. ~300-500ms. Unsettling but not jarring. |
| `sfx_backlash.mp3` | MP3 | System backlash restore trigger | Sharp glitch/static burst. ~400-800ms. Overlapping OK. High-frequency crackle. |
| `sfx_reboot.mp3` | MP4 | Stage transition, success chime, reboot | Deep resonant chime or power-up hum. ~500-800ms. Satisfying resolution sound. |

**Technical notes:**
- All SFX are **one-shot** — new Howl instance per call (allows overlapping)
- Default volume: **60%** of master
- Auto-unload after playback completes (no memory leak)
- `backlash` specifically designed for **rapid overlapping playback**

## Audio Design Direction

```
Menu:   ████████░░░  Tense but calm    → bgm_menu (dark drone)
Game:   █████████░  Building dread     → bgm_game (rising tension)
Backlash: ⚡⚡⚡      Glitch burst       → sfx_backlash (static crackle)
Ending: ░░░░░░░░░░  Absolute silence   → stopBGM() fade-out → dead air
```

## Quick Test (placeholder)

If you don't have audio files yet, the game will gracefully degrade:
- Console will show `[AudioManager] BGM/SFX load error` warnings (dev mode only)
- All gameplay logic continues without audio
- No crashes or blocking behavior
