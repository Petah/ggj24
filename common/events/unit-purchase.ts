import { EventType, IEvent } from '../event';
import { UnitType } from '../unit';
import { GameState } from './game-list';

export class PurchaseUnitRequest implements IEvent {
    public type = EventType.PURCHASE_UNIT_REQUEST;
    constructor(public unitId: number, public unitType: UnitType.INFANTRY | UnitType.TANK | UnitType.SHIP | UnitType.JET | UnitType.ANTI_TANK | UnitType.APC | UnitType.HELICOPTER | UnitType.LANDER) { }
}

export class PurchaseUnitResponse implements IEvent {
    public type = EventType.PURCHASE_UNIT_RESPONSE;
    constructor(public unitId: number, public game: GameState) { }
}