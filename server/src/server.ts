import WebSocket from 'ws';
import { GameList } from './game-list';
import { Game } from './game';
import { logInfo } from '../../common/log';
import { Client } from './client';
import { EventType, IEvent } from '../../common/event';
import { GameListResponse, GameState } from '../../common/events/game-list';
import { JoinGameRequest, PlayerJoinedEvent } from '../../common/events/join-game';

function serializeGameState(game: Game): GameState {
    return {
        name: game.name,
        players: game.players.map(player => ({
            name: player.name,
        })),
    };
}

export class Server {
    private wss: WebSocket.Server;
    private gameList: GameList = new GameList();
    private clients: Client[] = [];

    constructor() {
        this.wss = new WebSocket.Server({ port: 8080 });

        this.wss.on('connection', (ws: WebSocket) => {
            logInfo('New client connected');
            const client = new Client(ws);
            this.clients.push(client);

            ws.on('message', (eventString: string) => {
                const event = JSON.parse(eventString) as IEvent;
                logInfo('Received message', event);
                switch (event.type) {
                    case EventType.GAME_LIST_REQUEST:
                        client.send(new GameListResponse(this.gameList.games.map(serializeGameState)));
                        break;
                    case EventType.JOIN_GAME_REQUEST:
                        const joinGameRequest = event as JoinGameRequest;
                        const game = this.gameList.games.find(g => g.name === joinGameRequest.gameName);
                        if (game) {
                            game.addPlayer(joinGameRequest.playerName, client);
                            game.broadcast(new PlayerJoinedEvent(serializeGameState(game)));
                        } else {
                            logInfo('Game not found', joinGameRequest.gameName);
                        }
                        break;
                    // case 'create-game':
                    //     const game = new Game();
                    //     this.gameList.addGame(game);
                    //     client.send({
                    //         type: 'create-game',
                    //         game: {
                    //             id: game.id,
                    //             name: game.name,
                    //             players: game.players.length,
                    //         },
                    //     });
                    //     break;
                    default:
                        logInfo('Unknown event type', event.type);
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
}

export const server = new Server();

