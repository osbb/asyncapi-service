FROM node:6

EXPOSE 3001

WORKDIR /app

COPY . /app/

RUN npm install --production

CMD npm start
