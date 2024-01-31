import { CreateGameRequest } from 'common/events/join-game';
import { Server } from './server';
import { Dummy } from './dummy';


export const server = new Server();
const dummyClient = new Dummy('Auto Host', server);
server.startWebSocketServer();
server.handleEvent(dummyClient, new CreateGameRequest('Default Game', 'map-debug'));
