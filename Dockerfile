FROM node:22

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

CMD ["node", "server.js"]
