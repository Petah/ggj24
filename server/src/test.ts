import { Game } from './game';
import { UnitType, Infantry, Factory } from '../../common/unit';

(async () => {
    const game = new Game('Test Game');
    game.addPlayer('Player 1');
    game.addPlayer('Player 2');
    await game.start();
    // console.log(game.serialize());

    const factory = game.units.find(unit => unit.type === UnitType.FACTORY && unit.player === 'Player 1') as Factory;
    game.buildUnit(factory.id, UnitType.INFANTRY);

    const infantry = game.units.find(unit => unit.type === UnitType.INFANTRY && unit.player === 'Player 1') as Infantry;
    console.log(infantry)
    game.moveUnit(infantry.id, infantry.x + 2, infantry.y + 3);
    game.endTurn();

})();
