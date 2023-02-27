import { Server, Socket } from 'socket.io';
import { App } from '../app';
import { bindSocketEvents } from './events';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './types';

export const initSocket = (app: App) => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(app.getServer(), {
    cors: {
      origin: 'https://superconscience-discord-clone.netlify.app',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(socket.constructor.name);
    App.setClient(socket.id, socket);
    socket.emit('id', socket.id);

    bindSocketEvents(socket, io, app);
  });

  return io;
};
