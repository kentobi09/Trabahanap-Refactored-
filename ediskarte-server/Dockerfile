FROM node:20-alpine

WORKDIR /usr/src/app

# Install openssl for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

COPY app/package*.json ./
RUN npm install

COPY app/ ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && node index.js"]
