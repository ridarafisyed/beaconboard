FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && npm start"]