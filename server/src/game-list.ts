import { Game } from './game';

export class GameList {
    public games: Game[] = [];

    public addGame(game: Game) {
        this.games.push(game);
    }
}
