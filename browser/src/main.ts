import './style.css'
import Phaser from 'phaser';
import config from './config';
import { Menu } from './scenes/menu';
import { InGame } from './scenes/in-game';
import { UI } from './scenes/ui-scene';

new Phaser.Game({
    ...config,
    scene: [
        InGame,
        UI
    ],
});
