import WebSocket from 'ws';
import { GameList } from './game-list';
import { Game } from './game';
import { logError, logInfo } from 'common/log';
import { WebSocketClient } from './client';
import { EventType, IEvent } from 'common/event';
import { GameListRequest, GameListResponse } from 'common/events/game-list';
import { CreateGameRequest, JoinGameRequest } from 'common/events/join-game';
import { AttackUnitRequest, CaptureRequest, EndTurn, MoveUnitRequest, ReloadGameState, StartGame, WaitRequest } from 'common/events/turn';
import { GameError } from './error';
import { ErrorEvent } from 'common/events/error';
import { PurchaseUnitRequest } from 'common/events/unit-purchase';
import { IClient } from 'common/client';
import { IServer } from 'common/server';
import { Ai } from 'common/ai';

type QueuedEvent = [
    Game | IClient,
    IEvent,
];
type EventIterator = AsyncGenerator<QueuedEvent>;

export class Server implements IServer {
    private wss?: WebSocket.Server;
    private gameList: GameList = new GameList();
    private clients: IClient[] = [];
    private queue: QueuedEvent[] = [];
    private queueDeferred?: Promise<void>;
    private queueDeferredCallback?: () => void;

    private pollQueue() {
        if (this.queue.length > 0) {
            const [client, event] = this.queue.shift()!;
            if (client instanceof Game) {
                client.broadcast(event);
            } else {
                client.send(event);
            }
            setTimeout(() => this.pollQueue(), 10);
        } else {
            this.queueDeferredCallback?.();
            this.queueDeferred = undefined;
            this.queueDeferredCallback = undefined;
        }
    }

    public startWebSocketServer() {
        this.wss = new WebSocket.Server({
            port: 8080,
        });

        this.wss.on('connection', (ws: WebSocket) => {
            logInfo('New client connected');
            const client = new WebSocketClient(ws);
            this.clients.push(client);

            ws.on('message', async (eventString: string) => {
                const event = JSON.parse(eventString) as IEvent;
                this.handleEvent(client, event);
            });

            ws.on('close', () => {
                logInfo('Client disconnected');
                this.clients = this.clients.filter(c => c !== client);
            });
        });
    }

    public async handleEvent(client: IClient, event: IEvent) {
        // logInfo('Handle event', client, event);
        try {
            const player = this.getPlayerByClient(client);
            logInfo('Handle event', player?.name, event.type);
            let events: EventIterator | undefined | void;
            switch (event.type) {
                case EventType.CREATE_GAME_REQUEST:
                    events = this.handleCreateGameRequest(client, event as CreateGameRequest);
                    break;
                case EventType.GAME_LIST_REQUEST:
                    events = this.handleGameListRequest(client, event as GameListRequest);
                    break;
                case EventType.JOIN_GAME_REQUEST:
                    events = this.handleJoinGameRequest(client, event as JoinGameRequest);
                    break;
                case EventType.START_GAME:
                    events = this.handleStartGame(client, event as StartGame);
                    break;
                case EventType.END_TURN:
                    events = this.handleEndTurn(client, event as EndTurn);
                    break;
                case EventType.MOVE_UNIT_REQUEST:
                    events = this.handleMoveUnitRequest(client, event as MoveUnitRequest);
                    break;
                case EventType.CAPTURE_REQUEST:
                    events = this.handleCaptureRequest(client, event as CaptureRequest);
                    break;
                case EventType.RELOAD_GAME_STATE:
                    events = this.handleReloadGameState(client, event as ReloadGameState);
                    break;
                case EventType.PURCHASE_UNIT_REQUEST:
                    events = this.handlePurchaseUnitRequest(client, event as PurchaseUnitRequest);
                    break;
                case EventType.ATTACK_UNIT_REQUEST:
                    events = this.handleAttackUnitRequest(client, event as AttackUnitRequest);
                    break;
                case EventType.WAIT_REQUEST:
                    events = this.handleWaitRequest(client, event as WaitRequest);
                    break;
                default:
                    logInfo('Unknown event type', event.type);
            }
            if (events) {
                for await (const [client, event] of events) {
                    this.queue.push([client, event]);
                }
                if (!this.queueDeferred) {
                    this.queueDeferred = new Promise(resolve => {
                        this.queueDeferredCallback = resolve;
                    });
                }
                setTimeout(() => this.pollQueue(), 10);
            }
        } catch (error) {
            logError('Error handling event', event, error);
            if (error instanceof GameError) {
                client.send(new ErrorEvent(error.message || 'Unknown error'));
            }
        }
        return this.queueDeferred;
    }

    public broadcast(event: IEvent) {
        this.clients.forEach(client => client.send(event));
    }

    private getPlayerByClient(client: IClient) {
        try {
            const game = this.getGameByClient(client);
            const player = game.players.find(p => p.client === client);
            return player;
        } catch (error) {
        }
    }

    private getGameByClient(client: IClient): Game {
        const game = this.gameList.games.find(g => g.players.find(p => p.client === client));
        if (!game) {
            throw new GameError('Game for client not found');
        }
        return game;
    }

    private handleCreateGameRequest(client: IClient, event: CreateGameRequest) {
        const game = new Game(event.gameName);
        this.gameList.addGame(game);
    }

    private handleGameListRequest(client: IClient, event: GameListRequest) {
        client.send(new GameListResponse(this.gameList.games.map(g => g.serialize())));
    }

    private async *handleJoinGameRequest(client: IClient, event: JoinGameRequest): EventIterator {
        const game = this.gameList.games.find(g => g.name === event.gameName);
        if (!game) {
            throw new GameError('Game not found');
        }
        game.addPlayer(event.playerName, client);
        yield [game, game.broadcastGameState()];
    }

    private async *handleStartGame(client: IClient, event: StartGame): EventIterator {
        const game = this.getGameByClient(client);
        if (game.players.length < 2) {
            const ai = new Ai('AI', this);
            game.addPlayer(ai.playerName, ai);
        }
        await game.start();
        yield [game, game.broadcastGameState()];
    }

    private async *handleEndTurn(client: IClient, event: EndTurn): EventIterator {
        const game = this.getGameByClient(client);
        const player = game.players.find(p => p.client === client);
        if (!player) {
            throw new GameError('Player not found');
        }
        if (player !== game.currentPlayer) {
            throw new GameError(`Not your turn: ${game.turn} ${game.currentPlayer?.name}`);
        }
        game.endTurn();
        yield [game, game.broadcastGameState()];
    }

    private async *handleMoveUnitRequest(client: IClient, event: MoveUnitRequest): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.moveUnit(event.unitId, event.x, event.y)];
    }

    private async *handleCaptureRequest(client: IClient, event: CaptureRequest): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.captureBuilding(event.unitId, event.x, event.y)];
    }

    private async *handleReloadGameState(client: IClient, event: ReloadGameState): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.broadcastGameState()];
    }

    private async *handlePurchaseUnitRequest(client: IClient, event: PurchaseUnitRequest): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.buildUnit(event.unitId, event.unitType)];
    }

    private async *handleAttackUnitRequest(client: IClient, event: AttackUnitRequest): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.attackUnit(event.unitId, event.x, event.y)];
    }

    private async *handleWaitRequest(client: IClient, event: WaitRequest): EventIterator {
        const game = this.getGameByClient(client);
        yield [game, game.wait(event.unitId)];
    }
}
