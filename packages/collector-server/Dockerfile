FROM node:20-alpine

WORKDIR /app

COPY server.js .

EXPOSE 8080

ENV PORT=8080
ENV STORAGE_DIR=/app/submissions

VOLUME ["/app/submissions"]

CMD ["node", "server.js"]
