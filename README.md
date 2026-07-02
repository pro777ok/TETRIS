# TETRIX ONLINE - Multiplayer Tetris

## Setup

1. Install Node.js (v16+)
2. Install dependencies:
   ```
   npm install
   ```
3. Start server:
   ```
   npm start
   ```
4. Open browser: http://localhost:3000

## Gameplay

### Controls
| Key | Action |
|-----|--------|
| ← → | Move piece |
| ↑ or X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| ↓ | Soft drop |
| Space | Hard drop |
| Shift / C | Hold piece |

### Room Modes (host panel)
| Setting | Description |
|---------|-------------|
| **Slow Mode** | 1 garbage line rises per non-combo lock. Combos still shield garbage. |
| **4-Wide Mode** | 4-column board, 26 visible rows when combined with Slow Mode. |
| **Puyotet Mode** | Hybrid mode — garbage converts to ojama for Puyo Puyo side. |
| **Cheese Mode** | Race to clear 40 preset garbage lines. |
| **40-Line Mode** | Race to clear 40 lines. |
| **Bomb Mode** | Cleared cells may trigger bomb chain reactions. |

### Attack Table
| Clear | Base Attack |
|-------|-------------|
| Single | 0 |
| Double | 1 |
| Triple | 2 |
| Tetris | 3 |
| T-Spin Mini (1 line) | 0 |
| T-Spin Mini (2 lines) | 1 |
| T-Spin Single | 2 |
| T-Spin Double | 3 |
| T-Spin Triple | 5 |
| Penta | 6 |

### Modifiers
- **B2B**: +1 fixed (no scaling). Activates when consecutive Tetris/T-Spin clears.
- **B2B Break**: Sends `b2bCount` lines with a single hole that cycles through 3 columns every `floor(b2bCount / 3)` lines. Triggers at b2bCount ≥ 4.
- **Combo (REN)**: Non-quad/TSD clears get `floor((ren + 2) / 4)` bonus (uncapped). Quad/TSD instead adds `ren` directly.
- **Perfect Clear**: +5, or fixed 10 in Puyotet mode.

### Scoring
```
base × B2B_mult × level + 50 × combo × level
```
Base values: Single=100, Double=300, Triple=500, Tetris=800. T-Spin has separate table.

### Graphics Settings (saved in cookies)
- **Ghost opacity**: 0-100%
- **Quality**: Low / Medium / High / Ultra (immersive)
- **Particles**: Off / Low / High
- **Board shake**: On/Off
- **SFX Volume**: 0-100%
- **Spin tilt effect**: On/Off

## Bot AI

The built-in bot (`server/server.js`) uses BFS placement search with recursive lookahead. Behaviors:

- **Survival mode**: When the bot predicts the next piece cannot spawn after this placement, it forces a line-clear placement to extend the combo (deferring garbage).
- **Spin seeking**: Actively creates T-spin setups. Boards with T-spin slots (two tall columns flanking a low gap) receive evaluation bonuses. A T-piece placement that lands a T-spin gets +55000 score bonus.
- **Warp placement**: Pieces teleport instantly to their target position (no step-by-step animation).
- **Spin detection**: Tracks SRS wall kicks (`wasKicked`) through BFS for correct non-T spin detection (S/Z/L/J spins).
- **Custom bot code**: Users can write custom `decide(state)` JavaScript. The function receives board, queue, hold, and returns `{x, rotation, useHold}`.

## Tech Stack
- **Frontend**: PixiJS 7, Socket.io client
- **Backend**: Node.js, Express, Socket.io
- **Fonts**: Orbitron, Share Tech Mono (Google Fonts)
- **Audio**: Web Audio API (procedural SFX)

## Bot Custom Code API

In the host panel, enter JavaScript code. The bot calls `decide(state)` each move.

**Coordinate system**: Row 0 = top of hidden zone, row 6 = last hidden row, row 7 = top of visible area, row 26 = bottom. Column 0 = leftmost. `state.currentPiece.x/y/rotation` is the spawn position — the bounding-box top-left corner, with the same cell-offset convention as SRS (see `PIECE_SHAPES` in the server).

```js
function decide(state) {
  // ── Board & dimensions ──────────────────────────────────────
  // state.board:       2D array (27 rows × cols), 0=empty, string=block
  // state.cols:        number of columns (4 in 4-wide mode, 10 otherwise)
  // state.rows:        20 (visible rows; board has 7 extra hidden rows above)
  // state.isFourWide:  boolean

  // ── Current piece ────────────────────────────────────────────
  // state.currentPiece:  { type:'T', rotation:0, x:3, y:5 }
  //   type:    'I'|'O'|'T'|'S'|'Z'|'J'|'L'
  //   x:       bounding-box left column (spawn = floor((cols-4)/2))
  //   y:       bounding-box top row    (spawn = HIDDEN-2 = 5)
  //   rotation: 0|1|2|3 (0=spawn, CW)

  // ── Queue & hold ─────────────────────────────────────────────
  // state.nextQueue:   [{type:'T'}, {type:'S'}, ...]  (5 future pieces)
  // state.holdPiece:   { type:'I' } | null
  // state.bagRemaining: ['S','Z','J']  (pieces left in current 7-bag)

  // ── Game state ───────────────────────────────────────────────
  // state.combo:  number (consecutive clears, -1 = no clear yet)
  // state.ren:    number (REN counter, same as combo)
  // state.b2b:    boolean
  // state.lines:  number (total lines cleared)
  // state.score:  number
  // state.level:  number
  // state.garbageQueue: [{ lines, holeCol, ... }] (incoming garbage)

  // ── Opponents ────────────────────────────────────────────────
  // state.opponents: [{ name, board, score, lines, level, alive, combo, b2b, isBot }]

  // ── Helper functions (use server engine directly) ────────────
  // state.helpers.getSpawnState(type)  → { x, y, rotation }
  //   Returns the spawn position for a given piece type.
  //
  // state.helpers.canPlace(type, x, y, rotation)  → boolean
  //   True if the piece can exist at (x, y, rotation) without overlap.
  //
  // state.helpers.hardDropY(type, x, rotation)  → number
  //   Y coordinate where the piece lands if hard-dropped at (x, rotation).
  //
  // state.helpers.simulateDrop(type, x, rotation)  → { x, y, rotation, wasKicked, spin }
  //   Full drop simulation. Returns the landing position with server
  //   spin detection result (spin = 'TSPIN'|'TSPIN_MINI'|'ISPIN'|'SSPIN'|...|null).
  //   Uses the server's own BFS + SRS kick tables, so it perfectly matches gameplay.

  // ── Return value ─────────────────────────────────────────────
  return {
    x: 3,        // target column (bounding-box left)
    rotation: 0, // target rotation 0-3
    useHold: false
  };
}
```
