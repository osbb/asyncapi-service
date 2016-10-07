/* eslint-env node */

import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import uuid from 'uuid';
import { getRabbitConnection } from './rabbit-connection';

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { path: '/' });
const corrToSock = {}; // correlation ID to socket ID map

server.listen(3001);

class Router {
  constructor(ch, socket) {
    this.ch = ch;
    this.socket = socket;
    this.nodeId = uuid.v4();
  }

  route(event, key) {
    this.ch.assertQueue(`${key}.listener.${this.nodeId}`, { exclusive: true })
      .then(q => {
        this.ch.consume(q.queue, msg => {
          const socketId = corrToSock[msg.properties.correlationId];
          const data = JSON.parse(msg.content.toString());
          io.to(socketId).emit(event, { data, correlationId: msg.properties.correlationId });
        }, { noAck: true });

        this.socket.on(event, payload => {
          const correlationId = payload.correlationId || uuid.v4();
          const { data } = payload;

          this.ch.assertExchange('events', 'topic', { durable: true });
          this.ch.publish(
            'events',
            key,
            new Buffer(JSON.stringify(typeof data === 'undefined' ? null : data)),
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
      router.route('LOAD_POLLS', 'polls.load');
      router.route('UPDATE_POLL', 'polls.update');
      router.route('CREATE_POLL', 'polls.create');
      router.route('DELETE_POLL', 'polls.delete');
      router.route('LOAD_FLATS', 'flats.load');
      router.route('UPDATE_FLAT', 'flats.update');
      router.route('CREATE_FLAT', 'flats.create');
      router.route('DELETE_FLAT', 'flats.delete');
      router.route('LOAD_HOUSES', 'houses.load');
      router.route('UPDATE_HOUSE', 'houses.update');
      router.route('CREATE_HOUSE', 'houses.create');
      router.route('DELETE_HOUSE', 'houses.delete');
      router.route('LOAD_SERVICES', 'services.load');
      router.route('UPDATE_SERVICE', 'services.update');
      router.route('CREATE_SERVICE', 'services.create');
      router.route('DELETE_SERVICE', 'services.delete');
      router.route('LOAD_USERS', 'users.load');
      router.route('UPDATE_USER', 'users.update');
      router.route('CREATE_USER', 'users.create');
      router.route('DELETE_USER', 'users.delete');
      router.route('LOAD_TRANSACTIONS', 'transactions.load');
      router.route('UPDATE_TRANSACTION', 'transactions.update');
      router.route('CREATE_TRANSACTION', 'transactions.create');
      router.route('DELETE_TRANSACTION', 'transactions.delete');
      router.route('LOAD_COOPERATIVES', 'cooperatives.load');
      router.route('UPDATE_COOPERATIVE', 'cooperatives.update');
      router.route('CREATE_COOPERATIVE', 'cooperatives.create');
      router.route('DELETE_COOPERATIVE', 'cooperatives.delete');
      router.route('LOGIN', 'auth.login');
      router.route('LOGOUT', 'auth.logout');
    });
});
