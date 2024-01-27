import { TileType } from '../../common/events/game-list';
import * as PF from 'pathfinding';

export class GameMap {
    public grid: PF.Grid;
    public finder: PF.AStarFinder;
    public matrixString: string;

    constructor(
        public width: number,
        public height: number,
        public tiles: TileType[][],
    ) {
        this.matrixString = ' ';
        for (let i = 0; i < width; i++) {
            this.matrixString += i % 10;
        }
        this.matrixString += '\n';
        const matrix = [];
        for (const row of tiles) {
            const matrixRow = [];
            this.matrixString += matrix.length % 10;
            for (const tile of row) {
                matrixRow.push(tile === TileType.WATER ? 1 : 0);
                this.matrixString += tile === TileType.WATER ? '~' : 'X';
            }
            matrix.push(matrixRow);
            this.matrixString += '\n';
        }
        process.stdout.write(this.matrixString);
        this.grid = new PF.Grid(matrix);
        this.finder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        });
    }
}
