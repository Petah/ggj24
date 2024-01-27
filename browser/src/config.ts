import Phaser from 'phaser';

export const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#33A5E7',
    pixelArt: true,
    disableContextMenu: true,
    scale: {
        mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH,
        parent: 'parent',
        width: '100%',
        height: '100%',
    },
};
