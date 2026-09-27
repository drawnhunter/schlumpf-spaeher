FROM node:22-bookworm-slim
WORKDIR /srv
ENV NODE_ENV=production
COPY app/ ./
RUN cd server && npm install --omit=dev
ENV PORT=4178 DB_PATH=/data/spaeher.db
VOLUME /data
EXPOSE 4178
CMD ["node", "server/server.js"]
