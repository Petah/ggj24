import { InGame } from './in-game';
import { client } from '../client';
import { GameButton } from '../button';
import { EndTurn, StartGame } from '../../../common/events/turn';
import { state } from '../state';
import { MovableUnit } from '../unit';

export class UI extends Phaser.Scene {

    private text!: Phaser.GameObjects.Text;

    private startGameButton!: GameButton;
    private endTurnButton!: GameButton;

    constructor() {
        super({ key: 'UI' });
    }

    preload() {
        this.load.image('button', 'assets/green_button00.png');
    }

    create() {
        this.startGameButton = new GameButton(this, 'Start Game', this.cameras.main.worldView.width - 200, this.cameras.main.worldView.height - 120, () => {
            client.send(new StartGame());
        });
        this.endTurnButton = new GameButton(this, 'End Turn', this.cameras.main.worldView.width - 200, this.cameras.main.worldView.height - 60, () => {
            client.send(new EndTurn());
        });
        // this.cameras.main.setZoom(2);

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

        this.scale.on('resize', this.resize, this);
    }

    resize (gameSize:any, baseSize:any, displaySize:any, resolution:any) {
        console.log(`resizing: ${  baseSize}`)

        const width = baseSize.width;
        const height = baseSize.height;

        this.cameras.resize(width, height);

    }

    update(delta: number) {
        // this.controls.update(delta);

        // @ts-ignore Hack to make the camera position update properly
        this.cameras.main.preRender(1);

        // Render debug info
        if (state.game) {
            const debugText = [
                `Players: ${state.game.players.length}`,
                ...state.game.players.map(player => `${player.name}: ${player.color} $${player.money}`),
                `Current player: ${state.game.currentPlayer}`,
                `Turn: ${state.game.turn}`,
                state.selectedUnit ? `Selected unit: ${state.selectedUnit?.type} ${state.selectedUnit?.x}x${state.selectedUnit?.y} MP:${(state.selectedUnit as MovableUnit)?.movementPoints}` : 'Nothing selected',
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
    scene: [InGame, UI],
};

