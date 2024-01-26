export class Tile {

}

export class GameMap {
    public width: number = 25;
    public height: number = 25;
    public tiles: Tile[][] = [];

    public load() {
        for (let x = 0; x < this.width; x++) {
            this.tiles[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.tiles[x][y] = new Tile();
            }
        }
    }
}
