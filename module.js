/* eslint-env node */

import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import amqp from 'amqplib';
import uuid from 'uuid';
import winston from 'winston';

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { path: '/' });
const nodeId = uuid.v4();
const corrToSock = {}; // correlation ID to socket ID map

server.listen(3001);

const connectToRabbitMQ = new Promise(resolve => {
  function openConnection() {
    winston.info('Connecting to RabbitMQ...');
    amqp.connect(rabbitmqUrl)
      .then(conn => {
        winston.info('Connected!');
        resolve(conn);
      })
      .catch(() => {
        winston.info('Connection failure. Retry in 5 sec.');
        setTimeout(() => {
          openConnection();
        }, 5000);
      });
  }

  openConnection();
});

io.on('connection', socket => {
  connectToRabbitMQ
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

      ch.assertQueue(`flats.load.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('LOAD_FLATS', data);
          }, { noAck: true });

          socket.on('LOAD_FLATS', () => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'flats.load',
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

      ch.assertQueue(`flats.update.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('UPDATE_FLAT', data);
          }, { noAck: true });

          socket.on('UPDATE_FLAT', flat => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'flats.update',
              new Buffer(JSON.stringify(flat)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`flats.create.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('CREATE_FLAT', data);
          }, { noAck: true });

          socket.on('CREATE_FLAT', flat => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'flats.create',
              new Buffer(JSON.stringify(flat)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`houses.load.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('LOAD_HOUSES', data);
          }, { noAck: true });

          socket.on('LOAD_HOUSES', () => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'houses.load',
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

      ch.assertQueue(`houses.update.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('UPDATE_HOUSE', data);
          }, { noAck: true });

          socket.on('UPDATE_HOUSE', house => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'houses.update',
              new Buffer(JSON.stringify(house)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`houses.create.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('CREATE_HOUSE', data);
          }, { noAck: true });

          socket.on('CREATE_HOUSE', house => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'houses.create',
              new Buffer(JSON.stringify(house)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`auth.login.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('LOGIN', data);
          }, { noAck: true });

          socket.on('LOGIN', data => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'auth.login',
              new Buffer(JSON.stringify(data)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });

      ch.assertQueue(`auth.logout.listener.${nodeId}`, { exclusive: true })
        .then(q => {
          ch.consume(q.queue, msg => {
            const socketId = corrToSock[msg.properties.correlationId];
            const data = JSON.parse(msg.content.toString());
            io.to(socketId).emit('LOGOUT', data);
          }, { noAck: true });

          socket.on('LOGOUT', data => {
            const correlationId = uuid.v4();

            ch.assertExchange('events', 'topic', { durable: true });
            ch.publish(
              'events',
              'auth.logout',
              new Buffer(JSON.stringify(data)),
              { persistent: true, correlationId, replyTo: q.queue }
            );
            corrToSock[correlationId] = socket.id;
          });
        });
    });
});
