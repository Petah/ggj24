export class GameButton {
    private imageObject!: Phaser.GameObjects.Image;
    private textObject!: Phaser.GameObjects.Text;

    public constructor(
        public scene: Phaser.Scene,
        public text: string,
        public x: number,
        public y: number,
        public callback: () => void,
    ) {
        this.imageObject = scene.add.image(x, y, 'button').setOrigin(0);
        this.imageObject.setInteractive();
        this.imageObject.on('pointerdown', callback);
        this.textObject = scene.add.text(x, y, this.text, {
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

    public update() {
        this.imageObject.setPosition(
            this.scene.cameras.main.worldView.x + this.x,
            this.scene.cameras.main.worldView.y + this.y,
        );

        this.textObject.setPosition(
            this.scene.cameras.main.worldView.x + this.x + 10,
            this.scene.cameras.main.worldView.y + this.y + 10,
        );
    }

}