import WebSocket from 'ws';
import { IEvent } from '../../common/event';

export class Client {
    public constructor(private ws: WebSocket) {
    }

    public send(event: IEvent) {
        this.ws.send(JSON.stringify(event));
    }
}
