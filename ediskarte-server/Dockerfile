FROM node:20-alpine

WORKDIR /usr/src/app

# Install openssl and C++ build tools for native npm modules
RUN apk add --no-cache openssl python3 make g++

COPY app/package*.json ./
RUN npm install

# Copy app source files
COPY app/ ./

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push --accept-data-loss && node index.js"]
