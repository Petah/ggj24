import { InGame } from "./in-game";
import { Client } from '../client';
import { GameButton } from '../button';
import { EndTurn, StartGame } from '../../../common/events/turn';
import { GameState } from '../../../common/events/game-list';

export class UI extends Phaser.Scene {

    private text!: Phaser.GameObjects.Text;
    private controls!: Phaser.Cameras.Controls.SmoothedKeyControl;

    private client: Client;
    private gameState!: GameState;

    private startGameButton!: GameButton;
    private endTurnButton!: GameButton;

    constructor() {
        super({ key: 'UI' });
        this.client = new Client();

        this.client.onGameStateChange((gameState: GameState) => {
            this.gameState = gameState;
        });
    }

    create() {
        this.startGameButton = new GameButton(this, 'Start Game', 900, 740, () => {
            this.client.send(new StartGame());
        });
        this.endTurnButton = new GameButton(this, 'End Turn', 900, 800, () => {
            this.client.send(new EndTurn());
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
}

const config = {
    width: 1920,
    height: 1080,
    physics: {  default: 'arcade' },
    scene: [InGame, UI]
}; 

