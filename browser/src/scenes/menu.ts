import Phaser from 'phaser';

export class Menu extends Phaser.Scene {
    constructor() {
        super('Menu');
    }

    preload() {
    }

    create() {
        const button = this.add.image(400, 300, 'button');
        button.setInteractive();
        button.on('pointerdown', () => {
            this.scene.start('InGame');
        });

        // @todo remove, jump straight to in-game for testing
        this.scene.start('InGame');
    }
}