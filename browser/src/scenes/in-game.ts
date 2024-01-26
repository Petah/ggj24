import Phaser from 'phaser';
import { Client } from '../client';
import { GameState } from '../../../common/events/game-list';
import { EndTurn } from '../../../common/events/turn';

export class InGame extends Phaser.Scene {
    private client: Client;
    private text!: Phaser.GameObjects.Text;
    private button!: Phaser.GameObjects.Image;
    private gameState!: GameState;
    private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;

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
        this.load.tilemapTiledJSON('map', 'assets/test2playermap.json');
    }

    create() {

        // create the Tilemap
        const map = this.make.tilemap({ key: 'map' })
        const tilesetName = map.tilesets[0].name
        console.log(map.tilesets[0].name)
        console.log(map.tilesets[0])
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles')

        if (tileset) {
            map.createLayer('Map', tileset)
            map.createLayer('Road', tileset)
            map.createLayer('Mountains', tileset)
        }

        const cursors = this.input.keyboard!.createCursorKeys();

        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl({
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            acceleration: 0.02,
            drag: 0.0005,
            maxSpeed: 0.5,
        });

        this.cameras.main.setBounds(0, 0, 4096, 4096).setZoom(1);

        this.button = this.add.image(10, 10, 'button')
            .setOrigin(0);

        this.button.setInteractive();
        this.button.on('pointerdown', () => {
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

        if (this.gameState) {
            const debugText = [
                `Players: ${this.gameState.players.length} - ${this.gameState.players.map(player => player.name).join(', ')}`,
                `Turn: ${this.gameState.turn}`,
            ];
            this.text.setText(debugText.join('\n'));
        }

        // Hack to make the camera position update properly
        this.cameras.main.preRender(1);

        this.text.setPosition(
            this.cameras.main.worldView.x + this.cameras.main.worldView.width - this.text.width - 10,
            this.cameras.main.worldView.y + 10,
        );

        this.button.setPosition(
            this.cameras.main.worldView.x + 10,
            this.cameras.main.worldView.y + 10,
        );
    }


}