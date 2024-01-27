import { TileType } from "./events/game-list";
import { Unit, UnitType, isMoveableUnit } from "./unit";
import * as PF from 'pathfinding';

export const TILE_SIZE = 16;

const Blocked = 1;
const Walkable = 0;
type MatrixRow = (typeof Walkable | typeof Blocked)[];
type Matrix = MatrixRow[];

export function getPathFinder(unit: Unit, tiles?: TileType[][], units?: Unit[], currentPlayer?: string, blockEnemyUnits = true) {
    if (!tiles?.[0] || !units) {
        throw new Error('Game not loaded');
    }

    let grid: PF.Grid;
    if (unit.type === UnitType.JET || unit.type === UnitType.HELICOPTER) {
        const matrix: Matrix = [];
        for (const row of tiles) {
            const matrixRow: MatrixRow = [];
            for (const tile of row) {
                matrixRow.push(Walkable);
            }
            matrix.push(matrixRow);
        }
        grid = new PF.Grid(matrix);
    } else if (unit.type === UnitType.SHIP || unit.type === UnitType.LANDER) {
        const matrix: Matrix = [];
        for (const row of tiles) {
            const matrixRow: MatrixRow = [];
            for (const tile of row) {
                matrixRow.push(tile === TileType.WATER ? Walkable : Blocked);
            }
            matrix.push(matrixRow);
        }
        grid = new PF.Grid(matrix);
    } else if (unit.type === UnitType.TANK || unit.type === UnitType.ROCKET_TRUCK || unit.type === UnitType.APC) {
        const matrix: Matrix = [];
        for (const row of tiles) {
            const matrixRow: MatrixRow = [];
            for (const tile of row) {
                switch (tile) {
                    case TileType.WATER:
                    case TileType.RIVER:
                    case TileType.MOUNTAIN:
                        matrixRow.push(Blocked);
                        break;
                    default:
                        matrixRow.push(Walkable);
                        break;
                }
            }
            matrix.push(matrixRow);
        }
        grid = new PF.Grid(matrix);
    } else {
        const matrix: Matrix = [];
        for (const row of tiles) {
            const matrixRow: MatrixRow = [];
            for (const tile of row) {
                matrixRow.push(tile === TileType.WATER ? Blocked : Walkable);
            }
            matrix.push(matrixRow);
        }
        grid = new PF.Grid(matrix);
    }

    if (blockEnemyUnits) {
        for (const u of units) {
            if (isMoveableUnit(u) && u.player !== currentPlayer) {
                grid.setWalkableAt(u.x, u.y, false);
            }
        }
    }
    const finder = new PF.AStarFinder({
        diagonalMovement: PF.DiagonalMovement.Never,
    });
    return { finder, grid };
}