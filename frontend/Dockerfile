# Base image
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app ./ 
RUN npm install --omit=dev
RUN npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"]