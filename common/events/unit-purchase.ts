import { EventType, IEvent } from '../event';
import { UnitType } from '../unit';
import { GameState } from './game-list';

export class PurchaseUnitRequest implements IEvent {
    public type = EventType.PURCHASE_UNIT_REQUEST;
    constructor(public unitId: number, public unitType:  UnitType) { }
}