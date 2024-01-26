import './style.css'
import Phaser from 'phaser';
import config from './config';
import { Menu } from './scenes/menu';
import { InGame } from './scenes/in-game';

new Phaser.Game({
    ...config,
    scene: [
        Menu,
        InGame,
    ],
});
