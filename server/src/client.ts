import WebSocket from 'ws';
import { IEvent } from 'common/event';
import { IClient } from 'common/client';

export class DummyClient implements IClient {
    public send(event: IEvent) {
    }
}

export class WebSocketClient implements IClient {
    public constructor(private ws: WebSocket) {
    }

    public send(event: IEvent) {
        this.ws.send(JSON.stringify(event));
    }
}
