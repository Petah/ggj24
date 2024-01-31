import { IClient } from 'common/client';
import { Game } from './game';

export class GameList {
    public games: {
        game: Game;
        clients: IClient[];
    }[] = [];

    public addGame(game: Game) {
        this.games.push({
            game,
            clients: [],
        });
    }
}
