import { Client } from './client';
import { IEvent } from '../../common/event';
import { logError, logInfo } from '../../common/log';
import { Player } from './player';
import { GameState } from './events/game-list';
import { GameStateUpdate } from '../../common/events/turn';
import { GameError } from './error';
import { readFile } from 'fs/promises';
import { GameMap } from './game-map';
import { TileMap } from './tiled';
import { TileType } from '../../common/events/game-list';
import { Airport, City, Dock, Factory, HQ, Infantry, PlayerColor, PlayerColors, Unit, UnitType } from '../../common/unit';
import { TILE_SIZE } from '../../common/map';
import { generateId } from './id';

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

            this.gameMap = new GameMap(tileMap.width, tileMap.height, tiles);
        }
    }

    public endTurn() {
        const currentPlayerIndex = this.players.indexOf(this.currentPlayer!);
        if (currentPlayerIndex === this.players.length - 1) {
            this.turn++;
            this.currentPlayer = this.players[0];
        } else {
            this.currentPlayer = this.players[currentPlayerIndex + 1];
        }
    }

    public moveUnit(unitId: number, x: number, y: number) {
        if (!this.started) {
            throw new GameError('Game not started');
        }
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
        // if (unit.movementPoints <= 0) {
        //     throw new GameError('Unit does not have enough movement points');
        // }
        const path = this.gameMap.finder.findPath(unit.x, unit.y, x, y, this.gameMap.grid);
        if (path.length <= 0) {
            throw new GameError('No path found');
        }
        const lastPathEntry = path[path.length - 1];
        unit.x = lastPathEntry[0];
        unit.y = lastPathEntry[1];
        this.broadcastGameState();
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
            })),
            width: this.gameMap?.width,
            height: this.gameMap?.height,
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
            tiles: this.gameMap?.tiles,
            units: this.units,
        };
    }
}
