import { EventType, IEvent } from '../../common/event';
import { GameListRequest, GameListResponse, GameState } from '../../common/events/game-list';
import { JoinGameRequest } from '../../common/events/join-game';
import { logError, logInfo } from '../../common/log';
import { GameStateUpdate } from '../../common/events/turn';
import { ErrorEvent } from '../../common/events/error';

interface EventListeners {
    [EventType.GAME_STATE_CHANGE]: ((gameState: GameState) => void)[];
}

export class Client {
    private ws: WebSocket;
    private eventListeners: EventListeners = {
        [EventType.GAME_STATE_CHANGE]: [],
    };

    constructor() {
        const queryString = new URLSearchParams(window.location.search);
        // @todo dynamic player name
        const playerName = queryString.get('playerName') || 'Player1';
        logInfo('Player name', playerName);

        this.ws = new WebSocket('ws://localhost:8080');
        this.ws.onopen = () => {
            logInfo('Connected to server');

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
                    this.send(new JoinGameRequest(playerName, gameListEvent.games[0].name));
                    break;
                case EventType.GAME_STATE_UPDATE:
                    this.sendGameStateChange((event as GameStateUpdate).game);
                    break;
                case EventType.ERROR:
                    logError('Received error from server:', (event as ErrorEvent).message);
                    break;
                default:
                    logError('Unknown event type', event.type);
            }
        }

        this.ws.onclose = () => {
            logInfo('Disconnected from server');
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }

        this.ws.onerror = error => {
            logError(error);
        }
    }

    public send(event: IEvent) {
        logInfo('Sending message to server', event);
        this.ws.send(JSON.stringify(event));
    }

    public onGameStateChange(callback: (gameState: GameState) => void) {
        this.eventListeners[EventType.GAME_STATE_CHANGE].push(callback);
    }

    public sendGameStateChange(gameState: GameState) {
        for (const callback of this.eventListeners[EventType.GAME_STATE_CHANGE]) {
            callback(gameState);
        }
    }
}
