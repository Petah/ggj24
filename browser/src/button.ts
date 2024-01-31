export class GameButton extends Phaser.GameObjects.Container implements IButton {
    private nineSlice!: Phaser.GameObjects.NineSlice;
    private textObject!: Phaser.GameObjects.Text;

    public constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        text: string,
        callback: () => void,
    ) {
        super(scene, x, y);
        const height = 50;
        const width = 260;
        const padding = 20;
        this.nineSlice = scene.add.nineslice(0, 0, 'buttonGreen', 0, 16 * 3, 16 * 3, 16, 16, 16, 16)
            .setOrigin(0)
            .setSize(width, height)
            .setInteractive()
            .on('pointerdown', callback);

        this.textObject = scene.add.text(x, y, text, {
            fontSize: '24px',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                stroke: true,
                fill: true,
            },
        })
            .setScale(1)
            .setOrigin(0);
        this.textObject.setPosition((width - this.textObject.width) / 2, padding / 2);

        this.add([this.nineSlice, this.textObject]);
        // scene.add.existing(this);
    }

    public setVisible(visible: boolean) {
        this.nineSlice.setVisible(visible);
        this.textObject.setVisible(visible);
        return this;
    }

    public setEnabled(enabled: boolean) {
        this.nineSlice.setAlpha(enabled ? 1 : 0.5);
        this.textObject.setAlpha(enabled ? 1 : 0.5);
        this.nineSlice.setInteractive(enabled);
        return this;
    }
}