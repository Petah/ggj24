import { DummyClient } from './client';
import { CreateGameRequest } from 'common/events/join-game';
import { Server } from './server';

const dummyClient = new DummyClient();

export const server = new Server();
server.startWebSocketServer();
server.handleEvent(dummyClient, new CreateGameRequest('Test Game', 'map-debug'));
