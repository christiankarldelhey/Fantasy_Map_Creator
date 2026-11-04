FROM node:22

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/ ./backend/
COPY database/ ./database/
COPY mind-engine/requirements.txt ./mind-engine/requirements.txt

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r ./mind-engine/requirements.txt

COPY mind-engine/ ./mind-engine/
COPY start-production.sh ./start-production.sh
RUN chmod +x ./start-production.sh

WORKDIR /app/backend
RUN npm install

WORKDIR /app/database/seeds
RUN npm install

COPY mind-studio/ /app/mind-studio/
WORKDIR /app/mind-studio
RUN npm ci && npm run build

WORKDIR /app/backend

CMD ["/app/start-production.sh"]
