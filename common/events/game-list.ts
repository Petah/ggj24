import { EventType, IEvent } from '../event';
import { PlayerColor, Unit } from '../unit';

export interface GameState {
    name: string;
    players: {
        name: string;
        color: PlayerColor;
        money: number;
    }[];
    width: number;
    height: number;
    turn: number;
    currentPlayer?: string;
    tiles?: TileType[][];
    matrix?: number[][];
    units?: Unit[];
    started: boolean;
}

export enum TileType {
    ROAD = 'R',
    GRASS = 'G',
    WATER = 'W',
    RIVER = '~',
    MOUNTAIN = 'M',
    FOREST = 'F',
}

export class GameListRequest implements IEvent {
    public type = EventType.GAME_LIST_REQUEST;
}

export class GameListResponse implements IEvent {
    public type = EventType.GAME_LIST_RESPONSE;
    constructor(public games: GameState[]) { }
}
