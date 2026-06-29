FROM node:22

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

WORKDIR /app

COPY backend/ ./backend/
COPY database/ ./database/

WORKDIR /app/backend

CMD ["node", "server.js"]
