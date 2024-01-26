import { IEvent, EventType } from "../../common/event";
import { GameListRequest, GameListResponse } from "../../common/events/game-list";
import { JoinGameRequest } from "../../common/events/join-game";
import { logInfo } from "../../common/log";

export class Client {
    private ws: WebSocket;

    constructor() {
        const queryString = new URLSearchParams(window.location.search);
        const playerName = queryString.get('playerName') || 'Player1';
        logInfo('Player name', playerName);

        this.ws = new WebSocket('ws://localhost:8080');
        this.ws.onopen = () => {
            console.log('Connected to server');

            // @todo Make game list only request on menu screen
            this.send(new GameListRequest());
        }

        this.ws.onmessage = (messageEvent: MessageEvent) => {
            const event = JSON.parse(messageEvent.data) as IEvent;
            logInfo('Received message from server', event);
            switch (event.type) {
                case EventType.GAME_LIST_RESPONSE:
                    const gameListEvent = event as GameListResponse;
                    // @todo join game from a list
                    // @todo dynamic player name
                    this.send(new JoinGameRequest(playerName, gameListEvent.games[0].name));
                    break;
                default:
                    console.log('Unknown event type', event.type);
            }
        }

        this.ws.onclose = () => {
            console.log('Disconnected from server');
        }

        this.ws.onerror = error => {
            console.error(error);
        }
    }

    public send(event: IEvent) {
        logInfo('Sending message to server', event);
        this.ws.send(JSON.stringify(event));
    }
}
