import { GameState } from './events/game-list';
import { Unit } from '../../common/unit';

export const state: {
    playerName: string;
    cursorX: number;
    cursorY: number;
    game?: GameState;
    selectedUnit?: Unit;
} = {
    playerName: 'Test Player 1',
    cursorX: parseInt(localStorage.getItem('cursorX') || '20'),
    cursorY: parseInt(localStorage.getItem('cursorY') || '20'),
    game: undefined,
    selectedUnit: undefined,
};
