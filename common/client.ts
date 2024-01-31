import { IEvent } from "./event";

export enum ClientType {
    DUMMY = 'Dummy',
    WEBSOCKET = 'WebSocket',
    AI = 'AI',
}

export interface IClient {
    type: ClientType;
    send(event: IEvent): void;
    state: object;
}
