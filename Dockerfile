FROM node:20-alpine

WORKDIR /app

# ── Build React frontend ──────────────────────────────────────────────────────
COPY client/package*.json client/
RUN cd client && npm install

COPY client/ client/
RUN cd client && npm run build

# ── Install backend ───────────────────────────────────────────────────────────
COPY server/package*.json server/
RUN cd server && npm install --omit=dev

COPY server/ server/

# Bundle existing .db files as seed data (copied to volume on first start)
RUN mkdir -p /app/server/data_seed && \
    cp -r /app/server/data/. /app/server/data_seed/ 2>/dev/null || true

# ── Startup ───────────────────────────────────────────────────────────────────
COPY start_fly.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080
ENV PORT=8080
ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["/start.sh"]
