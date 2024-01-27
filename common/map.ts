import { TileType } from "./events/game-list";
import { DiagonalMovement } from "./pf/core/DiagonalMovement";
import { Grid } from "./pf/core/Grid";
import { AStarFinder } from "./pf/finders/AStarFinder";
import { Unit, UnitType, isMoveableUnit } from "./unit";

export const TILE_SIZE = 16;

const Blocked = 2;
const Road = 0;
const Walkable = 0;
type MatrixRow = (typeof Walkable | typeof Blocked | typeof Road)[];
type Matrix = MatrixRow[];

export function getPathFinder(unit: Unit, tiles?: TileType[][], units?: Unit[], currentPlayer?: string, blockEnemyUnits = true) {
    if (!tiles?.[0] || !units) {
        throw new Error('Game not loaded');
    }

    let grid: any = new Grid(tiles[0].length, tiles.length);
    if (unit.type === UnitType.JET || unit.type === UnitType.HELICOPTER) {
        for (const y in tiles) {
            for (const x in tiles[y]) {
                grid.setWalkableAt(x, y, true);
                grid.setCostAt(x, y, 1);
            }
        }
    } else if (unit.type === UnitType.SHIP || unit.type === UnitType.LANDER) {
        for (const y in tiles) {
            for (const x in tiles[y]) {
                const tile = tiles[y][x];
                grid.setWalkableAt(x, y, tile === TileType.WATER);
                grid.setCostAt(x, y, 1);
            }
        }
    } else if (unit.type === UnitType.TANK || unit.type === UnitType.ROCKET_TRUCK || unit.type === UnitType.APC) {
        for (const y in tiles) {
            for (const x in tiles[y]) {
                const tile = tiles[y][x];
                switch (tile) {
                    case TileType.WATER:
                    case TileType.RIVER:
                    case TileType.MOUNTAIN:
                        grid.setWalkableAt(x, y, false);
                        grid.setCostAt(x, y, 1);
                        break;
                    case TileType.ROAD:
                        grid.setWalkableAt(x, y, true);
                        grid.setCostAt(x, y, 0.5);
                        break;
                    default:
                        grid.setWalkableAt(x, y, true);
                        grid.setCostAt(x, y, 1);
                        break;
                }
            }
        }
    } else {
        for (const y in tiles) {
            for (const x in tiles[y]) {
                const tile = tiles[y][x];
                switch (tile) {
                    case TileType.WATER:
                        grid.setWalkableAt(x, y, false);
                        grid.setCostAt(x, y, 1);
                        break;
                    case TileType.ROAD:
                        grid.setWalkableAt(x, y, true);
                        grid.setCostAt(x, y, 0.5);
                        break;
                    default:
                        grid.setWalkableAt(x, y, true);
                        grid.setCostAt(x, y, 1);
                        break;
                }
            }
        }
    }

    if (blockEnemyUnits) {
        for (const u of units) {
            if (isMoveableUnit(u) && u.player !== currentPlayer) {
                grid.setWalkableAt(u.x, u.y, false);
            }
        }
    }
    const finder = new AStarFinder({
        diagonalMovement: DiagonalMovement.Never,
        optimal: true,
        useCost: true
    });
    return { finder, grid };
}