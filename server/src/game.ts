import { Client } from './client';
import { IEvent } from '../../common/event';
import { logInfo } from '../../common/log';
import { Player } from './player';
import { GameState } from './events/game-list';
import { GameStateUpdate } from '../../common/events/turn';
import { GameError } from './error';

export class Game {
    public players: Player[] = [];
    public started: boolean = false;
    public turn: number = 0;
    public currentPlayer?: Player;

    constructor(
        public name: string,
    ) {
    }

    public addPlayer(playerName: string, client: Client): void {
        const existingPlayer = this.players.find(player => player.name === playerName);
        if (existingPlayer) {
            existingPlayer.client = client;
        } else {
            this.players.push(new Player(playerName, client));
        }
    }

    public start(): void {
        if (this.started) {
            throw new GameError('Game already started');
        }
        this.started = true;
        this.turn = 1;
        this.currentPlayer = this.players[0];
    }

    public endTurn(): void {
        const currentPlayerIndex = this.players.indexOf(this.currentPlayer!);
        if (currentPlayerIndex === this.players.length - 1) {
            this.turn++;
            this.currentPlayer = this.players[0];
        } else {
            this.currentPlayer = this.players[currentPlayerIndex + 1];
        }
    }

    public broadcast(event: IEvent): void {
        logInfo('Broadcasting event to game', this.name, event);
        for (const player of this.players) {
            player.client.send(event);
        }
    }

    public broadcastGameState(): void {
        this.broadcast(new GameStateUpdate(this.serialize()));
    }

    public serialize(): GameState {
        return {
            name: this.name,
            players: this.players.map(player => ({
                name: player.name,
            })),
            turn: this.turn,
            currentPlayer: this.currentPlayer?.name,
        };
    }
}
