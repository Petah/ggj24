import { EventType, IEvent } from 'common/event';
import { GameListRequest, GameListResponse, GameState } from 'common/events/game-list';
import { JoinGameRequest } from 'common/events/join-game';
import { logError, logInfo } from 'common/log';
import { AttackUnitResponse, CaptureResponse, GameStateUpdate, MoveUnitResponse, WaitResponse } from 'common/events/turn';
import { ErrorEvent } from 'common/events/error';
import { state } from './state';
import { PurchaseUnitResponse } from 'common/events/unit-purchase';

export class Client {
    public ws: WebSocket;

    constructor() {
        const currentHost = window.location.host.replace(/:.*/, '');
        this.ws = new WebSocket(`ws://${currentHost}:8080`);
        this.ws.onopen = () => {
            logInfo('Connected to server');

            // @todo Make game list only request on menu screen
            this.send(new GameListRequest());
        };

        this.ws.onmessage = (messageEvent: MessageEvent) => {
            const event = JSON.parse(messageEvent.data) as IEvent;
            // logInfo('Received message from server', event);
            switch (event.type) {
                case EventType.GAME_LIST_RESPONSE:
                    const gameListEvent = event as GameListResponse;
                    // @todo join game from a list
                    this.send(new JoinGameRequest(state.playerName, gameListEvent.games[0].name));
                    break;
                case EventType.GAME_STATE_UPDATE:
                    this.handleGameStateChange(event as GameStateUpdate);
                    break;
                case EventType.MOVE_UNIT_RESPONSE:
                    this.handleMoveUnitResponse(event as MoveUnitResponse);
                    break;
                case EventType.PURCHASE_UNIT_RESPONSE:
                    this.handlePurchaseUnitResponse(event as PurchaseUnitResponse);
                    break;
                case EventType.CAPTURE_RESPONSE:
                    state.scene?.playCaptureAnimation();
                    break;
                case EventType.ATTACK_UNIT_RESPONSE:
                    this.handleAttackUnitResponse(event as AttackUnitResponse);
                    break;
                case EventType.CAPTURE_RESPONSE:
                    this.handleCaptureResponse(event as CaptureResponse);
                case EventType.WAIT_RESPONSE:
                    this.handleGameStateChange(event as WaitResponse);
                    break;
                case EventType.ERROR:
                    logError('Received error from server:', (event as ErrorEvent).message);
                    break;
                default:
                    logError('Unknown event type', event.type);
            }
        };

        this.ws.onclose = () => {
            logError('Disconnected from server');
            setTimeout(() => {
                // window.location.reload();
            }, 3000);
        };

        this.ws.onerror = error => {
            logError(error);
        };
    }

    public send(event: IEvent) {
        logInfo('Sending message to server', event);
        this.ws.send(JSON.stringify(event));
    }

    private handleGameStateChange({ game }: { game: GameState }) {
        state.scene?.updateGameState(game);
    }

    private handleMoveUnitResponse(event: MoveUnitResponse) {
        state.scene?.handleMoveUnitResponse(event);
    }

    private handlePurchaseUnitResponse(event: PurchaseUnitResponse) {
        state.scene?.updateGameState(event.game);
        const unit = event.game.units.find(u => u.id === event.unitId);
        if (unit?.player === state.playerName) {
            state.scene?.selectUnit(event.game.units?.find(u => u.id === event.unitId));
        }
        state.scene?.updateGameState(event.game);
    }

    private handleAttackUnitResponse(event: AttackUnitResponse) {
        state.scene?.explode(event.x, event.y, event.attackingUnitType);
        state.scene?.updateGameState(event.game);
    }

    private handleCaptureResponse(event: CaptureResponse) {
        state.scene?.playCaptureAnimation();
        state.scene?.updateGameState(event.game);
    }
}

export const client = new Client();