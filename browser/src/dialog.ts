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
        const scale = 3;
        this.nineslice = scene.add.nineslice(100, 100, spriteName, 0, 16 * 3, 16 * 3, 16, 16, 16, 16)
            .setPosition(x, y)
            .setSize(width / scale, height / scale)
            .setOrigin(0)
            .setScale(scale);
    }

    // public update() {
    //     this.nineslice.setPosition(
    //         this.scene.cameras.main.worldView.x + this.x,
    //         this.scene.cameras.main.worldView.y + this.y,
    //     );
    // }

    public setVisible(visible: boolean) {
        this.nineslice.setVisible(visible);
        return this;
    }
}