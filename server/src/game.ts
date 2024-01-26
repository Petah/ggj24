import { Client } from './client';
import { IEvent } from '../../common/event';
import { logInfo } from '../../common/log';
import { Player } from './player';
import { GameState } from './events/game-list';
import { GameStateUpdate } from '../../common/events/turn';

export class Game {
    public players: Player[] = [];
    public started: boolean = false;
    public turn: number = 0;

    constructor(public name: string) {
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
        this.started = true;
    }

    public endTurn(): void {
        this.turn++;
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
        };
    }
}
