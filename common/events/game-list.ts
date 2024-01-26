import { EventType, IEvent } from '../event';

export interface GameState {
    name: string;
    players: {
        name: string;
    }[];
    turn: number;
    currentPlayer?: string;
    tiles?: TileType[][];
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
