import { Unit, UnitType, isMoveableUnit } from "./unit";
import * as PF from 'pathfinding';

export const TILE_SIZE = 16;

export function getPathFinder(unit: Unit, matrix?: number[][], units?: Unit[], currentPlayer?: string, blockEnemyUnits = true) {
    if (!matrix?.[0] || !units) {
        throw new Error('Game not loaded');
    }

    let grid: PF.Grid;
    if (unit.type === UnitType.SHIP || unit.type === UnitType.LANDER) {
        grid = new PF.Grid(matrix);
    } else if (unit.type === UnitType.JET || unit.type === UnitType.HELICOPTER) {
        const airMatrix = [];
        for (let y = 0; y < matrix.length; y++) {
            const row = [];
            for (let x = 0; x < matrix[0].length; x++) {
                row.push(0);
            }
            airMatrix.push(row);
        }
        grid = new PF.Grid(airMatrix);
    } else {
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