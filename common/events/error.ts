import { EventType, IEvent } from '../event';

export class ErrorEvent implements IEvent {
    public type = EventType.ERROR;
    constructor(public message: string) { }
}