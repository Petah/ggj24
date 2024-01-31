import WebSocket from 'ws';
import { Game } from './game';
import { logError, logInfo } from 'common/log';
import { WebSocketClient } from './client';
import { EventType, IEvent } from 'common/event';
import { GameListResponse } from 'common/events/game-list';
import { CreateGameRequest, JoinGameRequest } from 'common/events/join-game';
import { AttackUnitRequest, CaptureRequest, GameStateUpdate, MoveUnitRequest, WaitRequest } from 'common/events/turn';
import { GameError } from './error';
import { ErrorEvent } from 'common/events/error';
import { PurchaseUnitRequest } from 'common/events/unit-purchase';
import { ClientType, IClient } from 'common/client';
import { IServer } from 'common/server';
import { Ai } from 'common/ai';
import { Dummy } from './dummy';

type QueuedEvent = [
    Game | IClient,
    IEvent,
];

type EventIterator = AsyncGenerator<QueuedEvent>;

interface GameListGame {
    game: Game;
    clients: {
        [playerName: string]: IClient;
    };
}

export class Server implements IServer {
    private wss?: WebSocket.Server;
    private gameList: GameListGame[] = [];
    private clients: IClient[] = [];
    private queue: QueuedEvent[] = [];
    private queueDeferred?: Promise<void>;
    private queueDeferredCallback?: () => void;

    private pollQueue() {
        while (this.queue.length > 0) {
            const [client, event] = this.queue.shift()!;
            if (client instanceof Game) {
                const clients = this.gameList.find(g => g.game === client)?.clients || [];
                for (const playerName in clients) {
                    clients[playerName].send(event);
                }
            } else {
                client.send(event);
            }
        }
        this.queueDeferredCallback?.();
        this.queueDeferred = undefined;
        this.queueDeferredCallback = undefined;
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
            const { player } = this.getPlayerByClient(client);
            logInfo('Handle event', player?.name, event.type);
            let events: EventIterator | undefined | void;
            switch (event.type) {
                case EventType.CREATE_GAME_REQUEST:
                    events = this.handleCreateGameRequest(client, event as CreateGameRequest);
                    break;
                case EventType.GAME_LIST_REQUEST:
                    events = this.handleGameListRequest(client);
                    break;
                case EventType.JOIN_GAME_REQUEST:
                    events = this.handleJoinGameRequest(client, event as JoinGameRequest);
                    break;
                case EventType.START_GAME:
                    events = this.handleStartGame(client);
                    break;
                case EventType.END_TURN:
                    events = this.handleEndTurn(client);
                    break;
                case EventType.MOVE_UNIT_REQUEST:
                    events = this.handleMoveUnitRequest(client, event as MoveUnitRequest);
                    break;
                case EventType.CAPTURE_REQUEST:
                    events = this.handleCaptureRequest(client, event as CaptureRequest);
                    break;
                case EventType.RELOAD_GAME_STATE:
                    events = this.handleReloadGameState(client);
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
                case EventType.RESTART_GAME:
                    events = this.handleRestartGame(client);
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
                process.nextTick(() => this.pollQueue(), 0);
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
        for (const gameMap of this.gameList) {
            for (const playerName in gameMap.clients) {
                if (gameMap.clients[playerName] === client) {
                    return {
                        ...gameMap,
                        player: gameMap.game.players.find(p => p.name === playerName),
                    };
                }
            }
        }
        return {
            game: undefined,
            clients: {},
            player: undefined,
        };
    }

    private getGameByClient(client: IClient) {
        for (const gameMap of this.gameList) {
            for (const playerName in gameMap.clients) {
                if (gameMap.clients[playerName] === client) {
                    return gameMap;
                }
            }
        }
        throw new GameError('Game for client not found');
    }

    private async *handleCreateGameRequest(client: IClient, event: CreateGameRequest) {
        const game = new Game(event.gameName, event.mapName);
        const gameListGame: GameListGame = {
            game,
            clients: {},
        };
        if (event.playerName) {
            gameListGame.clients[event.playerName] = client;
            game.addPlayer(event.playerName, client);
        }
        this.gameList.push(gameListGame);
        await game.loadGameState();
        for (const player of game.players) {
            if (player.clientType === ClientType.AI) {
                const ai = new Ai(player.name, this, game.clientState[player.name]);
                this.addPlayer(game.name, ai.playerName, ai);
            } else if (player.clientType === ClientType.DUMMY) {
                const dummy = new Dummy(player.name, this);
                this.addPlayer(game.name, dummy.playerName, dummy);
            }
        }
    }

    private handleGameListRequest(client: IClient) {
        client.send(new GameListResponse(this.gameList.map(g => g.game.serialize())));
    }

    private async *handleJoinGameRequest(client: IClient, event: JoinGameRequest): EventIterator {
        const { game } = this.addPlayer(event.gameName, event.playerName, client);
        yield [game, new GameStateUpdate(game.serialize())];
    }

    private async *handleStartGame(client: IClient): EventIterator {
        const { game, clients } = this.getGameByClient(client);
        console.log('game.players', game.players)
        if (game.players.length < 2) {
            logInfo('Not enough players to start game, adding AI');
            const ai = new Ai('AI', this);
            this.addPlayer(game.name, ai.playerName, ai);
        }
        await game.start();
        await game.saveGameState(clients);
        yield [game, new GameStateUpdate(game.serialize())];
    }

    private async *handleRestartGame(client: IClient): EventIterator {
        const { game, clients } = this.getGameByClient(client);
        console.log('game.started', game.started)
        if (!game.started) {
            yield* this.handleStartGame(client);
            return;
        }
        game.restart();
        await game.saveGameState(clients);
        yield [game, new GameStateUpdate(game.serialize())];
    }

    private addPlayer(gameName: string, playerName: string, client: IClient) {
        const gameMap = this.gameList.find(g => g.game.name === gameName);
        if (!gameMap) {
            throw new GameError('Game not found');
        }
        gameMap.game.addPlayer(playerName, client);
        gameMap.clients[playerName] = client;
        return gameMap;
    }

    private async *handleEndTurn(client: IClient): EventIterator {
        const { game, player, clients } = this.getPlayerByClient(client);
        if (!player) {
            throw new GameError('Player not found');
        }
        if (player !== game.currentPlayer) {
            throw new GameError(`Not your turn: ${game.turn} ${game.currentPlayer?.name}`);
        }
        game.endTurn();
        await game.saveGameState(clients);
        yield [game, new GameStateUpdate(game.serialize())];
    }

    private async *handleMoveUnitRequest(client: IClient, event: MoveUnitRequest): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, game.moveUnit(event.unitId, event.x, event.y)];
    }

    private async *handleCaptureRequest(client: IClient, event: CaptureRequest): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, game.captureBuilding(event.unitId, event.x, event.y)];
    }

    private async *handleReloadGameState(client: IClient): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, new GameStateUpdate(game.serialize())];
    }

    private async *handlePurchaseUnitRequest(client: IClient, event: PurchaseUnitRequest): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, game.buildUnit(event.unitId, event.unitType)];
    }

    private async *handleAttackUnitRequest(client: IClient, event: AttackUnitRequest): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, game.attackUnit(event.unitId, event.x, event.y)];
    }

    private async *handleWaitRequest(client: IClient, event: WaitRequest): EventIterator {
        const { game } = this.getGameByClient(client);
        yield [game, game.wait(event.unitId)];
    }
}
