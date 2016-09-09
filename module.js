/* eslint-env node */

import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import amqp from 'amqplib';
import uuid from 'uuid';

const rabbitmqHost = process.env.RABBITMQ_PORT_5672_TCP_ADDR || 'localhost';
const rabbitmqPort = process.env.RABBITMQ_PORT_5672_TCP_PORT || 5672;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

server.listen(3001);

io.set('origins', '*:*');

const amqpChannelPromise = amqp.connect(`amqp://${rabbitmqHost}:${rabbitmqPort}`)
  .then(conn => conn.createChannel());

const corrToSock = {}; // correlation ID to socket ID map

io.on('connection', socket => {
  amqpChannelPromise
    .then(ch => {
      ch.assertQueue('', { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const { type, data } = JSON.parse(msg.content.toString());
            io.to(socketId).emit(type, data);
          }, { noAck: true });

          socket.on('LOAD_DECISIONS', () => {
            const correlationId = uuid.v4();

            ch.sendToQueue(
              'events',
              new Buffer(JSON.stringify({ type: 'LOAD_DECISIONS' })),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });

          socket.on('UPDATE_DECISION', decision => {
            const correlationId = uuid.v4();

            ch.sendToQueue(
              'events',
              new Buffer(JSON.stringify({ type: 'UPDATE_DECISION', decision })),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });

          socket.on('CREATE_DECISION', decision => {
            const correlationId = uuid.v4();

            ch.sendToQueue(
              'events',
              new Buffer(JSON.stringify({ type: 'CREATE_DECISION', decision })),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });
    });
});
