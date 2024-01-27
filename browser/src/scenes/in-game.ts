import Phaser from 'phaser';
import { Client } from '../client';
import { GameState } from '../../../common/events/game-list';

const TILE_SIZE = 16;
const TILE_SCALE = 1;

export class InGame extends Phaser.Scene {
    private cursorLayer!: Phaser.GameObjects.Layer;
    private cursorSprite!: Phaser.GameObjects.Sprite;
    private gameObjects!: Phaser.GameObjects.Sprite[];

    private client: Client;
    private gameState!: GameState;


    constructor() {
        super('InGame');

        this.client = new Client();

        this.client.onGameStateChange((gameState: GameState) => {
            this.gameState = gameState;
        });

    }

    preload() {
        this.load.image('tiles', 'assets/tilemap_packed.png');
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
    }

    create() {
        this.cameras.main.setZoom(1);

        this.scale.setGameSize(window.innerWidth, window.innerHeight)
        this.scene.launch('UI')
        this.scale.on('resize', this.resize, this);


        // create the Tilemap
        const map = this.make.tilemap({ key: 'map' })
        const tilesetName = map.tilesets[0].name
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles') as Phaser.Tilemaps.Tileset;

        map.createLayer('Map', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Road', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Mountains', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Trees', tileset)?.setScale(TILE_SCALE)

        // map.createLayer('Data', tileset)

        // const townsLayer = map.getObjectLayer('Towns')
        this.gameObjects = map.createFromObjects('Towns', [{
            type: 'City',
            // frame: 8,
            key: 'tiles2',
        }, {
            type: 'Dock',
            frame: 12,
            key: 'tiles2',
        }, {
            type: 'Factory',
            frame: 11,
            key: 'tiles2',
        }, {
            type: 'Airport',
            frame: 15,
            key: 'tiles2',
        }, {
            type: 'HQ',
            frame: 9,
            key: 'tiles2',
        }, {
            type: 'Infantry',
            frame: 106,
            key: 'tiles2',
        }]) as Phaser.GameObjects.Sprite[]

        for (const sprite of this.gameObjects) {
            // console.log(gameObject);
            this.fixSprite(sprite)
        }

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const tileX = Math.floor(pointer.worldX / TILE_SIZE / TILE_SCALE);
            const tileY = Math.floor(pointer.worldY / TILE_SIZE / TILE_SCALE);
            for (const gameObject of this.gameObjects) {
                // Get game object at position
                const x = Math.floor(gameObject.x / TILE_SIZE / TILE_SCALE);
                const y = Math.floor(gameObject.y / TILE_SIZE / TILE_SCALE);
                if (x === tileX && y === tileY) {
                    console.log('Clicked on game object at ', x, y, gameObject);
                }
            }

            // this.placeCursorAtPosition(tileX, tileY);
            console.log('Click', pointer.worldX, pointer.worldY, tileX, tileY, this.gameState.tiles?.[tileY]?.[tileX]);
        });


        this.cursorLayer = this.add.layer();
    }

    findObjectAtPosition(tileX: number, tileY: number, map: Phaser.Tilemaps.Tilemap) {
        const objectLayer = map.getObjectLayer('Towns');
        const objects = objectLayer?.objects;
        if (!objects) {
            return null;
        }
        for (let i = 0; i < objects.length; i++) {
            const object = objects[i];
            if (object.x === tileX && object.y === tileY) {
                return object;
            }
        }
        return null;
    }

    placeCursorAtPosition(tileX: number, tileY: number) {
        console.log("TileX: " + tileX + " TileY: " + tileY + " placedPositionX: " + tileX * TILE_SIZE + " placedPositionY: " + tileY * TILE_SIZE)
        this.cursorSprite?.destroy();
        this.cursorSprite = this.add.sprite(tileX * TILE_SIZE, tileY * TILE_SIZE, 'tiles2', 61).setScale(TILE_SCALE).setOrigin(0, 0);
        this.cursorLayer.add(this.cursorSprite);
    }

    resize (gameSize:any, baseSize:any, displaySize:any, resolution:any) {
        console.log("resizing Game: " + baseSize)

        const width = baseSize.width;
        const height = baseSize.height;

        // this.cameras.resize(width, height);

    }

    fixSprite(sprite: Phaser.GameObjects.Sprite) {
        const owner = sprite.getData('owner')
        const type = sprite.type
        console.log(sprite)
        switch (type) {
            case 'City':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(60);
                        break;
                    case 'blue':
                        sprite.setFrame(42);
                        break;
                    case 'green':
                        sprite.setFrame(26);
                        break;
                    case 'yellow':
                        sprite.setFrame(78);
                        break;
                }
                break;
            case 'Dock':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(8);
                        break;
                    case 'blue':
                        sprite.setFrame(8 + 18);
                        break;
                    case 'green':
                        sprite.setFrame(8 + (18 * 2));
                        break;
                    case 'yellow':
                        sprite.setFrame(8 + (18 * 3));
                        break;
                }
                break;
            case 'Factory':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(8);
                        break;
                    case 'blue':
                        sprite.setFrame(8 + 18);
                        break;
                    case 'green':
                        sprite.setFrame(8 + (18 * 2));
                        break;
                    case 'yellow':
                        sprite.setFrame(8 + (18 * 3));
                        break;
                }
                break;
            case 'Airport':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(8);
                        break;
                    case 'blue':
                        sprite.setFrame(8 + 18);
                        break;
                    case 'green':
                        sprite.setFrame(8 + (18 * 2));
                        break;
                    case 'yellow':
                        sprite.setFrame(8 + (18 * 3));
                        break;
                }
                break;
            case 'HQ':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(8);
                        break;
                    case 'blue':
                        sprite.setFrame(8 + 18);
                        break;
                    case 'green':
                        sprite.setFrame(8 + (18 * 2));
                        break;
                    case 'yellow':
                        sprite.setFrame(8 + (18 * 3));
                        break;
                }
                break;
            case 'Infantry':
                switch (owner) {
                    case 'red':
                        sprite.setFrame(8);
                        break;
                    case 'blue':
                        sprite.setFrame(8 + 18);
                        break;
                    case 'green':
                        sprite.setFrame(8 + (18 * 2));
                        break;
                    case 'yellow':
                        sprite.setFrame(8 + (18 * 3));
                        break;
                }
                break;
        }

    }
}