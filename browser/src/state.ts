import { GameState } from './events/game-list';

export const state: {
    playerName: string;
    game?: GameState;
} = {
    playerName: 'Test Player 1',
    game: undefined,
};
