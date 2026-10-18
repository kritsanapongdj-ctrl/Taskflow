import {
  DEFAULT_MAX_CONTEXT_TOKENS,
  SEAT_REST_MAX_SEC,
  SEAT_REST_MIN_SEC,
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
  WANDER_MOVES_BEFORE_REST_MAX,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_PAUSE_MAX_SEC,
  WANDER_PAUSE_MIN_SEC,
} from '../../constants.js';
import { findPath } from '../layout/tileMap.js';
import type { CharacterSprites } from '../sprites/spriteData.js';
import { isReadingToolName } from '../toolUtils.js';
import type {
  Character,
  PlacedFurniture,
  Seat,
  SpriteData,
  TileType as TileTypeVal,
} from '../types.js';
import { CharacterState, Direction, TILE_SIZE } from '../types.js';

/** Whether a tool should show the reading animation (vs typing). Taxonomy comes
 *  from the active HookProvider via the `providerCapabilities` message. */
export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return isReadingToolName(tool);
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (Math.abs(dc) >= Math.abs(dr)) {
    return dc >= 0 ? Direction.RIGHT : Direction.LEFT;
  }
  return dr >= 0 ? Direction.DOWN : Direction.UP;
}

interface BreakActivityTarget {
  col: number;
  row: number;
  dir: Direction;
  label: string;
  partnerId?: number;
}

/**
 * Pick a realistic office break activity away from the computer desk:
 *  - ☕ Grab coffee at the coffee machine / break counter
 *  - 🛋️ Relax at the sofa lounge
 *  - 💬 Walk over to chat with a colleague or consult the Boss (Orchestrator, id=6)
 *  - 📚 Browse the bookshelf / wall board
 */
function pickBreakActivity(
  ch: Character,
  walkableTiles: Array<{ col: number; row: number }>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  furniture: PlacedFurniture[] = [],
  allCharacters?: Map<number, Character>,
): BreakActivityTarget | null {
  if (walkableTiles.length === 0) return null;

  const occupied = new Set<string>();
  if (allCharacters) {
    for (const other of allCharacters.values()) {
      if (other.id !== ch.id) {
        occupied.add(`${other.tileCol},${other.tileRow}`);
      }
    }
  }

  const walkableSet = new Set(walkableTiles.map((t) => `${t.col},${t.row}`));
  const isFreeWalkable = (c: number, r: number) =>
    walkableSet.has(`${c},${r}`) && !occupied.has(`${c},${r}`);

  // Helper: find free walkable tiles adjacent (distance 1-2) to a target tile
  const getAdjacentCandidates = (targetCol: number, targetRow: number): Array<{ col: number; row: number; dir: Direction }> => {
    const offsets = [
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 0, dr: -1 },
      { dc: -1, dr: 1 },
      { dc: 1, dr: 1 },
      { dc: 0, dr: 2 },
    ];
    const results: Array<{ col: number; row: number; dir: Direction }> = [];
    for (const { dc, dr } of offsets) {
      const c = targetCol + dc;
      const r = targetRow + dr;
      if (isFreeWalkable(c, r) && (c !== ch.tileCol || r !== ch.tileRow)) {
        results.push({
          col: c,
          row: r,
          dir: directionBetween(c, r, targetCol, targetRow),
        });
      }
    }
    return results;
  };

  const options: BreakActivityTarget[] = [];

  // 1. ☕ Coffee Station / Pantry Spots
  const coffeeItems = furniture.filter((f) =>
    /COFFEE|COOLER|FRIDGE|VENDING/i.test(f.type),
  );
  for (const item of coffeeItems) {
    const adj = getAdjacentCandidates(item.col, item.row);
    for (const spot of adj) {
      // Weight coffee spots higher
      options.push({ ...spot, label: '☕ เดินไปหยิบกาแฟ' });
      options.push({ ...spot, label: '☕ พักจิบกาแฟ' });
    }
  }

  // 2. 🛋️ Sofa Lounge Spots
  const sofaItems = furniture.filter((f) =>
    /SOFA|COUCH|BENCH|COFFEE_TABLE/i.test(f.type),
  );
  for (const item of sofaItems) {
    const adj = getAdjacentCandidates(item.col, item.row);
    for (const spot of adj) {
      options.push({ ...spot, label: '🛋️ นั่งพักโซฟา Lounge' });
      options.push({ ...spot, label: '🛋️ พักสายตาที่โซฟา' });
    }
  }

  // 3. 💬 Socialize / Chat with Colleague or Boss (Orchestrator id=6)
  if (allCharacters && allCharacters.size > 1) {
    for (const other of allCharacters.values()) {
      if (other.id === ch.id || other.isSubagent) continue;
      const adj = getAdjacentCandidates(other.tileCol, other.tileRow);
      if (adj.length > 0) {
        const spot = adj[Math.floor(Math.random() * adj.length)];
        let chatLabel = '💬 เดินไปคุยกับเพื่อนร่วมทีม';
        if (ch.id === 6) {
          chatLabel = '👑 เดินตรวจงานและคุยกับทีม';
        } else if (other.id === 6) {
          chatLabel = '📋 เดินไปปรึกษา Boss';
        }
        options.push({ ...spot, label: chatLabel, partnerId: other.id });
        options.push({ ...spot, label: chatLabel, partnerId: other.id });
      }
    }
  }

  // 4. 📚 Bookshelf / Wall Art / Plants
  const shelfItems = furniture.filter((f) =>
    /BOOKSHELF|LIBRARY|PAINTING|BOARD|CLOCK/i.test(f.type),
  );
  for (const item of shelfItems) {
    const adj = getAdjacentCandidates(item.col, item.row);
    for (const spot of adj) {
      const isBook = /BOOKSHELF|LIBRARY/i.test(item.type);
      options.push({
        ...spot,
        label: isBook ? '📚 เปิดดูคู่มือที่ชั้นหนังสือ' : '🖼️ เดินพักสายตาในออฟฟิศ',
      });
    }
  }

  // Shuffle options and pick the first one with a valid path
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  for (const candidate of options.slice(0, 12)) {
    const path = findPath(
      ch.tileCol,
      ch.tileRow,
      candidate.col,
      candidate.row,
      tileMap,
      blockedTiles,
    );
    if (path.length > 0) {
      return candidate;
    }
  }

  // Fallback: casual stroll to a random free walkable tile
  const fallbackTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
  if (fallbackTile) {
    return {
      col: fallbackTile.col,
      row: fallbackTile.row,
      dir: Direction.DOWN,
      label: '🚶 เดินยืดเส้นยืดสาย',
    };
  }
  return null;
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1;
  const row = seat ? seat.seatRow : 1;
  const center = tileCenter(col, row);
  // Stagger initial desk rest timer by agent id so agents go on break naturally at different times
  const initialRest = 4 + (id % 6) * 2.5 + Math.random() * 4;
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(1, 3),
    isActive: false,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: initialRest,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    contextTokens: 0,
    maxContextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
    idleActivityLabel: '🪑 ประจำโต๊ะทำงาน',
    idleTargetDir: null,
  };
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  furniture?: PlacedFurniture[],
  allCharacters?: Map<number, Character>,
): void {
  ch.frameTimer += dt;

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.isActive) {
        ch.idleActivityLabel = null;
        ch.idleTargetDir = null;
        if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
          ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
          ch.frame = (ch.frame + 1) % 2;
        }
      } else {
        // Seated calmly at desk (hands still, PC monitor OFF).
        // Once seatTimer expires, get up for an off-screen break activity (coffee, sofa, chat)!
        ch.frame = 0;
        ch.frameTimer = 0;
        if (!ch.idleActivityLabel) {
          ch.idleActivityLabel = '🪑 ประจำโต๊ะทำงาน';
        }
        ch.seatTimer -= dt;
        if (ch.seatTimer <= 0) {
          ch.state = CharacterState.IDLE;
          ch.wanderCount = 0;
          ch.wanderLimit = randomInt(1, 2);
          ch.wanderTimer = randomRange(0.4, 1.2);
        }
      }
      break;
    }

    case CharacterState.IDLE: {
      ch.frame = 0;
      if (ch.seatTimer < 0) ch.seatTimer = 0;

      // If agent became active (real job started!), immediately head back to workstation
      if (ch.isActive) {
        ch.idleActivityLabel = null;
        ch.idleTargetDir = null;
        if (!ch.seatId) {
          ch.state = CharacterState.TYPE;
          ch.frame = 0;
          ch.frameTimer = 0;
          break;
        }
        const seat = seats.get(ch.seatId);
        if (seat) {
          if (ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
            ch.state = CharacterState.TYPE;
            ch.dir = seat.facingDir;
            ch.frame = 0;
            ch.frameTimer = 0;
          } else {
            const path = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CharacterState.WALK;
              ch.frame = 0;
              ch.frameTimer = 0;
            } else {
              ch.state = CharacterState.TYPE;
            }
          }
        }
        break;
      }

      // Agent is idle — count down pause at current break spot (coffee / sofa / chatting)
      ch.wanderTimer -= dt;
      if (ch.wanderTimer <= 0) {
        // Finished break cycle -> walk back to assigned desk for a rest
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId);
          if (seat) {
            if (ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              ch.idleActivityLabel = '🪑 ประจำโต๊ะทำงาน';
              ch.idleTargetDir = null;
              ch.seatTimer = randomRange(12, 24);
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
            const path = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CharacterState.WALK;
              ch.idleActivityLabel = '🪑 เดินกลับโต๊ะทำงาน';
              ch.idleTargetDir = seat.facingDir;
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
        }

        // Pick a smart break activity (coffee, sofa lounge, chat with teammate/Boss, bookshelf)
        const target = pickBreakActivity(
          ch,
          walkableTiles,
          tileMap,
          blockedTiles,
          furniture,
          allCharacters,
        );
        if (target) {
          const path = findPath(
            ch.tileCol,
            ch.tileRow,
            target.col,
            target.row,
            tileMap,
            blockedTiles,
          );
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = CharacterState.WALK;
            ch.idleActivityLabel = target.label;
            ch.idleTargetDir = target.dir;
            ch.frame = 0;
            ch.frameTimer = 0;
            ch.wanderCount++;
            break;
          }
        }
        ch.wanderTimer = randomRange(4.0, 8.0);
      }
      break;
    }

    case CharacterState.WALK: {
      // Walk animation
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 4;
      }

      if (ch.path.length === 0) {
        // Path complete — snap to tile center and transition
        const center = tileCenter(ch.tileCol, ch.tileRow);
        ch.x = center.x;
        ch.y = center.y;

        if (ch.isActive) {
          ch.idleActivityLabel = null;
          ch.idleTargetDir = null;
          if (!ch.seatId) {
            ch.state = CharacterState.TYPE;
          } else {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
            } else {
              ch.state = CharacterState.IDLE;
            }
          }
        } else {
          // Check if arrived back at assigned seat
          if (ch.seatId) {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              ch.idleActivityLabel = '🪑 ประจำโต๊ะทำงาน';
              ch.idleTargetDir = null;
              if (ch.seatTimer < 0) {
                ch.seatTimer = 3;
              } else {
                ch.seatTimer = randomRange(12, 24);
              }
              ch.wanderCount = 0;
              ch.wanderLimit = randomInt(1, 2);
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
          // Arrived at break spot (coffee, sofa, colleague, bookshelf)!
          ch.state = CharacterState.IDLE;
          if (ch.idleTargetDir !== null && ch.idleTargetDir !== undefined) {
            ch.dir = ch.idleTargetDir;
          }
          // Spend 7-13 seconds enjoying the break activity
          ch.wanderTimer = randomRange(7.0, 13.0);
        }
        ch.frame = 0;
        ch.frameTimer = 0;
        break;
      }

      // Move toward next tile in path
      const nextTile = ch.path[0];
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row);

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
      const toCenter = tileCenter(nextTile.col, nextTile.row);
      const t = Math.min(ch.moveProgress, 1);
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      if (ch.moveProgress >= 1) {
        // Arrived at next tile
        ch.tileCol = nextTile.col;
        ch.tileRow = nextTile.row;
        ch.x = toCenter.x;
        ch.y = toCenter.y;
        ch.path.shift();
        ch.moveProgress = 0;
      }

      // If became active while wandering, immediately repath to computer desk
      if (ch.isActive && ch.seatId) {
        ch.idleActivityLabel = null;
        ch.idleTargetDir = null;
        const seat = seats.get(ch.seatId);
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1];
          if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
            const newPath = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (newPath.length > 0) {
              ch.path = newPath;
              ch.moveProgress = 0;
            }
          }
        }
      }
      break;
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (!ch.isActive) {
        return sprites.typing[ch.dir][0];
      }
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2];
      }
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4];
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1];
    default:
      return sprites.walk[ch.dir][1];
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
