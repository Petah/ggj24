import Phaser from 'phaser';
import { client } from '../client';
import { TILE_SCALE, TILE_SIZE } from '../../../common/map';
import { MovableUnit, PlayerColor, Unit, UnitType, isBuilding, isFactory, isMoveableUnit } from '../../../common/unit';
import { PurchaseUnitRequest } from '../../../common/events/unit-purchase';
import { isOurTurn, state } from '../state';
import { UI } from './ui-scene';
import { CaptureRequest, EndTurn, MoveUnitRequest, MoveUnitResponse, ReloadGameState } from '../../../common/events/turn';
import { logError } from '../../../common/log';
import * as PF from 'pathfinding';

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
    private buildingLayer!: Phaser.GameObjects.Layer;
    private unitLayer!: Phaser.GameObjects.Layer;
    private created: boolean = false;
    private ui!: UI;
    private moving?: {
        sprite: Phaser.GameObjects.Sprite;
        pointsX: number[];
        pointsY: number[];
        time: number;
        current: number;
    };
    private grid!: PF.Grid;
    private finder!: PF.AStarFinder;
    private selectedArrow!: Phaser.GameObjects.Sprite;
    private isInMenuState: boolean = false;

    constructor() {
        super('InGame');
        state.scene = this
    }

    preload() {
        this.load.image('tiles', 'assets/tilemap_packed.png');
        // UIpackSheet_transparent.png
        this.load.spritesheet('uiTiles1', 'assets/UIpackSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 2 });
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
        this.load.spritesheet('bigCursor', 'assets/big_cursor.png', { frameWidth: 200, frameHeight: 32 })
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

        this.input.on('pointerdown', (pointer: {
            worldX: number;
            worldY: number;
            button: number;
        }) => {
            if (!isOurTurn()) {
                return;
            }
            const tileX = Math.floor(pointer.worldX / TILE_SIZE / TILE_SCALE);
            const tileY = Math.floor(pointer.worldY / TILE_SIZE / TILE_SCALE);
            switch (pointer.button) {
                case 0:
                    this.placeCursorAtPosition(tileX, tileY);
                    const unitAtPosition = this.findObjectAtPosition(tileX, tileY);
                    if (unitAtPosition && this.isSelectable(unitAtPosition)) {
                        this.selectUnit(unitAtPosition);
                    } else {
                        this.unselectUnit();
                    }
                    break;
                case 2:
                    if (isMoveableUnit(state.selectedUnit)) {
                        this.placeCursorAtPosition(tileX, tileY);
                        client.send(new MoveUnitRequest(state.selectedUnit.id, tileX, tileY));
                    }
                    break;
            }
        });

        this.input.keyboard?.on('keydown', (event: any) => {
            if (this.isInMenuState && state.selectedUnit) {
                switch (event.key) {
                    case 'ArrowUp':
                        this.ui.movePurchaseCursorUp();
                        break;
                    case 'ArrowDown':
                        this.ui.movePurchaseCursorDown();
                        break;
                    case 'x':
                        this.unselectUnit();
                        break;
                    case 'c':
                    case ' ':
                        client.send(new PurchaseUnitRequest(state.selectedUnit.id, this.ui.getSelectedUnitTypeFromPurchaseList()))
                        this.unselectUnit();
                        break;
                }
                return;
            }
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
                case 'Enter':
                    client.send(new EndTurn())
            }
        });


        this.buildingLayer = this.add.layer();
        this.unitLayer = this.add.layer();

        this.cursorLayer = this.add.layer();
        this.cursorSprite = this.add.sprite(state.cursorX * TILE_SIZE, state.cursorY * TILE_SIZE, 'tiles2', 61).setScale(TILE_SCALE).setOrigin(0, 0);
        this.cursorLayer.add(this.cursorSprite);
        this.placeCursorAtPosition(state.cursorX, state.cursorY)
        this.selectedArrow = this.make.sprite({
            x: 0,
            y: 0,
            key: 'uiTiles1',
            frame: 715,
            origin: 0,
        }, false);
        this.cursorLayer.add(this.selectedArrow);

        this.created = true;
        this.updateGameState();
    }

    update(time: number, delta: number): void {
        if (this.moving) {
            this.moving.current += delta;
            if (this.moving.current > this.moving.time) {
                this.moving.current = this.moving.time;
            }
            const percent = this.moving.current / this.moving.time;
            const currentX = Phaser.Math.Interpolation.Linear(this.moving.pointsX, percent);
            const currentY = Phaser.Math.Interpolation.Linear(this.moving.pointsY, percent);
            this.moving.sprite.setPosition(currentX, currentY);
            this.selectedArrow.setPosition(currentX, currentY - TILE_SIZE * TILE_SCALE);
            if (percent >= 1) {
                this.moving = undefined;
                client.send(new ReloadGameState())
            }
        }
    }

    onCursorPositionUpdate(tileX: number, tileY: number) {

    }

    findObjectAtPosition(tileX: number, tileY: number) {
        const units = [];
        for (const unit of state.game?.units || []) {
            if (unit.x === tileX && unit.y === tileY) {
                units.push(unit);
            }
        }
        for (const unit of units) {
            if (isMoveableUnit(unit)) {
                return unit;
            }
        }
        return units[0];
    }

    placeCursorAtPosition(tileX: number, tileY: number) {
        this.cursorSprite.setPosition(tileX * TILE_SIZE * TILE_SCALE, tileY * TILE_SIZE * TILE_SCALE);
        localStorage.setItem('cursorX', tileX.toString());
        localStorage.setItem('cursorY', tileY.toString());
        this.onCursorPositionUpdate(tileX, tileY);
    }

    private isPlayersUnit(unit: Unit) {
        return unit.player === state.playerName;
    }

    private handleSelect(tileX: number, tileY: number) {
        const unit = this.findObjectAtPosition(tileX, tileY)
        if (state.selectedUnit) {
            if (this.isSelectable(unit) && unit.id !== state.selectedUnit.id) {
                this.selectUnit(unit);
                return;
            }
            if ((state.selectedUnit.x === tileX && state.selectedUnit.y === tileY) || !isMoveableUnit(state.selectedUnit)) {
                this.unselectUnit();
                return;
            }
            client.send(new MoveUnitRequest(state.selectedUnit.id, tileX, tileY));
        } else {
            this.selectUnit(unit);
        }
    }

    private isSelectable(unit?: Unit): unit is Unit {
        if (!unit) {
            return false;
        }
        if (!this.isPlayersUnit(unit)) {
            return false;
        }
        return isFactory(unit) || isMoveableUnit(unit);
    }

    public selectUnit(unit?: Unit) {
        if (!this.isSelectable(unit) || !isOurTurn()) {
            return;
        }
        if (state.selectedUnit) {
            this.unselectUnit();
        }
        state.selectedUnit = unit;
        const type = unit?.type;
        if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
            this.isInMenuState = true;
            this.ui.onProductionBuildingSelected(unit);
        }
        this.selectedArrow.setPosition(unit.x * TILE_SIZE * TILE_SCALE, (unit.y - 1) * TILE_SIZE * TILE_SCALE);
        this.selectedArrow.setVisible(true);
        const building = state.game?.units?.find(u => u.x === unit.x && u.y === unit.y && isBuilding(u));
        if (
            (unit.type == UnitType.INFANTRY || unit.type == UnitType.ANTI_TANK)
            && building && building.player !== state.playerName
        ) {
            console.log('enable capture button in selectUnit', building);
            this.ui.enableCaptureButton();
        } else {
            this.ui.disableCaptureButton();
        }
    }

    private unselectUnit() {
        const type = state.selectedUnit?.type;
        if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
            this.isInMenuState = false;
            this.ui.onProductionBuildingUnselected();
        }
        state.selectedUnit = undefined;
        this.selectedArrow.setVisible(false);
    }

    private getUnitSprite(unit: Unit) {
        for (const layer of [this.buildingLayer, this.unitLayer]) {
            const sprite = layer.getChildren().find(child => child.getData('unit') === unit.id) as Phaser.GameObjects.Sprite | undefined;
            if (sprite) {
                return sprite;
            }
        }
    }

    public updateGameState() {
        if (!state.game || !this.created) {
            return;
        }
        this.ui.updateGameState();

        if (!isOurTurn()) {
            this.unselectUnit();
        }

        this.grid = new PF.Grid(state.game.matrix!);
        this.finder = new PF.AStarFinder({
            diagonalMovement: PF.DiagonalMovement.Never,
        });
        const units = state.game?.units || [];
        for (const unit of units) {
            const existingSprite = this.getUnitSprite(unit);
            const playerColor = state.game.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
            const frame = UnitSprites[playerColor][unit.type] || 193;
            if (existingSprite) {
                existingSprite.setPosition(unit.x * TILE_SIZE, unit.y * TILE_SIZE);
                // TODO check if they can shoot, check if they capture
                if (
                    isMoveableUnit(unit)
                    && (unit.movementPoints === 0 || unit.hasCommitedActions)
                ) {
                    existingSprite.setTint(0x888888);
                } else {
                    existingSprite.clearTint();
                }

                if (isBuilding(unit)) {
                    existingSprite.setFrame(frame)
                }
            } else {

                const sprite = this.make.sprite({
                    x: unit.x * TILE_SIZE,
                    y: unit.y * TILE_SIZE,
                    key: 'tiles2',
                    frame,
                    scale: TILE_SCALE,
                    origin: 0,
                }, false);
                sprite.setData('unit', unit.id);
                if (isMoveableUnit(unit)) {
                    this.unitLayer.add(sprite);
                    
                } else if (isBuilding(unit)) {
                    this.buildingLayer.add(sprite);
                } else {
                    logError(`Unknown unit type ${unit.type}`);
                }
            }
        }

        if (state.selectedUnit) {
            state.selectedUnit = units.find(unit => unit.id === state.selectedUnit?.id);
        }
    }

    public handleMoveUnitResponse(event: MoveUnitResponse) {
        const unit = state.game?.units?.find(unit => unit.id === event.unitId);
        if (!isMoveableUnit(unit)) {
            return;
        }
        unit.movementPoints = event.remainingMovementPoints;
        const sprite = this.getUnitSprite(unit);
        if (unit.movementPoints === 0) {
            this.unselectUnit();
        }

        if (!sprite) {
            return;
        }
        const pointsX = event.path.map(point => point[0] * TILE_SIZE);
        const pointsY = event.path.map(point => point[1] * TILE_SIZE);
        this.moving = {
            sprite,
            pointsX,
            pointsY,
            time: event.path.length * 1000 / 4,
            current: 0,
        }

        const building = state.game?.units?.find(u => u.x === unit.x && u.y === unit.y && isBuilding(u));
        if (isMoveableUnit(unit) 
        && (((unit as MovableUnit).type == UnitType.INFANTRY) || (unit as MovableUnit).type == UnitType.ANTI_TANK)
        && building?.player !== state.playerName) {
            console.log('enable capture button in selectUnit');
            this.ui.enableCaptureButton();
        }
        console.log('this.moving', this.moving);
    }
}