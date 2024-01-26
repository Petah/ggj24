import { EventType, IEvent } from '../event';
import { GameState } from './game-list';

export class StartGame implements IEvent {
    public type = EventType.START_GAME
    constructor(
    ) { }
}

export class EndTurn implements IEvent {
    public type = EventType.END_TURN
    constructor(
    ) { }
}

export class GameStateUpdate implements IEvent {
    public type = EventType.GAME_STATE_UPDATE;
    constructor(public game: GameState) { }
}

export class MoveUnitRequest implements IEvent {
    public type = EventType.MOVE_UNIT_REQUEST;
    constructor(public unitId: string, public x: number, public y: number) { }
}