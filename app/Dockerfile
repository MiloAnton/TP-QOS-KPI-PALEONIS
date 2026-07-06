FROM node:20-alpine

WORKDIR /usr/src/app

# On copie d'abord package.json pour profiter du cache Docker
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# On copie le reste du code
COPY . .

EXPOSE 3000

# Healthcheck simple
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
