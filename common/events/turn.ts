import { EventType, IEvent } from '../event';
import { GameState } from './game-list';

export class EndTurn implements IEvent {
    public type = EventType.END_TURN
    constructor(
    ) { }
}

export class GameStateUpdate implements IEvent {
    public type = EventType.GAME_STATE_UPDATE;
    constructor(public game: GameState) { }
}