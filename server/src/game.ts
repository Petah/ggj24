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

export class Game {
    public players: Player[] = [];
    public started: boolean = false;
    public turn: number = 0;
    public currentPlayer?: Player;
    public gameMap?: GameMap;

    constructor(
        public name: string,
    ) {
    }

    public addPlayer(playerName: string, client: Client) {
        const existingPlayer = this.players.find(player => player.name === playerName);
        if (existingPlayer) {
            existingPlayer.client = client;
        } else {
            this.players.push(new Player(playerName, client));
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
        this.gameMap = new GameMap(tileMap.width, tileMap.height, tiles);
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

    public broadcast(event: IEvent) {
        logInfo('Broadcasting event to game', this.name, event);
        for (const player of this.players) {
            player.client.send(event);
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
            })),
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
            tiles: this.gameMap?.tiles,
        };
    }
}
