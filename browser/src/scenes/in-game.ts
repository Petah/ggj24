import Phaser from 'phaser';
import { client } from '../client';
import { TILE_SIZE, getPathFinder } from 'common/map';
import { MovableUnit, PlayerColor, Unit, UnitType, isBuilding, isFactory, isMoveableUnit } from 'common/unit';
import { PurchaseUnitRequest } from 'common/events/unit-purchase';
import { isOurTurn, state } from '../state';
import { UI } from './ui-scene';
import { AttackUnitRequest, EndTurn, MoveUnitRequest, MoveUnitResponse, ReloadGameState } from 'common/events/turn';
import { logError } from 'common/log';
import { UnitSprites } from '../unit-sprites';
import { GameState } from 'common/events/game-list';

export class InGame extends Phaser.Scene {
    private cursorLayer!: Phaser.GameObjects.Layer;
    private cursorSprite!: Phaser.GameObjects.Sprite;
    private buildingLayer!: Phaser.GameObjects.Layer;
    private unitLayer!: Phaser.GameObjects.Layer;
    private highlightLayer!: Phaser.GameObjects.Layer;
    private rangeCircle!: [Phaser.GameObjects.Arc, Phaser.GameObjects.Arc];
    private fogLayer!: Phaser.GameObjects.Layer;
    private fogEnabled: boolean = false;
    private fogSprites: Phaser.GameObjects.Sprite[][] = [];
    private created: boolean = false;
    private ui?: UI;
    private moving: {
        sprite: Phaser.GameObjects.Sprite;
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        pointsX: number[];
        pointsY: number[];
        time: number;
        current: number;
        game: GameState;
    }[] = [];
    private selectedArrow!: Phaser.GameObjects.Sprite;
    private isInMenuState: boolean = false;
    private hoveringUnit?: Unit;
    private healthSprite!: Phaser.GameObjects.Sprite;
    private captureSprite!: Phaser.GameObjects.Sprite;
    private healthNumber!: Phaser.GameObjects.Sprite;
    private captureNumberOne!: Phaser.GameObjects.Sprite;
    private captureNumberTwo!: Phaser.GameObjects.Sprite;
    private steps!: Phaser.Sound.BaseSound;
    private jet!: Phaser.Sound.BaseSound;
    private helicopter?: Phaser.Sound.BaseSound;
    private tank?: Phaser.Sound.BaseSound;
    private capture?: Phaser.Sound.BaseSound;
    private tankShot?: Phaser.Sound.BaseSound;
    private machineGun?: Phaser.Sound.BaseSound;
    private currentSound?: Phaser.Sound.BaseSound;
    private backgroundMusic?: Phaser.Sound.BaseSound;

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
        this.load.spritesheet('kennyTinyBattle', 'maps/assets/kenny-tiny-battle.png', { frameWidth: 16, frameHeight: 16 });
        this.load.tilemapTiledJSON('map', 'maps/map-debug.json');
        this.load.spritesheet('bigCursor', 'assets/big_cursor.png', { frameWidth: 200, frameHeight: 32 });

        this.load.audio('steps', ['sounds/steps.ogg']);
        this.load.audio('jet', ['sounds/jet.ogg']);
        this.load.audio('helicopter', ['sounds/helicopter.ogg']);
        this.load.audio('tank', ['sounds/tank.ogg']);
        this.load.audio('backgroundMusic', ['sounds/country-rock.mp3']);
        this.load.audio('capture', ['sounds/capture.mp3']);
        this.load.audio('tankShot', ['sounds/tank-shot.ogg']);
        this.load.audio('machineGun', ['sounds/machine-gun.ogg']);
    }

    create() {
        this.scale.setGameSize(window.innerWidth, window.innerHeight);
        this.scene.launch('UI');
        this.ui = this.scene.manager.getScene('UI') as UI;

        this.add.tileSprite(-1000, -1000, 2000, 2000, 'kennyTinyBattle', 37).setOrigin(0, 0);

        const map = this.make.tilemap({ key: 'map' });
        const tilesetName = map.tilesets[0].name;
        // add the tileset image we are using
        const tileset = map.addTilesetImage(tilesetName, 'tiles') as Phaser.Tilemaps.Tileset;

        map.createLayer('Map', tileset);
        this.cameras.main.setZoom(2).setScroll(map.widthInPixels / 2 - (window.innerWidth - 150) / 2, map.heightInPixels / 2 - window.innerHeight / 2);
        this.cameras.main.setBounds(-map.widthInPixels / 2, -map.heightInPixels / 2, map.widthInPixels + 300 * (1 / this.cameras.main.zoom) + map.widthInPixels, map.heightInPixels * 2)


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
            // this.cameras.main.setBounds(0, 0, map.widthInPixels + 300 * (1 / this.cameras.main.zoom), map.heightInPixels)
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
                        const { finder, grid } = getPathFinder(state.selectedUnit, state.game?.tiles, state.game?.units, state.playerName);
                        if (this.canUnitAttack(state.selectedUnit, tileX, tileY)) {
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
                        this.ui?.movePurchaseCursorUp();
                        break;
                    case 'ArrowDown':
                        this.ui?.movePurchaseCursorDown();
                        break;
                    case 'x':
                        this.unselectUnit();
                        break;
                    case 'c':
                    case ' ':
                        client.send(new PurchaseUnitRequest(state.selectedUnit.id, this.ui.getSelectedUnitTypeFromPurchaseList()));
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
                    if (this.isCaptureAvailable(state.selectedUnit)) {
                        this.ui?.submitCapture();
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
                    client.send(new EndTurn());
            }
        });


        this.buildingLayer = this.add.layer();
        this.highlightLayer = this.add.layer().setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.5);
        this.rangeCircle = [
            this.add.circle(0, 0, 100, 0x000000, 0.5).setFillStyle(0x000000, 0).setStrokeStyle(2, 0xff0000, 0.2).setVisible(false),
            this.add.circle(0, 0, 100, 0x000000, 0.5).setFillStyle(0x000000, 0).setStrokeStyle(2, 0xff0000, 0.2).setVisible(false),
        ];
        this.unitLayer = this.add.layer();

        this.cursorLayer = this.add.layer();
        this.cursorLayer.add(this.cursorSprite = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 61, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.selectedArrow = this.make.sprite({ x: 0, y: 0, key: 'uiTiles1', frame: 715, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.healthSprite = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 61, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.captureSprite = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 194, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.healthNumber = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 181, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.captureNumberOne = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 181, origin: 0 }, false).setVisible(false));
        this.cursorLayer.add(this.captureNumberTwo = this.make.sprite({ x: 0, y: 0, key: 'kennyTinyBattle', frame: 181, origin: 0 }, false).setVisible(false));

        this.anims.create({
            key: 'explosion',
            frames: this.anims.generateFrameNumbers('explosion'),
            frameRate: 16,
        });

        this.anims.create({
            key: 'greenCapture',
            frames: this.anims.generateFrameNumbers('kennyTinyBattle', { start: 34, end: 35 }),
            frameRate: 8,
            repeat: 5,
        });

        this.anims.create({
            key: 'redCapture',
            frames: this.anims.generateFrameNumbers('kennyTinyBattle', { start: 70, end: 71 }),
            frameRate: 8,
            repeat: 5,
        });

        this.anims.create({
            key: 'blueCapture',
            frames: this.anims.generateFrameNumbers('kennyTinyBattle', { start: 52, end: 53 }),
            frameRate: 8,
            repeat: 5,
        });

        this.anims.create({
            key: 'yellowCapture',
            frames: this.anims.generateFrameNumbers('kennyTinyBattle', { start: 88, end: 89 }),
            frameRate: 8,
            repeat: 5,
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
        this.capture = this.sound.add('capture', {
            loop: false,
        });
        this.tankShot = this.sound.add('tankShot', {
            loop: false,
        });
        this.machineGun = this.sound.add('machineGun', {
            loop: false,
        });
        this.backgroundMusic = this.sound.add('backgroundMusic', {
            loop: true,
            volume: 0.05,
        });
        this.backgroundMusic.play();

        this.created = true;
        client.send(new ReloadGameState());
    }

    // TODO
    updateHover(tileX: number, tileY: number) {
        this.hoveringUnit = this.findObjectAtPosition(tileX, tileY);
        const buildingAtPosition = state.game?.units?.find(unit => unit.x === tileX && unit.y === tileY && isBuilding(unit));

        if (isMoveableUnit(this.hoveringUnit)) {
            const health = Math.round(Math.max(this.hoveringUnit.health / this.hoveringUnit.maxHealth * 10, 1));
            this.healthSprite.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10);
            this.healthNumber.setPosition(tileX * TILE_SIZE, (tileY - 1) * TILE_SIZE).setVisible(health < 10).setFrame(180 + health);
        } else {
            this.healthSprite.setVisible(false);
            this.healthNumber.setVisible(false);
        }

        if (isBuilding(buildingAtPosition)) {
            const health = Math.round(buildingAtPosition.capturePoints);
            // const health = Math.round(buildingAtPosition.capturePoints / buildingAtPosition.maxCapturePoints * 10);
            this.captureSprite.setPosition((tileX + 1) * TILE_SIZE, (tileY) * TILE_SIZE).setVisible(health < 20);
            this.captureNumberOne.setPosition((tileX + 1) * TILE_SIZE, (tileY) * TILE_SIZE).setVisible(health < 20 && health >= 10).setFrame(180 + (health / 10));
            this.captureNumberTwo.setPosition(((tileX + 1) * TILE_SIZE) + 4, (tileY) * TILE_SIZE).setVisible(health < 20).setFrame(180 + (health % 10));
        } else {
            this.captureSprite.setVisible(false);
            this.captureNumberOne.setVisible(false);
            this.captureNumberTwo.setVisible(false);
        }
    }

    update(time: number, delta: number): void {
        for (let i = 0; i < this.moving.length; i++) {
            const moving = this.moving[i];
            moving.current += delta;
            if (moving.current > moving.time) {
                moving.current = moving.time;
            }
            const percent = moving.current / moving.time;
            const previousX = moving.sprite.x;
            const currentX = Phaser.Math.Interpolation.Linear(moving.pointsX, percent);
            const currentY = Phaser.Math.Interpolation.Linear(moving.pointsY, percent);
            if (currentX < previousX) {
                moving.sprite.setFlipX(true);
            } else if (currentX === previousX) {
                moving.sprite.setFlipX(moving.endX < moving.startX);
            } else {
                moving.sprite.setFlipX(false);
            }
            moving.sprite.setPosition(currentX, currentY);
            this.selectedArrow.setPosition(currentX, currentY - TILE_SIZE);
            if (percent >= 1) {
                this.moving.splice(i, 1);
                if (this.moving.length === 0) {
                    this.updateGameState(moving.game);
                    this.currentSound?.stop();
                }
            }
        }
    }

    onCursorPositionUpdate(tileX: number, tileY: number) {
        // this.updateHover(tileX, tileY);
    }

    findObjectAtPosition(tileX: number, tileY: number) {
        const units: Unit[] = [];
        for (const unit of state.game?.units || []) {
            if (unit.x === tileX && unit.y === tileY) {
                // @ts-ignore
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
        this.onCursorPositionUpdate(tileX, tileY);
    }

    private isPlayersUnit(unit: Unit) {
        return unit.player === state.playerName;
    }

    private handleSelect(tileX: number, tileY: number) {
        const unit = this.findObjectAtPosition(tileX, tileY);
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
        return true;
        // if (!this.isPlayersUnit(unit)) {
        //     return false;
        // }
        // return isFactory(unit) || isMoveableUnit(unit);
    }

    public selectUnit(unit?: Unit) {
        if (!this.isSelectable(unit)) {
            return;
        }
        if (state.selectedUnit) {
            this.unselectUnit();
        }
        state.selectedUnit = unit;
        if (isFactory(unit) && unit.player === state.playerName) {
            this.isInMenuState = true;
            this.ui?.onProductionBuildingSelected(unit);
        }
        this.selectedArrow.setPosition(unit.x * TILE_SIZE, (unit.y - 1) * TILE_SIZE);
        this.selectedArrow.setVisible(true);
        if (this.isCaptureAvailable(state.selectedUnit)) {
            this.ui?.enableCaptureButton();
        } else {
            this.ui?.disableCaptureButton();
        }
        this.updateHighlight();
    }

    private updateHighlight() {
        const children = this.highlightLayer.getChildren();
        while (children.length > 0) {
            children[0].destroy();
        }

        if (isMoveableUnit(state.selectedUnit) && state.selectedUnit.maxRange > 1) {
            const x = state.selectedUnit.x * TILE_SIZE + TILE_SIZE / 2;
            const y = state.selectedUnit.y * TILE_SIZE + TILE_SIZE / 2;
            this.rangeCircle[0].setPosition(x, y).setRadius(state.selectedUnit.minRange * TILE_SIZE);
            this.rangeCircle[1].setPosition(x, y).setRadius(state.selectedUnit.maxRange * TILE_SIZE);
            this.rangeCircle[0].setVisible(state.selectedUnit.minRange > 1);
            this.rangeCircle[1].setVisible(true);
        } else {
            this.rangeCircle[0].setVisible(false);
            this.rangeCircle[1].setVisible(false);
        }
        if (isMoveableUnit(state.selectedUnit)) {
            const { finder, grid } = getPathFinder(state.selectedUnit, state.game?.tiles, state.game?.units, state.selectedUnit.player);
            for (let y = state.selectedUnit.y - state.selectedUnit.movementPoints; y <= state.selectedUnit.y + state.selectedUnit.movementPoints; y++) {
                for (let x = state.selectedUnit.x - state.selectedUnit.movementPoints; x <= state.selectedUnit.x + state.selectedUnit.movementPoints; x++) {
                    if ((x === state.selectedUnit.x && y === state.selectedUnit.y && state.selectedUnit.movementPoints > 0) || this.canUnitMoveTo(state.selectedUnit, x, y, true, finder, grid)) {
                        const sprite = this.make.sprite({
                            x: x * TILE_SIZE,
                            y: y * TILE_SIZE,
                            key: 'highlight',
                            origin: 0,
                        }, false);
                        this.highlightLayer.add(sprite);
                    }
                    if (this.canUnitAttack(state.selectedUnit, x, y)) {
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

    private canUnitMoveTo(unit: Unit, x: number, y: number, checkUnitAtPosition: boolean, finder: any, grid: any) {
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

    private canUnitAttack(unit: Unit, x: number, y: number) {
        if (!isMoveableUnit(unit) || unit.hasCommittedActions) {
            return false;
        }
        if (unit.type == UnitType.ROCKET_TRUCK && (unit as MovableUnit).movementPoints != (unit as MovableUnit).maxMovementPoints) {
            return false;
        }

        const enemyUnit = state.game?.units?.find(u => u.x === x && u.y === y && u.player !== unit.player && isMoveableUnit(u));
        if (!enemyUnit || (unit.type == UnitType.ROCKET_TRUCK) && (enemyUnit.type == UnitType.JET || enemyUnit.type == UnitType.HELICOPTER || enemyUnit.type == UnitType.TRANSPORT)) {
            return false;
        }
        const distance = Math.sqrt(Math.pow(unit.x - x, 2) + Math.pow(unit.y - y, 2));
        if (distance < unit.minRange || distance > unit.maxRange) {
            return false;
        }
        return true;
    }

    private unselectUnit() {
        const type = state.selectedUnit?.type;
        if (type === UnitType.FACTORY || type === UnitType.AIRPORT || type === UnitType.DOCK) {
            this.isInMenuState = false;
            this.ui?.onProductionBuildingUnselected();
        }
        state.selectedUnit = undefined;
        this.selectedArrow.setVisible(false);
        this.updateHighlight();
        this.ui?.disableCaptureButton();
    }

    private getUnitSprite(unit: Unit) {
        for (const layer of [this.buildingLayer, this.unitLayer]) {
            const sprite = layer.getChildren().find(child => child.getData('unit') === unit.id) as Phaser.GameObjects.Sprite | undefined;
            if (sprite) {
                return sprite;
            }
        }
    }

    public updateGameState(game: GameState) {
        if (state.latestGameState && game.tick < state.latestGameState.tick) {
            return this.updateGameState(state.latestGameState);
        }
        console.log('updateGameState', game)
        if (!state.latestGameState || game.tick > state.latestGameState.tick) {
            state.latestGameState = game;
        }
        if (!this.created || state.tick > game.tick || this.moving.length) {
            return;
        }
        state.game = game;
        state.tick = game.tick;

        const remainingPlayers = game.players.filter(player => !player.hasLost);
        if (remainingPlayers.length === 1 && game.players.length > 1) {
            state.winningPlayer = remainingPlayers[0].name;
            this.scene.start('EndGame');
            return;
        }

        this.ui?.updateGameState();

        if (!isOurTurn()) {
            this.unselectUnit();
        }

        // Setup sprites
        const units = game?.units || [];
        console.log('units', units)
        for (const unit of units) {
            const existingSprite = this.getUnitSprite(unit);
            const playerColor = game.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
            const frame = UnitSprites[playerColor][unit.type] || 193;
            if (existingSprite) {
                existingSprite.setPosition(unit.x * TILE_SIZE, unit.y * TILE_SIZE);
                this.tintSprite(existingSprite, unit);

                if (isBuilding(unit)) {
                    existingSprite.setFrame(frame);
                }
            } else {
                const sprite = this.make.sprite({
                    x: unit.x * TILE_SIZE,
                    y: unit.y * TILE_SIZE,
                    key: 'kennyTinyBattle',
                    frame,
                    origin: 0,
                }, false);
                sprite.setData('unit', unit.id);
                sprite.setFlipX(unit.x > game.width / 2);
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
            let foundUnit: boolean;
            do {
                foundUnit = false;
                for (const child of children) {
                    const unit = units.find(unit => unit.id === child.getData('unit'));
                    if (!unit) {
                        child.destroy();
                        foundUnit = true;
                        break;
                    }
                }
            } while (foundUnit);
        }

        if (state.selectedUnit) {
            state.selectedUnit = units.find(unit => unit.id === state.selectedUnit?.id);
        }
        this.updateHighlight();
        if (this.isCaptureAvailable(state.selectedUnit)) {
            this.ui?.enableCaptureButton();
        } else {
            this.ui?.disableCaptureButton();
        }

        if (!this.fogLayer) {
            this.fogLayer = this.add.layer().setAlpha(this.fogEnabled ? 1 : 0);
            this.fogSprites = [];
            for (let y = 0; y < game.height; y++) {
                const row: Phaser.GameObjects.Sprite[] = [];
                for (let x = 0; x < game.width; x++) {
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
        if (!isMoveableUnit(unit)) {
            return;
        }
        if (unit.hasCommittedActions || unit.movementPoints === 0) {
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

    public isCaptureAvailable(unit?: Unit) {
        if (!unit || !unit.canCapture) {
            return false;
        }
        const building = state.game?.units?.find(u => u.x === unit.x && u.y === unit.y && isBuilding(u) && u.player !== state.playerName);
        if (building) {
            return true;
        }
        return false;
    }

    public handleMoveUnitResponse(event: MoveUnitResponse) {
        const unit = state.game?.units?.find(unit => unit.id === event.unitId);
        if (!isMoveableUnit(unit)) {
            return;
        }
        unit.movementPoints = event.remainingMovementPoints;
        const sprite = this.getUnitSprite(unit);
        const end = event.path[event.path.length - 1];
        const buildingAtEnd = state.game?.units?.find(unit => unit.x === end[0] && unit.y === end[1] && isBuilding(unit));
        if (unit.movementPoints === 0 && !buildingAtEnd) {
            this.unselectUnit();
        }

        if (!sprite) {
            return;
        }
        const pointsX = event.path.map(point => point[0] * TILE_SIZE);
        const pointsY = event.path.map(point => point[1] * TILE_SIZE);

        this.moving.push({
            sprite,
            startX: unit.x,
            startY: unit.y,
            endX: event.path[event.path.length - 1][0],
            endY: event.path[event.path.length - 1][1],
            pointsX,
            pointsY,
            time: event.path.length * 1000 / unit.maxMovementPoints,
            current: 0,
            game: event.game,
        });
        this.rangeCircle[0].setVisible(false);
        this.rangeCircle[1].setVisible(false);
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
            case UnitType.APC:
            case UnitType.ROCKET_TRUCK:
            case UnitType.TANK:
                this.currentSound = this.tank;
                break;
            default:
                this.currentSound = undefined;
                break;
        }
        this.currentSound?.play();

        if (this.isCaptureAvailable(state.selectedUnit)) {
            this.ui?.enableCaptureButton();
        } else {
            this.ui?.disableCaptureButton();
        }
    }

    public explode(x: number, y: number, attackingUnitType: UnitType) {
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

        switch (attackingUnitType) {
            case UnitType.TANK:
            case UnitType.ROCKET_TRUCK:
            case UnitType.JET:
                this.tankShot?.play();
                break;
            case UnitType.APC:
            case UnitType.INFANTRY:
            case UnitType.ANTI_TANK:
            case UnitType.HELICOPTER:
                this.machineGun?.play();
                break;
        }
    }

    public playCaptureAnimation() {
        const unit = state.selectedUnit;
        if (!unit) {
            return;
        }

        const unitColor = state.game?.players.find(player => player.name === unit.player)?.color || PlayerColor.NEUTRAL;
        let anim: string = '';
        switch (unitColor) {
            case PlayerColor.GREEN:
                anim = 'greenCapture';
                break;
            case PlayerColor.RED:
                anim = 'redCapture';
                break;
            case PlayerColor.BLUE:
                anim = 'blueCapture';
                break;
            case PlayerColor.YELLOW:
                anim = 'yellowCapture';
                break;
        }

        const explosion = this.make.sprite({
            x: unit.x * TILE_SIZE,
            y: unit.y * TILE_SIZE,
            key: anim,
            origin: 0,
        }, false);
        explosion.play(anim, true);
        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
        });
        this.cursorLayer.add(explosion);

        this.currentSound = this.capture;
        this.currentSound?.play();
    }
}