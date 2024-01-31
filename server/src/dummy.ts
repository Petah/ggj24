import { ClientType, IClient } from 'common/client';
import { EventType, IEvent } from 'common/event';
import { EndTurn, GameStateUpdate } from 'common/events/turn';
import { logError } from 'common/log';
import { GameState } from 'common/events/game-list';
import { Server } from './server';

export class Dummy implements IClient {
    public type = ClientType.DUMMY;
    public state: object = {};

    public constructor(
        public playerName: string,
        private server: Server,
    ) {
    }

    public async send(event: IEvent) {
        try {
            switch (event.type) {
                case EventType.GAME_STATE_UPDATE:
                    await this.handleGameStateUpdate(event as GameStateUpdate);
                    break;
            }
        } catch (error) {
            logError('Error handling AI event', this.playerName, event, error);
        }
    }

    private async handleGameStateUpdate({ game }: GameStateUpdate) {
        if (!this.isOurTurn(game)) {
            return;
        }
        await this.server.handleEvent(this, new EndTurn());
    }

    private isOurTurn(game: GameState) {
        return game.currentPlayer === this.playerName;
    }
}
