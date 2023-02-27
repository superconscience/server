import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import compression from 'compression';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { Server } from 'socket.io';
import serversRoutes from './routes/servers';
import usersRoutes from './routes/users';
import personalMessagesRoutes from './routes/personal-messages';
import chatsRoutes from './routes/chats';
import channelsRoutes from './routes/channels';
import testRoutes from './routes/test';
import { initSocket } from './socket';
import cors from 'cors';
import * as passportConfig from './passport';
import env from './config';
import passport from 'passport';
import { AppSocket, ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from './socket/types';

declare module 'express-session' {
  interface SessionData {
    returnTo: string;
  }
}

const whitelist = [
  'http://localhost:3000',
  'http://localhost:8005',
  'https://superconscience-discord-clone.netlify.app',
];

mongoose.set('strictQuery', true);

const mongooseUrl =
  'mongodb+srv://superconscience:QrtczmnqiciavAoI@node.wiauk.mongodb.net/discord?retryWrites=true&w=majority';

type AppClients = Record<string, AppSocket>;

export class App {
  private server: http.Server;
  private port: number;

  private static io: Server;
  private static clients: AppClients = {};

  static getIo(): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    return App.io;
  }

  constructor(port: number) {
    this.port = port;
    const app = express();

    app.set('port', this.port || 3000);
    // app.use((_req, res, next) => {
    //   res.header('Access-Control-Allow-Origin', '*');
    //   res.header('Access-Control-Allow-Headers', '*');
    //   res.header('Access-Control-Allow-Methods', 'POST, PUT, PATCH, GET, DELETE, OPTIONS');
    
    //   next();
    // });
    app.use(express.static(path.join(__dirname, '../../client/dist')));

    app.use(
      cors({
        origin: function (origin, callback) {
          if (origin && whitelist.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(null, true);
            // callback(new Error('Not allowed by CORS'))
          }
        },
        credentials: true,
      })
    );
    app.use(compression());
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(
      session({
        resave: true,
        saveUninitialized: true,
        secret: 'sessionsecret',
        store: new MongoStore({
          mongoUrl: mongooseUrl,
          mongoOptions: {
            connectTimeoutMS: 10000,
          },
        }),
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    app.use((req, res, next) => {
      res.locals.user = req.user;
      next();
    });
    app.use((req, res, next) => {
      // After successful login, redirect back to the intended page
      if (
        !req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)
      ) {
        req.session.returnTo = req.path;
      } else if (req.user && req.path == '/account') {
        req.session.returnTo = req.path;
      }
      next();
    });

    // TODO: add validation
    app.use('/test', testRoutes);
    app.use('/servers', serversRoutes);
    app.use('/users', usersRoutes);
    app.use('/personal-messages', personalMessagesRoutes);
    app.use('/chats', chatsRoutes);
    app.use('/channels', channelsRoutes);

    this.server = new http.Server(app);

    App.io = initSocket(this);
  }

  public Start() {
    if (process.env.MODE === 'front') {
      this.server.listen(this.port, () => {
        console.log(`Server listening on port ${this.port}. No database connection`);
      });
      return;
    }
    mongoose
      // .connect(env.MONGO_URI_LOCAL)
      .connect(mongooseUrl)
      .then((result) => {
        // serversController.seedServers();
        this.server.listen(this.port, () => {
          console.log(`Server listening on port ${this.port}.`);
        });
      })
      .catch((err) => console.log(err));
  }

  static getClients(): AppClients {
    return App.clients;
  }

  static getClient(id: string): AppSocket {
    return App.clients[id];
  }

  static setClient(id: string, value: AppSocket): void {
    App.clients[id] = value;
  }

  getServer(): http.Server {
    return this.server;
  }
}

new App(Number(process.env.PORT ?? 8000)).Start();
