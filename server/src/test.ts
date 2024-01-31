import { Ai } from 'common/ai';
import { Server } from './server';
import { CreateGameRequest, JoinGameRequest } from 'common/events/join-game';
import { RestartGame } from 'common/events/turn';
import { Dummy } from './dummy';

(async () => {
    const server = new Server();
    const ai1 = new Ai('AI 1', server, {
        maxTurns: 1,
    });
    const dummy = new Dummy('Dummy', server);
    await server.handleEvent(dummy, new CreateGameRequest('Test Game', 'map-debug', dummy.playerName));
    await server.handleEvent(ai1, new JoinGameRequest(ai1.playerName, 'Test Game'));
    await server.handleEvent(dummy, new RestartGame());
    // const game = new Game('Test Game');
    // game.addPlayer('Player 1', ai1);
    // game.addPlayer('Player 2', ai2);
    // await game.start();
    // console.log(game.serialize());

    // const factory = game.units.find(unit => unit.type === UnitType.FACTORY && unit.player === 'Player 1') as Factory;
    // game.buildUnit(factory.id, UnitType.INFANTRY);

    // const infantry = game.units.find(unit => unit.type === UnitType.INFANTRY && unit.player === 'Player 1') as Infantry;
    // console.log(infantry)
    // game.moveUnit(infantry.id, infantry.x + 2, infantry.y + 3);
    // game.endTurn();

})();
