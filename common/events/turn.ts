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
    constructor(public unitId: number, public x: number, public y: number) { }
}

export class MoveUnitResponse implements IEvent {
    public type = EventType.MOVE_UNIT_RESPONSE;
    constructor(public unitId: number, public path: number[][], public remainingMovementPoints: number) { }
}

export class CaptureRequest implements IEvent {
    public type = EventType.CAPTURE_REQUEST;
    constructor(public unitId: number, public x: number, public y: number) { }
}

export class CaptureResponse implements IEvent {
    public type = EventType.CAPTURE_RESPONSE;
    constructor(public unitId: number, public buildingId: number) { }
}

export class ReloadGameState implements IEvent {
    public type = EventType.RELOAD_GAME_STATE;
    constructor() { }
}

export class AttackUnitRequest implements IEvent {
    public type = EventType.ATTACK_UNIT_REQUEST;
    constructor(public unitId: number, public x: number, public y: number) { }
}

export class AttackUnitResponse implements IEvent {
    public type = EventType.ATTACK_UNIT_RESPONSE;
    constructor(public x: number, public y: number) { }
}