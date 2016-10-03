/* eslint-env node */

import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import uuid from 'uuid';
import { getRabbitConnection } from './rabbit-connection';

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { path: '/' });
const nodeId = uuid.v4();
const corrToSock = {}; // correlation ID to socket ID map

server.listen(3001);

class Router {
  constructor(ch, socket) {
    this.ch = ch;
    this.socket = socket;
  }

  route(event, key) {
    this.ch.assertQueue(`${key}.listener.${nodeId}`, { exclusive: true })
      .then(q => {
        this.ch.consume(q.queue, msg => {
          const socketId = corrToSock[msg.properties.correlationId];
          const data = JSON.parse(msg.content.toString());
          io.to(socketId).emit(event, data);
        }, { noAck: true });

        this.socket.on(event, decision => {
          const correlationId = uuid.v4();

          this.ch.assertExchange('events', 'topic', { durable: true });
          this.ch.publish(
            'events',
            key,
            new Buffer(JSON.stringify(decision)),
            { persistent: true, correlationId, replyTo: q.queue }
          );
          corrToSock[correlationId] = this.socket.id;
        });
      });
  }
}

io.on('connection', socket => {
  getRabbitConnection()
    .then(conn => conn.createChannel())
    .then(ch => {
      const router = new Router(ch, socket);
      router.route('LOAD_DECISIONS', 'decisions.load');
      router.route('UPDATE_DECISION', 'decisions.update');
      router.route('CREATE_DECISION', 'decisions.create');
      router.route('LOAD_FLATS', 'flats.load');
      router.route('UPDATE_FLAT', 'flats.update');
      router.route('CREATE_FLAT', 'flats.create');
      router.route('LOAD_HOUSES', 'houses.load');
      router.route('UPDATE_HOUSE', 'houses.update');
      router.route('CREATE_HOUSE', 'houses.create');
      router.route('LOAD_SERVICES', 'services.load');
      router.route('UPDATE_SERVICE', 'services.update');
      router.route('CREATE_SERVICE', 'services.create');
      router.route('LOGIN', 'auth.login');
      router.route('LOGOUT', 'auth.logout');
    });
});
