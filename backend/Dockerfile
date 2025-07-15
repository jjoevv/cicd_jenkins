FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "start"]
# This Dockerfile sets up a Node.js application in a production environment.
# It uses the official Node.js 20 Alpine image for a lightweight container. 