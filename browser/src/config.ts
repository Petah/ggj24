import Phaser from 'phaser';

export default {
    type: Phaser.AUTO,
    backgroundColor: '#33A5E7',
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
        parent: 'parent',
        width: '100%',
        height: '100%',
    },
};
