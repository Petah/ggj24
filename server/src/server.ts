import WebSocket from 'ws';
import { GameList } from './game-list';
import { Game } from './game';
import { logError, logInfo } from '../../common/log';
import { Client } from './client';
import { EventType, IEvent } from '../../common/event';
import { GameListRequest, GameListResponse } from '../../common/events/game-list';
import { JoinGameRequest, PlayerJoinedEvent } from '../../common/events/join-game';
import { EndTurn, MoveUnitRequest, ReloadGameState, StartGame, CaptureRequest, AttackUnitRequest } from '../../common/events/turn';
import { GameError } from './error';
import { ErrorEvent } from '../../common/events/error';
import { PurchaseUnitRequest } from '../../common/events/unit-purchase';

export class Server {
    private wss: WebSocket.Server;
    private gameList: GameList = new GameList();
    private clients: Client[] = [];

    constructor() {
        this.wss = new WebSocket.Server({
            port: 8080,
        });

        this.wss.on('connection', (ws: WebSocket) => {
            logInfo('New client connected');
            const client = new Client(ws);
            this.clients.push(client);

            ws.on('message', async (eventString: string) => {
                const event = JSON.parse(eventString) as IEvent;
                logInfo('Received message', event);
                try {
                    switch (event.type) {
                        case EventType.GAME_LIST_REQUEST:
                            await this.handleGameListRequest(client, event as GameListRequest);
                            break;
                        case EventType.JOIN_GAME_REQUEST:
                            await this.handleJoinGameRequest(client, event as JoinGameRequest);
                            break;
                        case EventType.START_GAME:
                            await this.handleStartGame(client, event as StartGame);
                            break;
                        case EventType.END_TURN:
                            await this.handleEndTurn(client, event as EndTurn);
                            break;
                        case EventType.MOVE_UNIT_REQUEST:
                            await this.handleMoveUnitRequest(client, event as MoveUnitRequest);
                            break;
                        case EventType.CAPTURE_REQUEST:
                            await this.handleCaptureRequest(client, event as CaptureRequest);
                            break;
                        case EventType.RELOAD_GAME_STATE:
                            await this.handleReloadGameState(client, event as ReloadGameState);
                            break;
                        case EventType.PURCHASE_UNIT_REQUEST:
                            await this.handlePurchaseUnitRequest(client, event as PurchaseUnitRequest);
                            break;
                        case EventType.ATTACK_UNIT_REQUEST:
                            await this.handleAttackUnitRequest(client, event as AttackUnitRequest);
                            break;
                        default:
                            logInfo('Unknown event type', event.type);
                    }
                } catch (error) {
                    logError('Error handling event', event, error);
                    if (error instanceof GameError) {
                        client.send(new ErrorEvent(error.message || 'Unknown error'));
                    }
                }
            });

            ws.on('close', () => {
                logInfo('Client disconnected');
                this.clients = this.clients.filter(c => c !== client);
            });
        });


        const game = new Game('Test Game');
        this.gameList.addGame(game);
    }

    public broadcast(event: IEvent) {
        this.clients.forEach(client => client.send(event));
    }

    private getGameByClient(client: Client): Game {
        const game = this.gameList.games.find(g => g.players.find(p => p.client === client));
        if (!game) {
            throw new Error('Game for client not found');
        }
        return game;
    }

    private async handleGameListRequest(client: Client, event: GameListRequest) {
        client.send(new GameListResponse(this.gameList.games.map(g => g.serialize())));
    }

    private async handleJoinGameRequest(client: Client, event: JoinGameRequest) {
        const game = this.gameList.games.find(g => g.name === event.gameName);
        if (game) {
            game.addPlayer(event.playerName, client);
            game.broadcastGameState();
        } else {
            logInfo('Game not found', event.gameName);
        }
    }

    private async handleStartGame(client: Client, event: StartGame) {
        const game = this.getGameByClient(client);
        await game?.start();
        game.broadcastGameState();
    }

    private async handleEndTurn(client: Client, event: EndTurn) {
        const game = this.getGameByClient(client);
        const player = game?.players.find(p => p.client === client);
        if (!player) {
            throw new GameError('Player not found');
        }
        if (player !== game?.currentPlayer) {
            throw new GameError('Not your turn');
        }
        game?.endTurn();
        game.broadcastGameState();
    }

    private async handleMoveUnitRequest(client: Client, event: MoveUnitRequest) {
        const game = this.getGameByClient(client);
        game?.moveUnit(event.unitId, event.x, event.y);
    }

    private async handleCaptureRequest(client: Client, event: CaptureRequest) {
        const game = this.getGameByClient(client);
        game?.captureBuilding(event.unitId, event.x, event.y)
    }

    private async handleReloadGameState(client: Client, event: ReloadGameState) {
        const game = this.getGameByClient(client);
        game?.broadcastGameState();
    }

    private async handlePurchaseUnitRequest(client: Client, event: PurchaseUnitRequest) {
        const game = this.getGameByClient(client);
        // @ts-ignore
        game?.buildUnit(event.unitId, event.unitType);
    }

    private async handleAttackUnitRequest(client: Client, event: AttackUnitRequest) {
        const game = this.getGameByClient(client);
        game?.attackUnit(event.unitId, event.x, event.y);
    }
}

export const server = new Server();

