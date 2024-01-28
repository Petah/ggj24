export class GameButton {
    private nineSlice!: Phaser.GameObjects.NineSlice;
    private textObject!: Phaser.GameObjects.Text;

    public constructor(
        public scene: Phaser.Scene,
        public text: string,
        public x: number,
        public y: number,
        public callback: () => void,
    ) {
        const height = 50;
        const width = 260;
        const padding = 20;
        this.nineSlice = scene.add.nineslice(x, y, 'buttonGreen', 0, 16 * 3, 16 * 3, 16, 16, 16, 16).setOrigin(0).setOrigin(0);

        this.textObject = scene.add.text(x, y, this.text, {
            fontSize: '24px',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                stroke: true,
                fill: true,
            },
        }).setScale(1).setOrigin(0);
        this.textObject.setPosition(x + (width - this.textObject.width) / 2, y + padding / 2);


        this.nineSlice.setSize(width, height)
        this.nineSlice.setInteractive();
        this.nineSlice.on('pointerdown', callback);
    }

    public update() {
        // this.nineSlice.setPosition(
        //     this.scene.cameras.main.worldView.x + this.x,
        //     this.scene.cameras.main.worldView.y + this.y,
        // );

        // this.textObject.setPosition(
        //     this.scene.cameras.main.worldView.x + this.x + 10,
        //     this.scene.cameras.main.worldView.y + this.y + 10,
        // );
    }

    public setVisible(visible: boolean) {
        this.nineSlice.setVisible(visible);
        this.textObject.setVisible(visible);
    }

    public setEnabled(enabled: boolean) {
        this.nineSlice.setAlpha(enabled ? 1 : 0.5);
        this.textObject.setAlpha(enabled ? 1 : 0.5);
        this.nineSlice.setInteractive(enabled);
    }
}