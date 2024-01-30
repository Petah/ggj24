import { GameState } from './events/game-list';
import { Unit } from 'common/unit';
import { InGame } from './scenes/in-game';

const queryString = new URLSearchParams(window.location.search);
// @todo dynamic player name
const playerName = queryString.get('playerName') || 'Player1';

export const state: {
    playerName: string;
    game?: GameState;
    latestGameState?: GameState;
    tick: number;
    selectedUnit?: Unit;
    scene?: InGame;
    winningPlayer?: string;
} = {
    playerName,
    game: undefined,
    latestGameState: undefined,
    tick: 0,
    selectedUnit: undefined,
    scene: undefined,
};

export function isOurTurn() {
    return state.game?.currentPlayer === state.playerName;
}