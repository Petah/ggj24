import Phaser from 'phaser';
import { client } from '../client';
import { GameState } from '../../../common/events/game-list';
import { TILE_SCALE, TILE_SIZE } from '../../../common/map';
import { PlayerColor, UnitType } from '../../../common/unit';
import { state } from '../state';

const UnitSprites = {
    [PlayerColor.NEUTRAL]: {
        [UnitType.CITY]: 8,
        [UnitType.INFANTRY]: 106,
        [UnitType.HQ]: 9,
        [UnitType.FACTORY]: 11,
        [UnitType.AIRPORT]: 15,
        [UnitType.DOCK]: 12,
    },
    [PlayerColor.RED]: {
        [UnitType.CITY]: 62,
        [UnitType.INFANTRY]: 160,
        [UnitType.HQ]: 63,
        [UnitType.FACTORY]: 65,
        [UnitType.AIRPORT]: 69,
        [UnitType.DOCK]: 66,
    },
    [PlayerColor.BLUE]: {
        [UnitType.CITY]: 44,
        [UnitType.INFANTRY]: 142,
        [UnitType.HQ]: 45,
        [UnitType.FACTORY]: 47,
        [UnitType.AIRPORT]: 51,
        [UnitType.DOCK]: 48,
    },
    [PlayerColor.GREEN]: {
        [UnitType.CITY]: 26,
        [UnitType.INFANTRY]: 124,
        [UnitType.HQ]: 27,
        [UnitType.FACTORY]: 29,
        [UnitType.AIRPORT]: 33,
        [UnitType.DOCK]: 30,
    },
    [PlayerColor.YELLOW]: {
        [UnitType.CITY]: 80,
        [UnitType.INFANTRY]: 178,
        [UnitType.HQ]: 81,
        [UnitType.FACTORY]: 83,
        [UnitType.AIRPORT]: 87,
        [UnitType.DOCK]: 84,
    },
}

export class InGame extends Phaser.Scene {
    private cursorLayer!: Phaser.GameObjects.Layer;
    private cursorSprite!: Phaser.GameObjects.Sprite;
    private gameObjects!: Phaser.GameObjects.Sprite[];
    private unitLayer!: Phaser.GameObjects.Layer;
    private created: boolean = false;

    private gameState!: GameState;


    constructor() {
        super('InGame');

        client.onGameStateChange((gameState: GameState) => {
            state.game = gameState;
            this.updateGameState();
        });

    }

    preload() {
        this.load.image('tiles', 'assets/tilemap_packed.png');
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
    }

    create() {
        this.scale.setGameSize(window.innerWidth, window.innerHeight)
        this.scene.launch('UI')

        // create the Tilemap
        const map = this.make.tilemap({ key: 'map' })
        const tilesetName = map.tilesets[0].name
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles') as Phaser.Tilemaps.Tileset;

        map.createLayer('Map', tileset)
        map.createLayer('Road', tileset)
        map.createLayer('Mountains', tileset)
        map.createLayer('Trees', tileset)
        this.cameras.main.setZoom(2).setScroll(-300, -200);
        this.cursorLayer = this.add.layer();

        this.placeCursorAtPosition(20,20)

        // map.createLayer('Data', tileset)

        // const townsLayer = map.getObjectLayer('Towns')
        /*
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
        */

        // this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        //     const tileX = Math.floor(pointer.worldX / TILE_SIZE / TILE_SCALE);
        //     const tileY = Math.floor(pointer.worldY / TILE_SIZE / TILE_SCALE);
        //     for (const gameObject of this.gameObjects) {
        //         // Get game object at position
        //         const x = Math.floor(gameObject.x / TILE_SIZE / TILE_SCALE);
        //         const y = Math.floor(gameObject.y / TILE_SIZE / TILE_SCALE);
        //         if (x === tileX && y === tileY) {
        //             console.log('Clicked on game object at ', x, y, gameObject);
        //         }
        //     }

        //     // this.placeCursorAtPosition(tileX, tileY);
        //     console.log('Click', pointer.worldX, pointer.worldY, tileX, tileY, state.game.tiles?.[tileY]?.[tileX]);
        // });

        this.cameras.main.setZoom(2).setScroll(-300, -200);

        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: any, deltaY: any, deltaZ: any) => {
            if (deltaY > 0) {
                const newZoom = this.cameras.main.zoom - .1;
                if (newZoom > 1) {
                    this.cameras.main.zoom = newZoom;
                }
            }

            if (deltaY < 0) {
                const newZoom = this.cameras.main.zoom + .1;
                if (newZoom < 3) {
                    this.cameras.main.zoom = newZoom;
                }
            }

            // this.cameras.main.centerOn(pointer.worldX, pointer.worldY);
            // this.cameras.main.pan(pointer.worldX, pointer.worldY, 2000, "Power2");
        });

        this.input.on('pointermove', (pointer: any) => {
            if (!pointer.isDown) return;

            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        this.input.keyboard?.on('keydown', (event: any) => {
            const tileX = Math.floor(this.cursorSprite.x / TILE_SIZE / TILE_SCALE);
            const tileY = Math.floor(this.cursorSprite.y / TILE_SIZE / TILE_SCALE);

            switch (event.key) {
                case 'ArrowUp':
                    if (tileY > 0) {
                        this.placeCursorAtPosition(tileX, tileY - 1);
                    }
                    break;
                case 'ArrowDown':
                    if (tileY < (state.game?.height || 40) - 1) {
                        this.placeCursorAtPosition(tileX, tileY + 1);
                    }
                    break;
                case 'ArrowLeft':
                    if (tileX > 0) {
                        this.placeCursorAtPosition(tileX - 1, tileY);
                    }
                    break;
                case 'ArrowRight':
                    if (tileX < (state.game?.width || 40) - 1) {
                        this.placeCursorAtPosition(tileX + 1, tileY );
                    }
                    break;
                case 'c':
                case ' ':
                    // TODO select it
                    break;
                case 'x':
                    break;
            }
         });


        this.unitLayer = this.add.layer();

        this.created = true;
        this.updateGameState();
    }

    updateCursorPosition(tileX: number, tileY: number) {
        this.onCursorPositionUpdate(tileX, tileY);
    }

    onCursorPositionUpdate(tileX: number, tileY: number) {

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
        this.cursorSprite?.destroy();
        this.cursorSprite = this.add.sprite(tileX * TILE_SIZE, tileY * TILE_SIZE, 'tiles2', 61).setScale(TILE_SCALE).setOrigin(0, 0);
        this.cursorLayer.add(this.cursorSprite);
    }

    fixSprite(sprite: Phaser.GameObjects.Sprite) {
        const owner = sprite.getData('owner')
        const type = sprite.type
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

    private updateGameState() {
        if (!state.game || !this.created) {
            return;
        }
        for (const unit of state.game?.units || []) {
            const playerColor = state.game.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
            const frame = UnitSprites[playerColor][unit.type] || 193;
            const sprite = this.make.sprite({
                x: unit.x * TILE_SIZE,
                y: unit.y * TILE_SIZE,
                key: 'tiles2',
                frame,
                scale: TILE_SCALE,
                origin: 0,
            }, false);
            this.unitLayer.add(sprite);
        }
    }
}