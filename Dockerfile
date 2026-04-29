FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY server/package.json ./

RUN npm install

COPY server/ ./

RUN npm install -g typescript @nestjs/cli

RUN npx tsc

RUN node fix-paths.js

EXPOSE 3000

CMD ["node", "dist/server/src/main.js"]
