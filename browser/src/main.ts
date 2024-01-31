import './style.css';
import Phaser from 'phaser';
import { config } from './config';
import { InGame } from './scenes/in-game';
import { UI } from './scenes/ui-scene';
import { Menu } from './scenes/menu';
import { EndGame } from './scenes/end-game';
import { GameButton } from './button';

Phaser.GameObjects.GameObjectFactory.register('button', function (this: Phaser.GameObjects.GameObjectFactory, x: number, y: number, text: string, callback: () => void) {
    const button = new GameButton(this.scene, x, y, text, callback);
    this.displayList.add(button);
    return button;
});

new Phaser.Game({
    ...config,
    scene: [
        // Menu,
        InGame,
        UI,
        EndGame,
    ],
});
