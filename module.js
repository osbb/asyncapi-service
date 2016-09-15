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
const nodeId = uuid.v4();
const corrToSock = {}; // correlation ID to socket ID map

server.listen(3001);
io.set('origins', '*:*');

io.on('connection', socket => {
  amqp.connect(`amqp://${rabbitmqHost}:${rabbitmqPort}`)
    .then(conn => conn.createChannel())
    .then(ch => {
      ch.assertQueue(`decisions.load.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('LOAD_DECISIONS', data);
          }, { noAck: true });

          socket.on('LOAD_DECISIONS', () => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'decisions.load',
              new Buffer(JSON.stringify(null)),
              {
                persistent: true,
                correlationId,
                replyTo: q.queue,
              }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`decisions.update.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('UPDATE_DECISION', data);
          }, { noAck: true });

          socket.on('UPDATE_DECISION', decision => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'decisions.update',
              new Buffer(JSON.stringify(decision)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`decisions.create.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('CREATE_DECISION', data);
          }, { noAck: true });

          socket.on('CREATE_DECISION', decision => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'decisions.create',
              new Buffer(JSON.stringify(decision)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });
    });
});
