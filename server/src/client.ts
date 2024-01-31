import WebSocket from 'ws';
import { IEvent } from 'common/event';
import { ClientType, IClient } from 'common/client';

export class WebSocketClient implements IClient {
    public type = ClientType.WEBSOCKET;
    public state: object = {};

    public constructor(private ws: WebSocket) {
    }

    public send(event: IEvent) {
        this.ws.send(JSON.stringify(event));
    }
}
