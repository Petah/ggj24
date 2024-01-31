import { EventType, IEvent } from '../event';
import { GameState } from './game-list';

export class JoinGameRequest implements IEvent {
    public type = EventType.JOIN_GAME_REQUEST
    constructor(
        public playerName: string,
        public gameName: string,
    ) { }
}

export class JoinGameResponse implements IEvent {
    public type = EventType.JOIN_GAME_RESPONSE;
    constructor() { }
}

export class PlayerJoinedEvent implements IEvent {
    public type = EventType.PLAYER_JOINED;
    constructor(public game: GameState) { }
}

export class CreateGameRequest implements IEvent {
    public type = EventType.CREATE_GAME_REQUEST;
    constructor(public gameName: string, public mapName: string) { }
}
