const scale = 3;

export class Dialog {
    private nineslice!: Phaser.GameObjects.NineSlice;

    public constructor(
        public scene: Phaser.Scene,
        public spriteName: string,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
    ) {
        this.nineslice = scene.add.nineslice(100, 100, spriteName, 0, 16 * 3, 16 * 3, 16, 16, 16, 16)
            .setPosition(x, y)
            .setOrigin(0)
            .setScale(scale);

        this.setSize(width, height);
    }

    public setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.nineslice.setPosition(x, y);
        return this;
    }

    public setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.nineslice.setSize(width / scale, height / scale);
        return this;
    }

    public setVisible(visible: boolean) {
        this.nineslice.setVisible(visible);
        return this;
    }
}