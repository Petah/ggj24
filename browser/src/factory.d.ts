declare interface IButton extends Phaser.GameObjects.Container {
    setEnabled(enabled: boolean): IButton;
}

declare namespace Phaser.GameObjects {
    interface GameObjectFactory {
        button(x: number, y: number, text: string, callback: () => void): IButton;
    }
}