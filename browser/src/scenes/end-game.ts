import Phaser from 'phaser';
import { state } from '../state';


export class EndGame extends Phaser.Scene {
    constructor() {
        super({ key: 'EndGame' });
    }

    create() {
        const x = this.cameras.main.worldView.width / 2;
        const y = this.cameras.main.worldView.height / 2;

        if (state.winningPlayer == state.playerName) {
            this.add.text(x, y, 'Mission Accomplished', { fontSize: '32px', color: '#fff' });
        } else {
            this.add.text(x, y, 'Mission Failed', { fontSize: '32px', color: '#fff' });
        }
    }
}