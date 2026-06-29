FROM node:22

WORKDIR /app

COPY backend/ ./backend/
COPY database/ ./database/

WORKDIR /app/backend
RUN npm install

WORKDIR /app/database/seeds
RUN npm install

WORKDIR /app/backend

CMD ["node", "server.js"]
