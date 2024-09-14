FROM node:20.15.1

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY *.json ./
COPY src ./


RUN npm install -D typescript
RUN npm install
RUN npm run build
USER node
COPY --chown=node:node . . 

CMD [ "npm", "start" ]

