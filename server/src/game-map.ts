import { TileType } from '../../common/events/game-list';

export class Tile {

}

export class GameMap {
    constructor(
        public width: number,
        public height: number,
        public tiles: TileType[][],
    ) { }

    // public load() {
    //     for (let x = 0; x < this.width; x++) {
    //         this.tiles[x] = [];
    //         for (let y = 0; y < this.height; y++) {
    //             this.tiles[x][y] = new Tile();
    //         }
    //     }
    // }
}
