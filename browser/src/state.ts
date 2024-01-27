import { GameState } from './events/game-list';

export const state: {
    playerName: string;
    cursorX: number;
    cursorY: number;
    game?: GameState;
} = {
    playerName: 'Test Player 1',
    cursorX: parseInt(localStorage.getItem('cursorX') || '20'),
    cursorY: parseInt(localStorage.getItem('cursorY') || '20'),
    game: undefined,
};
