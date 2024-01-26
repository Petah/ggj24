import Phaser from 'phaser';
import { Client } from '../client';
import { GameState } from '../../../common/events/game-list';

export class InGame extends Phaser.Scene {
    private client: Client;
    private text: Phaser.GameObjects.Text;
    private gameState: GameState;

    constructor() {
        super('InGame');
        this.client = new Client();
    }

    preload() {
        this.load.image('base_tiles', 'assets/tilemap_packed.png')
        this.load.tilemapTiledJSON('tilemap', 'assets/2playermap.json')
    }

    create() {
        const map = this.make.tilemap({ key: 'tilemap' })
        const tileset = map.addTilesetImage('standard_tiles', 'base_tiles');

        console.log("Tileset is: " + (tileset ? "not null" : "null"))
        if (tileset) {
            map.createLayer('Map', tileset)
            map.createLayer('Mountains', tileset)
        }
    }

}