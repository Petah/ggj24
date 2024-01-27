import { Game } from './game';
import { UnitType, Infantry } from '../../common/unit';

(async () => {
    const game = new Game('Test Game');
    game.addPlayer('Player 1');
    game.addPlayer('Player 2');
    await game.start();
    // console.log(game.serialize());

    const infantry = game.units.find(unit => unit.type === UnitType.INFANTRY && unit.player === 'Player 1') as Infantry;
    // console.log(infantry)

    game.moveUnit(infantry.id, infantry.x + 2, infantry.y + 3);
})();
