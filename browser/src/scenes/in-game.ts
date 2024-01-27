import Phaser from 'phaser';
import { client } from '../client';
import { GameState } from '../../../common/events/game-list';
import { TILE_SCALE, TILE_SIZE } from '../../../common/map';
import { PlayerColor, Unit, UnitType } from '../../../common/unit';
import { state } from '../state';
import { MoveUnitRequest } from '../../../common/events/turn';
import { UI } from './ui-scene';

export const UnitSprites = {
    [PlayerColor.NEUTRAL]: {
        [UnitType.CITY]: 8,
        [UnitType.INFANTRY]: 106,
        [UnitType.HQ]: 9,
        [UnitType.FACTORY]: 11,
        [UnitType.AIRPORT]: 15,
        [UnitType.DOCK]: 12,
        [UnitType.TANK]: 0,
        [UnitType.SHIP]: 0,
        [UnitType.JET]: 0,
        [UnitType.HELICOPTER]: 0,
        [UnitType.APC]: 0,
        [UnitType.ANTI_TANK]: 0,
        [UnitType.LANDER]: 0,
    },
    [PlayerColor.RED]: {
        [UnitType.CITY]: 62,
        [UnitType.INFANTRY]: 160,
        [UnitType.HQ]: 63,
        [UnitType.FACTORY]: 65,
        [UnitType.AIRPORT]: 69,
        [UnitType.DOCK]: 66,
        [UnitType.TANK]: 152,
        [UnitType.SHIP]: 158,
        [UnitType.JET]: 154,
        [UnitType.HELICOPTER]: 155,
        [UnitType.APC]: 150,
        [UnitType.ANTI_TANK]: 161,
        [UnitType.LANDER]: 157,
    },
    [PlayerColor.BLUE]: {
        [UnitType.CITY]: 44,
        [UnitType.INFANTRY]: 142,
        [UnitType.HQ]: 45,
        [UnitType.FACTORY]: 47,
        [UnitType.AIRPORT]: 51,
        [UnitType.DOCK]: 48,
        [UnitType.TANK]: 134,
        [UnitType.SHIP]: 140,
        [UnitType.JET]: 154,
        [UnitType.HELICOPTER]: 155,
        [UnitType.APC]: 150,
        [UnitType.ANTI_TANK]: 161,
        [UnitType.LANDER]: 157,
    },
    [PlayerColor.GREEN]: {
        [UnitType.CITY]: 26,
        [UnitType.INFANTRY]: 124,
        [UnitType.HQ]: 27,
        [UnitType.FACTORY]: 29,
        [UnitType.AIRPORT]: 33,
        [UnitType.DOCK]: 30,
        [UnitType.TANK]: 116,
        [UnitType.SHIP]: 122,
        [UnitType.JET]: 118,
        [UnitType.HELICOPTER]: 119,
        [UnitType.APC]: 114,
        [UnitType.ANTI_TANK]: 125,
        [UnitType.LANDER]: 121,
    },
    [PlayerColor.YELLOW]: {
        [UnitType.CITY]: 80,
        [UnitType.INFANTRY]: 178,
        [UnitType.HQ]: 81,
        [UnitType.FACTORY]: 83,
        [UnitType.AIRPORT]: 87,
        [UnitType.DOCK]: 84,
        [UnitType.TANK]: 170,
        [UnitType.SHIP]: 176,
        [UnitType.JET]: 172,
        [UnitType.HELICOPTER]: 173,
        [UnitType.APC]: 168,
        [UnitType.ANTI_TANK]: 179,
        [UnitType.LANDER]: 175,
    },
}

export class InGame extends Phaser.Scene {
    private cursorLayer!: Phaser.GameObjects.Layer;
    private cursorSprite!: Phaser.GameObjects.Sprite;
    private shoppingLayer!: Phaser.GameObjects.Layer;
    private unitLayer!: Phaser.GameObjects.Layer;
    private created: boolean = false;
    private ui!: UI;

    constructor() {
        super('InGame');

        client.onGameStateChange((gameState: GameState) => {
            state.game = gameState;
            this.updateGameState();
        });

    }

    preload() {
        this.load.image('tiles', 'assets/tilemap_packed.png');
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
    }

    create() {
        this.scale.setGameSize(window.innerWidth, window.innerHeight)
        this.scene.launch('UI')
        this.ui = this.scene.manager.getScene('UI') as UI;

        // create the Tilemap
        const map = this.make.tilemap({ key: 'map' })
        const tilesetName = map.tilesets[0].name
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles') as Phaser.Tilemaps.Tileset;

        map.createLayer('Map', tileset)
        map.createLayer('Road', tileset)
        map.createLayer('Mountains', tileset)
        map.createLayer('Trees', tileset)
        this.cameras.main.setZoom(2).setScroll(-300, -200);


        this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: any, deltaY: any, deltaZ: any) => {
            if (deltaY > 0) {
                const newZoom = this.cameras.main.zoom - .1;
                if (newZoom > 1) {
                    this.cameras.main.zoom = newZoom;
                }
            }

            if (deltaY < 0) {
                const newZoom = this.cameras.main.zoom + .1;
                if (newZoom < 3) {
                    this.cameras.main.zoom = newZoom;
                }
            }

            // this.cameras.main.centerOn(pointer.worldX, pointer.worldY);
            // this.cameras.main.pan(pointer.worldX, pointer.worldY, 2000, "Power2");
        });

        this.input.on('pointermove', (pointer: any) => {
            if (!pointer.isDown) return;

            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });

        this.input.keyboard?.on('keydown', (event: any) => {
            const tileX = Math.floor(this.cursorSprite.x / TILE_SIZE / TILE_SCALE);
            const tileY = Math.floor(this.cursorSprite.y / TILE_SIZE / TILE_SCALE);

            switch (event.key) {
                case 'ArrowUp':
                    if (tileY > 0) {
                        this.placeCursorAtPosition(tileX, tileY - 1);
                    }
                    break;
                case 'ArrowDown':
                    if (tileY < (state.game?.height || 40) - 1) {
                        this.placeCursorAtPosition(tileX, tileY + 1);
                    }
                    break;
                case 'ArrowLeft':
                    if (tileX > 0) {
                        this.placeCursorAtPosition(tileX - 1, tileY);
                    }
                    break;
                case 'ArrowRight':
                    if (tileX < (state.game?.width || 40) - 1) {
                        this.placeCursorAtPosition(tileX + 1, tileY);
                    }
                    break;
                case 'c':
                case ' ':
                    this.handleSelect(tileX, tileY);
                    break;
                case 'x':
                    this.unselectUnit();
                    break;
            }
        });


        this.unitLayer = this.add.layer();

        this.cursorLayer = this.add.layer();
        this.cursorSprite = this.add.sprite(state.cursorX * TILE_SIZE, state.cursorY * TILE_SIZE, 'tiles2', 61).setScale(TILE_SCALE).setOrigin(0, 0);
        this.cursorLayer.add(this.cursorSprite);
        this.placeCursorAtPosition(state.cursorX, state.cursorY)

        this.created = true;
        this.updateGameState();
    }

    onCursorPositionUpdate(tileX: number, tileY: number) {
        const unit = this.findObjectAtPosition(tileX, tileY);
    }

    findObjectAtPosition(tileX: number, tileY: number) {
        for (const unit of state.game?.units || []) {
            if (unit.x === tileX && unit.y === tileY) {
                return unit;
            }
        }
    }

    placeCursorAtPosition(tileX: number, tileY: number) {
        this.cursorSprite.setPosition(tileX * TILE_SIZE * TILE_SCALE, tileY * TILE_SIZE * TILE_SCALE);
        localStorage.setItem('cursorX', tileX.toString());
        localStorage.setItem('cursorY', tileY.toString());
        this.onCursorPositionUpdate(tileX, tileY);
    }

    private handleSelect(tileX: number, tileY: number) {
        console.log("selecting")
        if (state.selectedUnit) {
            if (state.selectedUnit.x === tileX && state.selectedUnit.y === tileY) {
                this.unselectUnit();
                return;
            }
            client.send(new MoveUnitRequest(state.selectedUnit.id, tileX, tileY));
        } else {
            const unit = this.findObjectAtPosition(tileX, tileY);
            state.selectedUnit = unit;
            const type = unit?.type;
            if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
                if (unit) {
                    this.ui.onProductionBuildingSelected(unit);
                }
            }
        }
    }

    private unselectUnit() {
        const unit = state.selectedUnit;
        const type = unit?.type;
        console.log(type)
        if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
            this.ui.onProductionBuildingUnselected();
        }
        state.selectedUnit = undefined;
    }

    private updateGameState() {
        if (!state.game || !this.created) {
            return;
        }
        for (const unit of state.game?.units || []) {
            const existingSprite = this.unitLayer.getChildren().find((child: any) => child.getData('unit') === unit.id) as Phaser.GameObjects.Sprite;
            if (existingSprite) {
                existingSprite.setPosition(unit.x * TILE_SIZE, unit.y * TILE_SIZE);
            } else {
                const playerColor = state.game.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
                const frame = UnitSprites[playerColor][unit.type] || 193;
                const sprite = this.make.sprite({
                    x: unit.x * TILE_SIZE,
                    y: unit.y * TILE_SIZE,
                    key: 'tiles2',
                    frame,
                    scale: TILE_SCALE,
                    origin: 0,
                }, false);
                sprite.setData('unit', unit.id);
                this.unitLayer.add(sprite);
            }
        }
    }
}