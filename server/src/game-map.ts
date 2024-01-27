import { TileType } from '../../common/events/game-list';
import * as PF from 'pathfinding';

export class GameMap {
    public grid: PF.Grid;
    public finder: PF.AStarFinder;

    constructor(
        public width: number,
        public height: number,
        public tiles: TileType[][],
    ) {
        const matrix = [];
        for (const row of tiles) {
            const matrixRow = [];
            for (const tile of row) {
                matrixRow.push(tile === TileType.WATER ? 1 : 0);
            }
            matrix.push(matrixRow);
        }
        this.grid = new PF.Grid(matrix);
        this.finder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        });
    }
}
