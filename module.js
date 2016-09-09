/* eslint-env node */

import express from 'express';
import http from 'http';
import socketIO from 'socket.io';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

server.listen(3001);

io.set('origins', '*:*');

const mongoHost = process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost';
const mongoPort = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
const connection = MongoClient.connect(`mongodb://${mongoHost}:${mongoPort}`); // connection promise
const decisionsCollectionPromise = connection.then(db => db.collection('decisions'));

function loadDecisions(socket) {
  decisionsCollectionPromise
    .then(c => c.find({}).toArray())
    .then(data => socket.emit('LOAD_DECISIONS', data));
}

function updateDecision(socket, decision) {
  const { title, answer } = decision;

  decisionsCollectionPromise
    .then(c => c.updateOne({ _id: ObjectId(decision._id) }, { $set: { title, answer } }))
    .then(() => decisionsCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(decision._id) }, {})))
    .then(data => socket.emit('UPDATE_DECISION', data));
}

function createDecision(socket, decision) {
  const { title, answer } = decision;

  decisionsCollectionPromise
    .then(c => c.insertOne({ title, answer }, {}))
    .then(res => decisionsCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(res.insertedId) }, {})))
    .then(data => socket.emit('CREATE_DECISION', data));
}

io.on('connection', socket => {
  socket.on('LOAD_DECISIONS', () => loadDecisions(socket));
  socket.on('UPDATE_DECISION', decision => updateDecision(socket, decision));
  socket.on('CREATE_DECISION', decision => createDecision(socket, decision));
});
