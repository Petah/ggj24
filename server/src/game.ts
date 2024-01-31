import { APC, Airport, AntiTank, Building, City, Dock, Factory, HQ, Helicopter, Infantry, Jet, Lander, MovableUnit, PlayerColor, PlayerColors, RocketTruck, Ship, Tank, Unit, UnitType, UnitTypePurchasable, getDamageAmount, isBuilding, isMoveableUnit } from 'common/unit';
import { AttackUnitResponse, CaptureResponse, MoveUnitResponse, WaitResponse } from 'common/events/turn';
import { GameError } from './error';
import { GameState, TileType } from 'common/events/game-list';
import { generateId } from './id';
import { getPathFinder } from 'common/map';
import { ClientType, IClient } from 'common/client';
import { IEvent } from 'common/event';
import { logError, logInfo } from 'common/log';
import { Player } from 'common/player';
import { PurchaseUnitResponse } from 'common/events/unit-purchase';
import { readFile, writeFile } from 'fs/promises';
import { TileMap, TileSet } from './tiled';

type SaveGameState = Omit<GameState, 'tiles'> & {
    tiles: string[];
    clientState: { [playerName: string]: object };
}

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
    public clientState: { [playerName: string]: object } = {};

    constructor(
        public name: string,
        public mapName: string,
    ) {
    }

    public addPlayer(playerName: string, client: IClient) {
        const existingPlayer = this.players.find(player => player.name === playerName);
        if (existingPlayer) {
            logInfo('Reconnecting player', playerName);
            existingPlayer.clientType = client.type;
            if (this.clientState[playerName]) {
                client.state = this.clientState[playerName];
            }
        } else {
            if (this.players.length >= 4) {
                throw new GameError('Game is full');
            }
            const nextColor = PlayerColors.find(color => !this.players.find(player => player.color === color)) as PlayerColor;
            this.players.push(new Player(client.type, playerName, nextColor));
            logInfo('Adding player', playerName, nextColor);
        }
    }

    public async start(restart: boolean = false) {
        if (this.started && !restart) {
            throw new GameError('Game already started');
        }
        this.started = true;
        this.turn = 1;
        this.currentPlayer = this.players[0];
        this.units = [];

        for (const player of this.players) {
            player.money = 1000;
            player.hasLost = false;
        }

        // @todo validate file name
        const tileMapData = await readFile(`../browser/public/maps/${this.mapName}.json`, 'utf-8');
        const tileMap: TileMap = JSON.parse(tileMapData);
        const tileSet = tileMap.tilesets[0] as TileSet;
        const tiles: TileType[][] = [];
        for (const layer of tileMap.layers) {
            for (let y = 0; y < tileMap.height; y++) {
                if (!tiles[y]) {
                    tiles[y] = [];
                }
                for (let x = 0; x < tileMap.width; x++) {
                    const tileId = layer.data[y * tileMap.width + x] - tileMap.tilesets[0].firstgid;
                    if (tileId === -1) {
                        // row.push(TileType.WATER);
                        continue;
                    }
                    const tile = tileSet.tiles.find(t => t.id === tileId);
                    const tileType = tile?.properties?.find(property => property.name === 'type')?.value;
                    const color = tile?.properties?.find(property => property.name === 'color')?.value;
                    const player = this.players.find(player => player.color === color);

                    switch (tileType) {
                        case 'water':
                            tiles[y][x] = TileType.WATER;
                            break;
                        case 'road':
                            tiles[y][x] = TileType.ROAD;
                            break;
                        case 'grass':
                            tiles[y][x] = TileType.GRASS;
                            break;
                        case 'mountain':
                            tiles[y][x] = TileType.MOUNTAIN;
                            break;
                        case 'river':
                            tiles[y][x] = TileType.RIVER;
                            break;
                        case 'forest':
                            tiles[y][x] = TileType.FOREST;
                            break;
                        case 'shore':
                            tiles[y][x] = TileType.SHORE;
                            break;

                        case 'hq':
                            this.units.push(new HQ(generateId(), x, y, player?.name));
                            break;
                        case 'city':
                            this.units.push(new City(generateId(), x, y, player?.name));
                            break;
                        case 'dock':
                            this.units.push(new Dock(generateId(), x, y, player?.name));
                            break;
                        case 'factory':
                            this.units.push(new Factory(generateId(), x, y, player?.name));
                            break;
                        case 'airport':
                            this.units.push(new Airport(generateId(), x, y, player?.name));
                            break;
                        case 'infantry':
                            this.units.push(new Infantry(generateId(), x, y, player?.name));
                        case 'antiTank':
                            this.units.push(new AntiTank(generateId(), x, y, player?.name));
                            break;
                        case 'tank':
                            this.units.push(new Tank(generateId(), x, y, player?.name));
                            break;
                        case 'rocketTruck':
                            this.units.push(new RocketTruck(generateId(), x, y, player?.name));
                            break;
                        case 'jet':
                            this.units.push(new Jet(generateId(), x, y, player?.name));
                            break;
                        case 'helicopter':
                            this.units.push(new Helicopter(generateId(), x, y, player?.name));
                            break;

                        default:
                            logError('Tile not found', x, y, tileId, tile);
                    }
                }
            }
        }
        for (let y = 0; y < tileMap.height; y++) {
            for (let x = 0; x < tileMap.width; x++) {
                if (!tiles[y][x]) {
                    tiles[y][x] = TileType.WATER;
                }
            }
        }
        this.mapWidth = tileMap.width;
        this.mapHeight = tileMap.height;
        this.tiles = tiles;

        this.setupTurn(this.currentPlayer);
    }

    public restart() {
        this.start(true);
    }

    public endTurn() {
        console.log('--------------------------------');
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
        const buildings = this.units.filter((unit: Unit) => isBuilding(unit) && unit.player === player.name && unit.income) as Building[];
        const income = buildings.map(building => building.income).reduce((total, income) => total + income, 0);
        player.money += income;
        logInfo('Player money', player.name, player.money);

        // Set movement points
        for (const unit of this.units) {
            if (isMoveableUnit(unit) && unit.player === player.name) {
                unit.movementPoints = unit.maxMovementPoints;
                unit.hasCommittedActions = false;
            }
        }
    }

    public moveUnit(unitId: number, x: number, y: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId);
        if (!(isMoveableUnit(unit))) {
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
        const buildingAtPosition = this.units.find(u => unit.x === u.x && unit.y === u.y && isBuilding(u)) as Building | undefined;
        if (buildingAtPosition) {
            buildingAtPosition.capturePoints = buildingAtPosition?.maxCapturePoints;
        }

        return new MoveUnitResponse(unitId, clonePath, unit.movementPoints, this.serialize());
    }

    public captureBuilding(unitId: number, x: number, y: number): IEvent {
        const { unit } = this.getPlayerUnit(unitId) as { unit: MovableUnit; player: Player };
        const building = this.units.find(unit => unit.x === x && unit.y === y && isBuilding(unit)) as Building;
        // @todo helper getters
        // const { unit } = this.getPlayerMovableUnitAt(unitId) as { unit: MovableUnit; player: Player };
        // const { building } = this.getBuildingAt(...);
        // @todo assert correct player
        const currentOwner = this.players.find(player => player.name === building.player);
        if (currentOwner?.name === unit.player) {
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
            building.capturePoints = 20;
            if (currentOwner && building.type === UnitType.HQ) {
                // Player lost
                this.playerLost(currentOwner);
            }
        }

        unit.hasCommittedActions = true;
        unit.movementPoints = 0;

        return new CaptureResponse(building.x, building.y, this.serialize());
    }

    private playerLost(player: Player) {
        let i = this.units.length;
        while (i--) {
            const unit = this.units[i];
            if (isBuilding(unit) && unit.player === player.name) {
                unit.capturePoints = 20;
                unit.player = undefined;
            } else {
                if (unit.player === player.name) {
                    this.units.splice(i, 1);
                }
            }
        }
        player.hasLost = true;
    }

    public buildUnit(buildingId: number, unitType: UnitTypePurchasable): PurchaseUnitResponse {
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
        if (!(isMoveableUnit(unit))) {
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
        if (!isMoveableUnit(unitAtPosition)) {
            throw new GameError('Cannot attack buildings');
        }
        // if (isMoveableUnit(unitAtPosition) && unitAtPosition.movementPoints <= 0) {
        //     throw new GameError('Unit cannot move');
        // }
        // if (isMoveableUnit(unitAtPosition) && unitAtPosition.hasCommittedActions) {
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
        if (!(isMoveableUnit(unit))) {
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

    public serialize(): GameState {
        return {
            tick: this.tick++,
            name: this.name,
            players: this.players,
            width: this.mapWidth,
            height: this.mapHeight,
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
            tiles: this.tiles,
            units: this.units,
            started: this.started,
        };
    }

    public async saveGameState(clients: { [playerName: string]: IClient }) {
        const jsonFile = `./games/${this.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        const clientState = {};
        for (const playerName in clients) {
            clientState[playerName] = clients[playerName].state;
        }
        const gameState: SaveGameState = {
            ...this.serialize(),
            tiles: this.tiles.map(row => row.join('')),
            clientState,
        };
        const gameStateString = JSON.stringify(gameState, null, 4);
        logInfo('Saving game state', jsonFile, gameStateString.length);
        await writeFile(jsonFile, gameStateString);
    }

    public async loadGameState(): Promise<boolean> {
        let gameState: SaveGameState;
        try {
            const jsonFile = `./games/${this.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
            logInfo('Loading game state', jsonFile);
            const gameStateString = await readFile(jsonFile, 'utf-8');
            gameState = JSON.parse(gameStateString) as SaveGameState;
        } catch (error) {
            logError('Error loading game state', error);
            return false;
        }
        this.tick = gameState.tick;
        this.name = gameState.name;
        this.players = gameState.players;
        this.mapWidth = gameState.width;
        this.mapHeight = gameState.height;
        this.turn = gameState.turn;
        this.currentPlayer = this.players.find(player => player.name === gameState.currentPlayer);
        this.tiles = gameState.tiles.map(row => row.split('')) as TileType[][];
        this.units = gameState.units;
        this.started = gameState.started;
        this.clientState = gameState.clientState;
        return true;
    }
}
