import Phaser from 'phaser';
import { Client } from '../client';
import { GameState } from '../../../common/events/game-list';
import { EndTurn, StartGame } from '../../../common/events/turn';
import { GameButton } from '../button';

const TILE_SIZE = 16;
const TILE_SCALE = 1;

export class InGame extends Phaser.Scene {
    private client: Client;
    private text!: Phaser.GameObjects.Text;
    private startGameButton!: GameButton;
    private endTurnButton!: GameButton;
    private gameState!: GameState;
    private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;
    private cursorLayer!: Phaser.GameObjects.Layer;
    private cursorSprite!: Phaser.GameObjects.Sprite;
    private gameObjects!: Phaser.GameObjects.Sprite[];

    constructor() {
        super('InGame');
        this.client = new Client();

        this.client.onGameStateChange((gameState: GameState) => {
            this.gameState = gameState;
        });
    }

    preload() {
        this.load.image('logo', 'assets/red_boxCross.png');
        this.load.image('grid', 'assets/uv-grid-4096-ian-maclachlan.png');
        this.load.image('tiles', 'assets/tilemap_packed.png');
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
    }

    create() {

        // create the Tilemap
        this.cursorLayer = this.add.layer();
        const map = this.make.tilemap({ key: 'map' })
        const tilesetName = map.tilesets[0].name
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles') as Phaser.Tilemaps.Tileset;

        map.createLayer('Map', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Road', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Mountains', tileset)?.setScale(TILE_SCALE)
        map.createLayer('Trees', tileset)?.setScale(TILE_SCALE)
        map.createBlankLayer('Cursor', tileset)?.setScale(TILE_SCALE)

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
            const owner = sprite.getData('owner')
            const currentFrame = sprite.body?.gameObject?.frame
            if (owner === 'red') {
                console.log(owner, sprite);
                // gameObject?.setFrame(currentFrame);
            // } else if (owner === 'blue') {
            //     gameObject.setFrame(currentFrame + (16 * 2));
            // } else if (owner === 'green') {
            //     gameObject.setFrame(currentFrame + (16 * 3));
            // } else if (owner === 'yellow') {
            //     gameObject.setFrame(currentFrame + (16 * 4));
            }
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

        const cursors = this.input.keyboard!.createCursorKeys();

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            acceleration: 0.02,
            drag: 0.0005,
            maxSpeed: 0.01,
        });

        this.cameras.main.setBounds(0, 0, 4096, 4096).setZoom(1);

        this.startGameButton = new GameButton(this, 'Start Game', 10, 10, () => {
            this.client.send(new StartGame());
        });
        this.endTurnButton = new GameButton(this, 'End Turn', 10, 70, () => {
            this.client.send(new EndTurn());
        });

        this.text = this.add.text(10, 10, '', {
            font: '16px monospace',
            align: 'right',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                blur: 1,
                stroke: true,
                fill: true,
            },
        });
    }

    update(delta: number) {
        this.controls.update(delta);

        // @ts-ignore Hack to make the camera position update properly
        this.cameras.main.preRender(1);

        // Render debug info
        if (this.gameState) {
            const debugText = [
                `Players: ${this.gameState.players.length} - ${this.gameState.players.map(player => player.name).join(', ')}`,
                `Current player: ${this.gameState.currentPlayer}`,
                `Turn: ${this.gameState.turn}`,
            ];
            this.text.setText(debugText.join('\n'));
            this.text.setPosition(
                this.cameras.main.worldView.x + this.cameras.main.worldView.width - this.text.width - 10,
                this.cameras.main.worldView.y + 10,
            );
        }

        // Render UI
        this.startGameButton.update();
        this.endTurnButton.update();
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
        this.cursorSprite = this.add.sprite(tileX * TILE_SIZE, tileY * TILE_SIZE, 'tiles2', 61).setScale(TILE_SCALE);
        this.cursorLayer.add(this.cursorSprite);
    }
}