import { GameState } from './events/game-list';
import { Unit } from '../../common/unit';
import { InGame } from './scenes/in-game';

const queryString = new URLSearchParams(window.location.search);
// @todo dynamic player name
const playerName = queryString.get('playerName') || 'Player1';

export const state: {
    playerName: string;
    cursorX: number;
    cursorY: number;
    game?: GameState;
    selectedUnit?: Unit;
    scene?: InGame;
    winningPlayer?: string;
} = {
    playerName,
    cursorX: parseInt(localStorage.getItem('cursorX') || '20'),
    cursorY: parseInt(localStorage.getItem('cursorY') || '20'),
    game: undefined,
    selectedUnit: undefined,
    scene: undefined,
};

export function isOurTurn() {
    return state.game?.currentPlayer === state.playerName;
}