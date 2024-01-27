import Phaser from 'phaser';
import { client } from '../client';
import { TILE_SIZE, getPathFinder } from '../../../common/map';
import { MovableUnit, PlayerColor, Unit, UnitType, isBuilding, isFactory, isMoveableUnit } from '../../../common/unit';
import { PurchaseUnitRequest } from '../../../common/events/unit-purchase';
import { isOurTurn, state } from '../state';
import { UI } from './ui-scene';
import { AttackUnitRequest, CaptureRequest, EndTurn, MoveUnitRequest, MoveUnitResponse, ReloadGameState } from '../../../common/events/turn';
import { logError } from '../../../common/log';
import * as PF from 'pathfinding';
import { clone } from '../../../common/util';

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
    private highlightLayer!: Phaser.GameObjects.Layer;
    private fogLayer!: Phaser.GameObjects.Layer;
    private fogEnabled: boolean = false;
    private fogSprites: Phaser.GameObjects.Sprite[][] = [];
    private created: boolean = false;
    private ui!: UI;
    private moving?: {
        sprite: Phaser.GameObjects.Sprite;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        pointsX: number[];
        pointsY: number[];
        time: number;
        current: number;
    };
    private selectedArrow!: Phaser.GameObjects.Sprite;
    private isInMenuState: boolean = false;
    private hoveringUnit?: Unit;
    private healthSprite!: Phaser.GameObjects.Sprite;
    private healthNumber!: Phaser.GameObjects.Sprite;
    private steps!: Phaser.Sound.BaseSound;
    private jet!: Phaser.Sound.BaseSound;
    private helicopter?: Phaser.Sound.BaseSound;
    private tank?: Phaser.Sound.BaseSound;
    private currentSound?: Phaser.Sound.BaseSound;

    constructor() {
        super('InGame');
        state.scene = this;
    }

    preload() {
        this.load.image('tiles', 'assets/tilemap_packed.png');
        this.load.image('highlight', 'assets/highlight3.png');
        this.load.image('highlightAttack', 'assets/highlight_attack.png');
        this.load.image('fog', 'assets/fog.png');
        this.load.spritesheet('explosion', 'assets/explosion.png', { frameWidth: 20, frameHeight: 20 });
        this.load.spritesheet('uiTiles1', 'assets/UIpackSheet_transparent.png', { frameWidth: 16, frameHeight: 16, spacing: 2 });
        this.load.spritesheet('tiles2', 'assets/tilemap_packed.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'assets/test3.json');
        this.load.spritesheet('bigCursor', 'assets/big_cursor.png', { frameWidth: 200, frameHeight: 32 })

        this.load.audio('steps', ['assets/steps.ogg']);
        this.load.audio('jet', ['assets/jet.ogg']);
        this.load.audio('helicopter', ['assets/helicopter.ogg']);
        this.load.audio('tank', ['assets/tank.ogg']);
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
        this.cameras.main.setZoom(2).setScroll(-300, -200).setBounds(0, 0, map.widthInPixels, map.heightInPixels);

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
            const tileX = Math.floor(pointer.worldX / TILE_SIZE);
            const tileY = Math.floor(pointer.worldY / TILE_SIZE);
            this.updateHover(tileX, tileY);
            if (pointer.isDown) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            };
        });

        this.input.on('pointerdown', (pointer: {
            worldX: number;
            worldY: number;
            button: number;
        }) => {
            if (!isOurTurn()) {
                return;
            }
            const tileX = Math.floor(pointer.worldX / TILE_SIZE);
            const tileY = Math.floor(pointer.worldY / TILE_SIZE);
            switch (pointer.button) {
                case 0:
                    const unitAtPosition = this.findObjectAtPosition(tileX, tileY);
                    if (unitAtPosition && this.isSelectable(unitAtPosition)) {
                        this.placeCursorAtPosition(tileX, tileY);
                        this.selectUnit(unitAtPosition);
                    } else {
                        this.unselectUnit();
                        this.cursorSprite.setVisible(false);
                    }
                    break;
                case 2:
                    if (isMoveableUnit(state.selectedUnit)) {
                        const { finder, grid } = getPathFinder(state.selectedUnit, state.game?.matrix, state.game?.units, state.playerName);
                        if (this.canUnitAttack(state.selectedUnit, tileX, tileY, finder, grid)) {
                            client.send(new AttackUnitRequest(state.selectedUnit.id, tileX, tileY));
                        } else if (this.canUnitMoveTo(state.selectedUnit, tileX, tileY, true, finder, grid)) {
                            this.placeCursorAtPosition(tileX, tileY);
                            client.send(new MoveUnitRequest(state.selectedUnit.id, tileX, tileY));
                        }
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
            const tileX = Math.floor(this.cursorSprite.x / TILE_SIZE);
            const tileY = Math.floor(this.cursorSprite.y / TILE_SIZE);

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
                    if (this.isCaptureAvailable()) {
                        this.ui.submitCapture();
                    }
                    break;
                case ' ':
                    this.handleSelect(tileX, tileY);
                    break;
                case 'x':
                    this.unselectUnit();
                    break;
                case 'e':
                case 'Enter':
                    client.send(new EndTurn())
            }
        });


        this.buildingLayer = this.add.layer();
        this.highlightLayer = this.add.layer().setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
        this.unitLayer = this.add.layer();

        this.cursorLayer = this.add.layer();
        this.cursorSprite = this.add.sprite(state.cursorX * TILE_SIZE, state.cursorY * TILE_SIZE, 'tiles2', 61).setOrigin(0, 0);
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

        this.healthSprite = this.make.sprite({
            x: 0,
            y: 0,
            key: 'tiles2',
            frame: 195,
            origin: 0,
        }, false);
        this.cursorLayer.add(this.healthSprite);
        this.healthNumber = this.make.sprite({
            x: 0,
            y: 0,
            key: 'tiles2',
            frame: 181,
            origin: 0,
        }, false);
        this.cursorLayer.add(this.healthNumber);


        this.anims.create({
            key: 'explosion',
            frames: this.anims.generateFrameNumbers('explosion'),
            frameRate: 16,
        });


        this.steps = this.sound.add('steps', {
            loop: true,
        });
        this.jet = this.sound.add('jet', {
            loop: true,
        });
        this.helicopter = this.sound.add('helicopter', {
            loop: true,
        });
        this.tank = this.sound.add('tank', {
            loop: true,
        });

        this.created = true;
        this.updateGameState();
    }

    updateHover(tileX: number, tileY: number) {
        this.hoveringUnit = this.findObjectAtPosition(tileX, tileY);
        if (isMoveableUnit(this.hoveringUnit)) {
            const health = Math.round(this.hoveringUnit.health / this.hoveringUnit.maxHealth * 10);
            this.healthSprite.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10);
            this.healthNumber.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10).setFrame(180 + health);
        } else if (isBuilding(this.hoveringUnit)) {
            const health = Math.round(this.hoveringUnit.capturePoints / this.hoveringUnit.maxCapturePoints * 10);
            this.healthSprite.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10);
            this.healthNumber.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10).setFrame(180 + Math.round(this.hoveringUnit.capturePoints / this.hoveringUnit.maxCapturePoints * 10));
        } else {
            this.healthSprite.setVisible(false);
            this.healthNumber.setVisible(false);
        }
    }

    update(time: number, delta: number): void {
        if (this.moving) {
            this.moving.current += delta;
            if (this.moving.current > this.moving.time) {
                this.moving.current = this.moving.time;
            }
            const percent = this.moving.current / this.moving.time;
            const previousX = this.moving.sprite.x;
            const currentX = Phaser.Math.Interpolation.Linear(this.moving.pointsX, percent);
            const currentY = Phaser.Math.Interpolation.Linear(this.moving.pointsY, percent);
            if (currentX < previousX) {
                this.moving.sprite.setFlipX(true);
            } else if (currentX === previousX) {
                this.moving.sprite.setFlipX(this.moving.endX < this.moving.startX);
            } else {
                this.moving.sprite.setFlipX(false);
            }
            this.moving.sprite.setPosition(currentX, currentY);
            this.selectedArrow.setPosition(currentX, currentY - TILE_SIZE);
            if (percent >= 1) {
                this.moving = undefined;
                this.currentSound?.stop();
                client.send(new ReloadGameState());
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
        this.cursorSprite.setPosition(tileX * TILE_SIZE, tileY * TILE_SIZE);
        this.cursorSprite.setVisible(true);
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
        this.selectedArrow.setPosition(unit.x * TILE_SIZE, (unit.y - 1) * TILE_SIZE);
        this.selectedArrow.setVisible(true);
        if (this.isCaptureAvailable()) {
            this.ui.enableCaptureButton();
        } else {
            this.ui.disableCaptureButton();
        }
        this.updateHighlight();
    }

    private updateHighlight() {
        const children = this.highlightLayer.getChildren();
        while (children.length > 0) {
            children[0].destroy();
        }
        if (isMoveableUnit(state.selectedUnit)) {
            const { finder, grid } = getPathFinder(state.selectedUnit, state.game?.matrix, state.game?.units, state.playerName);
            for (let y = state.selectedUnit.y - state.selectedUnit.movementPoints; y <= state.selectedUnit.y + state.selectedUnit.movementPoints; y++) {
                for (let x = state.selectedUnit.x - state.selectedUnit.movementPoints; x <= state.selectedUnit.x + state.selectedUnit.movementPoints; x++) {
                    if (this.canUnitMoveTo(state.selectedUnit, x, y, true, finder, grid)) {
                        const sprite = this.make.sprite({
                            x: x * TILE_SIZE,
                            y: y * TILE_SIZE,
                            key: 'highlight',
                            origin: 0,
                        }, false);
                        this.highlightLayer.add(sprite);
                    }
                    if (this.canUnitAttack(state.selectedUnit, x, y, finder, grid)) {
                        const sprite = this.make.sprite({
                            x: x * TILE_SIZE,
                            y: y * TILE_SIZE,
                            key: 'highlightAttack',
                            origin: 0,
                        }, false);
                        this.highlightLayer.add(sprite);
                    }
                }
            }
        }
    }

    private canUnitMoveTo(unit: Unit, x: number, y: number, checkUnitAtPosition: boolean, finder: PF.AStarFinder, grid: PF.Grid) {
        if (!isMoveableUnit(unit)) {
            return false;
        }
        if (x < 0 || x >= (state.game?.width || 40)) {
            return false;
        }
        if (y < 0 || y >= (state.game?.height || 40)) {
            return false;
        }
        if (unit.x === x && unit.y === y) {
            return false;
        }
        if (checkUnitAtPosition) {
            const unitAtPosition = state.game?.units?.find(unit => unit.x === x && unit.y === y && isMoveableUnit(unit));
            if (unitAtPosition && unitAtPosition.id !== unit.id) {
                return false;
            }
        }
        const path = finder.findPath(unit.x, unit.y, x, y, grid.clone());
        path.shift();
        if (path.length > unit.movementPoints) {
            return false;
        }
        const lastPoint = path[path.length - 1];
        if (!lastPoint || lastPoint[0] !== x || lastPoint[1] !== y) {
            return false;
        }
        return true;
    }

    private canUnitAttack(unit: Unit, x: number, y: number, finder: PF.AStarFinder, grid: PF.Grid) {
        if (!isMoveableUnit(unit)) {
            return false;
        }
        const enemyUnit = state.game?.units?.find(unit => unit.x === x && unit.y === y && !this.isPlayersUnit(unit) && isMoveableUnit(unit));
        if (!enemyUnit) {
            return false;
        }
        return this.canUnitMoveTo(unit, x, y, false, finder, grid);
    }

    private unselectUnit() {
        const type = state.selectedUnit?.type;
        if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
            this.isInMenuState = false;
            this.ui.onProductionBuildingUnselected();
        }
        state.selectedUnit = undefined;
        this.selectedArrow.setVisible(false);
        this.updateHighlight();
        this.ui.disableCaptureButton();
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

        // Setup sprites
        const units = state.game?.units || [];
        for (const unit of units) {
            const existingSprite = this.getUnitSprite(unit);
            const playerColor = state.game.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
            const frame = UnitSprites[playerColor][unit.type] || 193;
            if (existingSprite) {
                existingSprite.setPosition(unit.x * TILE_SIZE, unit.y * TILE_SIZE);
                this.tintSprite(existingSprite, unit);

                if (isBuilding(unit)) {
                    existingSprite.setFrame(frame)
                }
            } else {
                const sprite = this.make.sprite({
                    x: unit.x * TILE_SIZE,
                    y: unit.y * TILE_SIZE,
                    key: 'tiles2',
                    frame,
                    origin: 0,
                }, false);
                sprite.setData('unit', unit.id);
                this.tintSprite(sprite, unit);
                if (isMoveableUnit(unit)) {
                    this.unitLayer.add(sprite);

                } else if (isBuilding(unit)) {
                    this.buildingLayer.add(sprite);
                } else {
                    logError(`Unknown unit type ${unit.type}`);
                }
            }
        }

        // Cull dead units
        for (const layer of [this.buildingLayer, this.unitLayer]) {
            const children = layer.getChildren();
            for (const child of children) {
                const unit = units.find(unit => unit.id === child.getData('unit'));
                if (!unit) {
                    child.destroy();
                }
            }
        }

        if (state.selectedUnit) {
            state.selectedUnit = units.find(unit => unit.id === state.selectedUnit?.id);
        }
        this.updateHighlight();
        if (this.isCaptureAvailable()) {
            this.ui.enableCaptureButton();
        } else {
            this.ui.disableCaptureButton();
        }

        if (!this.fogLayer) {
            this.fogLayer = this.add.layer().setAlpha(this.fogEnabled ? 1 : 0);
            this.fogSprites = [];
            for (let y = 0; y < state.game.height; y++) {
                const row = [];
                for (let x = 0; x < state.game.width; x++) {
                    const sprite = this.make.sprite({
                        x: x * TILE_SIZE,
                        y: y * TILE_SIZE,
                        key: 'fog',
                        origin: 0,
                    }, false);
                    row.push(sprite);
                    this.fogLayer.add(sprite);
                }
                this.fogSprites.push(row);
            }
        }
        this.updateFog();

        const tileX = Math.floor(this.input.mousePointer.worldX / TILE_SIZE);
        const tileY = Math.floor(this.input.mousePointer.worldY / TILE_SIZE);
        this.updateHover(tileX, tileY);
    }

    private tintSprite(sprite: Phaser.GameObjects.Sprite, unit: Unit) {
        // TODO check if they can shoot, check if they capture
        if (
            isMoveableUnit(unit)
            && (unit.movementPoints === 0 || unit.hasCommittedActions)
        ) {
            sprite.setTint(0x888888);
        } else {
            sprite.clearTint();
        }
    }

    private updateFog() {
        if (!state.game || !this.fogEnabled) {
            return;
        }
        for (let y = 0; y < state.game.height; y++) {
            for (let x = 0; x < state.game.width; x++) {
                let visible = false;
                for (const unit of state.game.units || []) {
                    if (unit.player !== state.playerName) {
                        continue;
                    }
                    const distance = Math.sqrt(Math.pow(unit.x - x, 2) + Math.pow(unit.y - y, 2));
                    if (distance <= 4) {
                        visible = true;
                        break;
                    }
                }
                const sprite = this.fogSprites[y][x];
                sprite.setVisible(!visible);
            }
        }
    }

    public isCaptureAvailable() {
        const unit = state.selectedUnit;
        if (!unit) return false
        const building = state.game?.units?.find(u => u.x === unit.x && u.y === unit.y && isBuilding(u));
        if ((unit.type == UnitType.INFANTRY || unit.type == UnitType.ANTI_TANK)
            && (building && building?.player !== state.playerName)) {
            return true;
        } else {
            return false;
        }
    }

    public handleMoveUnitResponse(event: MoveUnitResponse) {
        const unit = state.game?.units?.find(unit => unit.id === event.unitId);
        if (!isMoveableUnit(unit)) {
            return;
        }
        unit.movementPoints = event.remainingMovementPoints;
        const sprite = this.getUnitSprite(unit);
        if (unit.movementPoints === 0 && !this.isCaptureAvailable()) {
            this.unselectUnit();
        }

        if (!sprite) {
            return;
        }
        const pointsX = event.path.map(point => point[0] * TILE_SIZE);
        const pointsY = event.path.map(point => point[1] * TILE_SIZE);

        let movementSpeed = 4;
        switch (unit.type) {
            case UnitType.JET:
                movementSpeed = 10;
                break;
            case UnitType.HELICOPTER:
                movementSpeed = 7;
                break;
            case UnitType.TANK:
                movementSpeed = 5;
                break;
            default:
                movementSpeed = 4;
                break;
        }
        this.moving = {
            sprite,
            startX: unit.x,
            startY: unit.y,
            endX: event.path[event.path.length - 1][0],
            endY: event.path[event.path.length - 1][1],
            pointsX,
            pointsY,
            time: event.path.length * 1000 / movementSpeed,
            current: 0,
        }
        switch (unit.type) {
            case UnitType.INFANTRY:
            case UnitType.ANTI_TANK:
                this.currentSound = this.steps;
                break;
            case UnitType.JET:
                this.currentSound = this.jet;
                break;
            case UnitType.HELICOPTER:
                this.currentSound = this.helicopter;
                break;
            case UnitType.TANK:
                this.currentSound = this.tank;
                break;
            default:
                this.currentSound = undefined;
                break;
        }
        this.currentSound?.play();

        if (this.isCaptureAvailable()) {
            this.ui.enableCaptureButton();
        } else {
            this.ui.disableCaptureButton();
        }
    }

    public explode(x: number, y: number) {
        const explosion = this.make.sprite({
            x: x * TILE_SIZE,
            y: y * TILE_SIZE,
            key: 'explosion',
            origin: 0,
        }, false);
        explosion.play('explosion', true);
        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
        });
        this.cursorLayer.add(explosion);
    }
}