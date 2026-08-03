FROM node:24-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY . .

EXPOSE 8000
CMD ["node", "server/js/main.js"]
