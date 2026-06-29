FROM node:22

WORKDIR /app

COPY backend/ ./backend/
COPY database/ ./database/

WORKDIR /app/backend

RUN npm install

CMD ["node", "server.js"]
