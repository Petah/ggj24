import { Client } from './client';
import { IEvent } from '../../common/event';
import { logError, logInfo } from '../../common/log';
import { Player } from './player';
import { GameState } from './events/game-list';
import { AttackUnitResponse, CaptureResponse, GameStateUpdate, MoveUnitResponse } from '../../common/events/turn';
import { GameError } from './error';
import { readFile } from 'fs/promises';
import { GameMap } from './game-map';
import { TileMap } from './tiled';
import { TileType } from '../../common/events/game-list';
import { APC, Airport, AntiTank, Building, City, Dock, Factory, HQ, Helicopter, Infantry, Jet, Lander, MovableUnit, PlayerColor, PlayerColors, Ship, Tank, Unit, UnitType, getDamageAmount, isMoveableUnit } from '../../common/unit';
import { TILE_SIZE } from '../../common/map';
import { generateId } from './id';
import { PurchaseUnitResponse } from '../../common/events/unit-purchase';

export class Game {
    public players: Player[] = [];
    public started: boolean = false;
    public turn: number = 0;
    public currentPlayer?: Player;
    public gameMap!: GameMap;
    public units: Unit[] = [];

    constructor(
        public name: string,
    ) {
    }

    public addPlayer(playerName: string, client?: Client) {
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
            const row = [];
            for (let x = 0; x < tileMap.width; x++) {
                const tile = layer.data[y * tileMap.width + x];
                switch (tile) {
                    case 0:
                        row.push(TileType.WATER);
                        // row.push(`${TileType.WATER}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
                        break;
                    case 181:
                        row.push(TileType.ROAD);
                        // row.push(`${TileType.ROAD}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
                        break;
                    case 182:
                        row.push(TileType.GRASS);
                        // row.push(`${TileType.GRASS}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
                        break;
                    case 183:
                        row.push(TileType.MOUNTAIN);
                        // row.push(`${TileType.MOUNTAIN}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
                        break;
                    case 184:
                        row.push(TileType.RIVER);
                        // row.push(`${TileType.RIVER}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
                        break;
                    case 185:
                        row.push(TileType.FOREST);
                        // row.push(`${TileType.FOREST}:${tile}:${x}x${y}:${y * tileMap.width + x}`);
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
        this.gameMap = new GameMap(tileMap.width, tileMap.height, tiles);

        this.setupTurn();
    }

    public endTurn() {
        const currentPlayerIndex = this.players.indexOf(this.currentPlayer!);
        if (currentPlayerIndex === this.players.length - 1) {
            this.turn++;
            this.currentPlayer = this.players[0];
            logInfo('New turn', this.turn, this.currentPlayer?.name)
        } else {
            this.currentPlayer = this.players[currentPlayerIndex + 1];
            logInfo('Next player', this.currentPlayer?.name);
        }
        this.setupTurn();
    }

    private setupTurn() {
        // Give players money
        for (const player of this.players) {
            const buildings = this.units.filter((unit: Unit) => unit instanceof Building && unit.player === player.name && unit.income) as Building[];
            const income = buildings.map(building => building.income).reduce((total, income) => total + income, 0);
            player.money += income;
            logInfo('Player money', player.name, player.money);
        }

        // Set movement points
        for (const unit of this.units) {
            if (unit instanceof MovableUnit) {
                unit.movementPoints = unit.maxMovementPoints;
                unit.hasCommitedActions = false;
            }
        }
    }

    public moveUnit(unitId: number, x: number, y: number) {
        const { unit } = this.getPlayerUnit(unitId);
        if (!(unit instanceof MovableUnit)) {
            throw new GameError('Unit is not movable');
        }
        if (unit.movementPoints <= 0) {
            throw new GameError('Unit does not have enough movement points');
        }
        const unitAtPosition = this.units.find(unit => unit.x === x && unit.y === y && isMoveableUnit(unit));
        if (unitAtPosition) {
            throw new GameError('Unit already at position');
        }
        const path = this.gameMap.finder.findPath(unit.x, unit.y, x, y, this.gameMap.grid.clone());
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
        unit.x = lastPathEntry[0];
        unit.y = lastPathEntry[1];
        unit.movementPoints -= path.length;
        this.broadcast(new MoveUnitResponse(unitId, clonePath, unit.movementPoints));
    }

    public captureBuilding(unitId: number, x: number, y: number) {
        // @ts-ignore
        const { unit } = this.getPlayerUnit(unitId) as MovableUnit;
        const building = this.units.find(unit => unit.x === x && unit.y === y && unit instanceof Building) as Building;
        if (building.player == unit.player) {
            throw new GameError('Cannot capture own buildings');
        }

        if (!unit.canCapture) {
            throw new GameError('Unit cannot capture');
        }

        const unitCaptureValue = Math.max(unit.health / 10, 1);
        building.capturePoints -= unitCaptureValue;

        if (building.capturePoints <= 0) {
            building.player = unit.player;
            building.capturePoints = 20;
        }

        unit.hasCommitedActions = true;
        unit.movementPoints = 0;

        this.broadcastGameState();
    }

    public buildUnit(buildingId: number, unitType: UnitType.INFANTRY | UnitType.TANK | UnitType.SHIP | UnitType.JET | UnitType.ANTI_TANK | UnitType.APC | UnitType.HELICOPTER | UnitType.LANDER) {
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
        }
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
        this.units.push(newUnit);
        logInfo('Building unit', newUnit);
        player.client?.send(new PurchaseUnitResponse(newUnit.id, this.serialize()));
        this.broadcastGameState();
    }

    public attackUnit(unitId: number, x: number, y: number) {
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
        // if (unitAtPosition instanceof MovableUnit && unitAtPosition.hasCommitedActions) {
        //     throw new GameError('Unit already commited actions');
        // }
        unit.movementPoints = 0;
        unit.hasCommitedActions = true;
        unitAtPosition.health -= getDamageAmount(unit, unitAtPosition);
        if (unitAtPosition.health <= 0) {
            this.units = this.units.filter(unit => unit.id !== unitAtPosition.id);
        }
        this.broadcast(new AttackUnitResponse(unitAtPosition.x, unitAtPosition.y));
        this.broadcastGameState();
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
        logInfo('Broadcasting event to game', this.name, event);
        for (const player of this.players) {
            player.client?.send(event);
        }
    }

    public broadcastGameState() {
        this.broadcast(new GameStateUpdate(this.serialize()));
    }

    public serialize(): GameState {
        return {
            name: this.name,
            players: this.players.map(player => ({
                name: player.name,
                color: player.color,
                money: player.money,
            })),
            width: this.gameMap?.width,
            height: this.gameMap?.height,
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
            tiles: this.gameMap?.tiles,
            matrix: this.gameMap?.matrix,
            units: this.units,
            started: this.started,
        };
    }
}
