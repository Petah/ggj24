import { EventType, IEvent } from '../event';
import { Player } from '../player';
import { Unit } from '../unit';

export interface GameState {
    tick: number,
    name: string;
    players: Player[];
    width: number;
    height: number;
    turn: number;
    currentPlayer?: string;
    tiles: TileType[][];
    units: Unit[];
    started: boolean;
}

export enum TileType {
    ROAD = 'R',
    GRASS = 'G',
    WATER = 'W',
    RIVER = '~',
    MOUNTAIN = 'M',
    FOREST = 'F',
    SHORE = 'S',
}

export class GameListRequest implements IEvent {
    public type = EventType.GAME_LIST_REQUEST;
}

export class GameListResponse implements IEvent {
    public type = EventType.GAME_LIST_RESPONSE;
    constructor(public games: GameState[]) { }
}
