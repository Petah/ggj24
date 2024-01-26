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
        this.load.image('logo', 'assets/red_boxCross.png');

        this.text = this.add.text(100, 100, '', {
            font: '16px monospace',
        });
    }

    create() {
        const logo = this.add.image(400, 70, 'logo');

        this.tweens.add({
            targets: logo,
            y: 350,
            duration: 1500,
            ease: 'Sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    }

}