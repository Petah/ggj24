import { APC, Airport, AntiTank, Building, City, Dock, Factory, HQ, Helicopter, Infantry, Jet, Lander, MovableUnit, PlayerColor, PlayerColors, RocketTruck, Ship, Tank, Unit, UnitType, getDamageAmount, isBuilding, isMoveableUnit } from 'common/unit';
import { AttackUnitResponse, CaptureResponse, GameStateUpdate, MoveUnitResponse, WaitResponse } from 'common/events/turn';
import { GameError } from './error';
import { GameState, TileType } from 'common/events/game-list';
import { generateId } from './id';
import { IClient } from 'common/client';
import { IEvent } from 'common/event';
import { logError, logInfo } from 'common/log';
import { Player } from './player';
import { PurchaseUnitResponse } from 'common/events/unit-purchase';
import { readFile } from 'fs/promises';
import { TILE_SIZE, getPathFinder } from 'common/map';
import { TileMap } from './tiled';

export class Game {
    public players: Player[] = [];
    public started: boolean = false;
    public turn: number = 0;
    public tick: number = 1;
    public currentPlayer?: Player;
    public units: Unit[] = [];
    public tiles: TileType[][] = [];
    public mapWidth: number = 0;
    public mapHeight: number = 0;

    constructor(
        public name: string,
    ) {
    }

    public addPlayer(playerName: string, client: IClient) {
        const existingPlayer = this.players.find(player => player.name === playerName);
        if (existingPlayer) {
            existingPlayer.client = client;
        } else {
            if (this.players.length >= 4) {
                throw new GameError('Game is full');
            }
            const nextColor = PlayerColors.find(color => !this.players.find(player => player.color === color)) as PlayerColor;
            this.players.push(new Player(playerName, client, nextColor));
        }
    }

    public async start() {
        if (this.started) {
            throw new GameError('Game already started');
        }
        this.started = true;
        this.turn = 1;
        this.currentPlayer = this.players[0];

        const tileMapData = await readFile('../browser/public/assets/test3.json', 'utf-8');
        const tileMap: TileMap = JSON.parse(tileMapData);
        const layer = tileMap.layers.find(layer => layer.name === 'Data');
        if (!layer) {
            throw new Error('Map layer not found');
        }
        const tiles: TileType[][] = [];
        for (let y = 0; y < tileMap.height; y++) {
            const row: TileType[] = [];
            for (let x = 0; x < tileMap.width; x++) {
                const tile = layer.data[y * tileMap.width + x];
                switch (tile) {
                    case 0:
                        row.push(TileType.WATER);
                        break;
                    case 181:
                        row.push(TileType.ROAD);
                        break;
                    case 182:
                        row.push(TileType.GRASS);
                        break;
                    case 183:
                        row.push(TileType.MOUNTAIN);
                        break;
                    case 184:
                        row.push(TileType.RIVER);
                        break;
                    case 185:
                        row.push(TileType.FOREST);
                        break;
                    default:
                        logError('Tile not found', x, y, tile);
                }
            }
            // @ts-ignore
            tiles.push(row);
        }
        const objectLayer = tileMap.layers.find(layer => layer.name === 'Towns');
        for (const gameObject of objectLayer?.objects || []) {
            const owner = gameObject.properties?.find(property => property.name === 'owner')?.value as PlayerColor;
            const player = this.players.find(player => player.color === owner);

            const x = Math.round(gameObject.x / TILE_SIZE);
            const y = Math.round(gameObject.y / TILE_SIZE) - 1;
            if (x < 0 || x >= tileMap.width || y < 0 || y >= tileMap.height) {
                logError('Object out of bounds', gameObject, x, y);
                continue;
            }

            let unit: Unit | undefined;
            switch (gameObject.type) {
                case UnitType.HQ:
                    unit = new HQ(generateId(), x, y, player?.name);
                    break;
                case UnitType.CITY:
                    unit = new City(generateId(), x, y, player?.name);
                    break;
                case UnitType.DOCK:
                    unit = new Dock(generateId(), x, y, player?.name);
                    break;
                case UnitType.FACTORY:
                    unit = new Factory(generateId(), x, y, player?.name);
                    break;
                case UnitType.INFANTRY:
                    unit = new Infantry(generateId(), x, y, player?.name);
                    break;
                case UnitType.AIRPORT:
                    unit = new Airport(generateId(), x, y, player?.name);
                    break;
                default:
                    logError('Unknown game object type', gameObject.type);
                    break;
            }
            if (unit) {
                this.units.push(unit);
            }
        }
        this.mapWidth = tileMap.width;
        this.mapHeight = tileMap.height;
        this.tiles = tiles;

        this.setupTurn(this.currentPlayer);
    }

    public endTurn() {
        console.log('--------------------------------')
        const currentPlayerIndex = this.players.indexOf(this.currentPlayer!);
        if (currentPlayerIndex === this.players.length - 1) {
            this.turn++;
            this.currentPlayer = this.players[0];
            logInfo('New turn', this.turn, this.currentPlayer?.name);
        } else {
            this.currentPlayer = this.players[currentPlayerIndex + 1];
            logInfo('Next player', this.turn, this.currentPlayer?.name);
        }
        this.setupTurn(this.currentPlayer);
    }

    private setupTurn(player: Player) {
        // Give players money
        const buildings = this.units.filter((unit: Unit) => unit instanceof Building && unit.player === player.name && unit.income) as Building[];
        const income = buildings.map(building => building.income).reduce((total, income) => total + income, 0);
        player.money += income;
        logInfo('Player money', player.name, player.money);

        // Set movement points
        for (const unit of this.units) {
            if (unit instanceof MovableUnit && unit.player === player.name) {
                unit.movementPoints = unit.maxMovementPoints;
                unit.hasCommittedActions = false;
            }
        }
    }

    public moveUnit(unitId: number, x: number, y: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId);
        if (!(unit instanceof MovableUnit)) {
            throw new GameError('Unit is not movable');
        }
        if (unit.movementPoints <= 0) {
            throw new GameError('Unit does not have enough movement points');
        }

        const { finder, grid } = getPathFinder(unit, this.tiles, this.units, this.currentPlayer?.name);
        const path = finder.findPath(unit.x, unit.y, x, y, grid);
        // Clone path for movement animation
        const clonePath = [...path];
        // Remove first entry, which is the current position
        path.shift();
        if (path.length <= 0) {
            throw new GameError('No path found');
        }
        if (path.length > unit.movementPoints) {
            path.splice(unit.movementPoints);
            clonePath.splice(unit.movementPoints + 1);
        }
        const lastPathEntry = path[path.length - 1];

        const unitAtPosition = this.units.find(unit => unit.x === lastPathEntry[0] && unit.y === lastPathEntry[1] && isMoveableUnit(unit));
        // @todo handle transports
        if (unitAtPosition) {
            throw new GameError('Unit already at position');
        }

        unit.x = lastPathEntry[0];
        unit.y = lastPathEntry[1];
        unit.movementPoints -= path.length;

        // Refresh capture points if moving off of building
        const buildingAtPosition = this.units.find(u => unit.x === u.x && unit.y === u.y && u instanceof Building) as Building | undefined;
        if (buildingAtPosition) {
            buildingAtPosition.capturePoints = buildingAtPosition?.maxCapturePoints;
        }

        return new MoveUnitResponse(unitId, clonePath, unit.movementPoints, this.serialize());
    }

    public captureBuilding(unitId: number, x: number, y: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId) as { unit: MovableUnit; player: Player };
        const building = this.units.find(unit => unit.x === x && unit.y === y && unit instanceof Building) as Building;
        const originalOwner = building.player;
        if (building.player == unit.player) {
            throw new GameError('Cannot capture own buildings');
        }

        if (!unit.canCapture) {
            throw new GameError('Unit cannot capture');
        }

        if (unit.hasCommittedActions) {
            throw new GameError('Unit has already committed actions');
        }

        const unitCaptureValue = Math.max(unit.health / 10, 1);
        building.capturePoints -= unitCaptureValue;

        if (building.capturePoints <= 0) {
            building.player = unit.player;
            if (originalOwner
                && building.type == UnitType.HQ
                && building.capturePoints <= 0
            ) {
                this.units = this.units.filter(unit => {
                    if (!isBuilding(unit) && unit.player == originalOwner) {
                        return false;
                    } else {
                        return true;
                    }
                });
                for (const item of this.units) {
                    if (item.player == originalOwner) {
                        if (item instanceof Building) {
                            item.capturePoints = 20;
                            item.player = undefined;
                        }
                    }
                }
                const player = this.players.find(player => player.name === originalOwner);
                if (player) {
                    player.hasLost = true;
                }
            }
            building.capturePoints = 20;
        }

        unit.hasCommittedActions = true;
        unit.movementPoints = 0;

        return new CaptureResponse(building.x, building.y, this.serialize());
    }

    public buildUnit(buildingId: number, unitType: UnitType.INFANTRY | UnitType.TANK | UnitType.SHIP | UnitType.JET | UnitType.ANTI_TANK | UnitType.APC | UnitType.HELICOPTER | UnitType.LANDER): PurchaseUnitResponse {
        const { player, unit } = this.getPlayerUnit(buildingId);
        const unitsAvailable = {
            [UnitType.INFANTRY]: Infantry,
            [UnitType.HELICOPTER]: Helicopter,
            [UnitType.ANTI_TANK]: AntiTank,
            [UnitType.APC]: APC,
            [UnitType.TANK]: Tank,
            [UnitType.SHIP]: Ship,
            [UnitType.JET]: Jet,
            [UnitType.LANDER]: Lander,
            [UnitType.ROCKET_TRUCK]: RocketTruck,
        };
        const building = unit as Building;
        if (!building.canBuild.includes(unitType)) {
            throw new GameError('Building cannot build this unit');
        }
        if (!unitsAvailable[unitType]) {
            throw new GameError('Unit type not found');
        }
        if (player.money < unitsAvailable[unitType].cost) {
            throw new GameError('Player does not have enough money');
        }
        const unitOnTop = this.units.find(unit => unit.x === building.x && unit.y === building.y && unit.id !== building.id);
        if (unitOnTop) {
            throw new GameError('Unit already on top of building');
        }
        player.money -= unitsAvailable[unitType].cost;
        const newUnit = new unitsAvailable[unitType](generateId(), building.x, building.y, player.name);
        newUnit.movementPoints = 0;
        newUnit.hasCommittedActions = true;
        this.units.push(newUnit);
        logInfo('Building unit', player.name, newUnit.type);
        return new PurchaseUnitResponse(newUnit.id, this.serialize());
    }

    public attackUnit(unitId: number, x: number, y: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId);
        if (!(unit instanceof MovableUnit)) {
            throw new GameError('Unit is not movable');
        }
        // @todo allow attacking with 0 if in range and has not made action
        // if (unit.movementPoints <= 0) {
        //     throw new GameError('Unit does not have enough movement points');
        // }
        const unitAtPosition = this.units.find(unit => unit.x === x && unit.y === y && isMoveableUnit(unit));
        if (!unitAtPosition) {
            throw new GameError('No unit at position');
        }
        if (unitAtPosition.player === unit.player) {
            throw new GameError('Cannot attack own units');
        }
        if (!(unitAtPosition instanceof MovableUnit)) {
            throw new GameError('Cannot attack buildings');
        }
        // if (unitAtPosition instanceof MovableUnit && unitAtPosition.movementPoints <= 0) {
        //     throw new GameError('Unit cannot move');
        // }
        // if (unitAtPosition instanceof MovableUnit && unitAtPosition.hasCommittedActions) {
        //     throw new GameError('Unit already committed actions');
        // }
        unit.movementPoints = 0;
        unit.hasCommittedActions = true;
        unitAtPosition.health -= getDamageAmount(unit, unitAtPosition);
        if (unitAtPosition.health <= 0) {
            this.units = this.units.filter(unit => unit.id !== unitAtPosition.id);
        }
        return new AttackUnitResponse(unitAtPosition.x, unitAtPosition.y, unit.type, this.serialize());
    }

    public wait(unitId: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId);
        if (!(unit instanceof MovableUnit)) {
            throw new GameError('Unit is not movable');
        }
        unit.movementPoints = 0;
        unit.hasCommittedActions = true;
        return new WaitResponse(this.serialize());
    }

    private getPlayerUnit(unitId: number) {
        this.assertStarted();
        const unit = this.units.find(unit => unit.id === unitId);
        if (!unit) {
            throw new GameError('Unit not found');
        }
        if (unit.player !== this.currentPlayer?.name) {
            throw new GameError('Unit does not belong to current player');
        }
        const player = this.players.find(player => player.name === unit.player);
        if (!player) {
            throw new GameError('Player not found');
        }
        return { player, unit };
    }

    private assertStarted() {
        if (!this.started) {
            throw new GameError('Game not started');
        }
    }

    public broadcast(event: IEvent) {
        logInfo('Broadcasting event to game', this.name, event.type);
        for (const player of this.players) {
            player.client?.send(event);
        }
    }

    public broadcastGameState(): GameStateUpdate {
        return new GameStateUpdate(this.serialize());
    }

    public serialize(): GameState {
        return {
            tick: this.tick++,
            name: this.name,
            players: this.players.map(player => ({
                name: player.name,
                color: player.color,
                money: player.money,
                hasLost: player.hasLost,
            })),
            width: this.mapWidth,
            height: this.mapHeight,
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
            tiles: this.tiles,
            units: this.units,
            started: this.started,
        };
    }
}
