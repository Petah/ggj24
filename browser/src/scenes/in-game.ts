import Phaser from 'phaser';

export class InGame extends Phaser.Scene {
    constructor() {
        super('InGame');
    }

    preload() {
        this.load.image('logo', 'assets/red_boxCross.png');
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