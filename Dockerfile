FROM node:22

WORKDIR /app

COPY package.json ./
COPY backend/package*.json ./backend/
RUN npm install

COPY backend/ ./backend/
COPY database/ ./database/

WORKDIR /app/backend

CMD ["node", "server.js"]
