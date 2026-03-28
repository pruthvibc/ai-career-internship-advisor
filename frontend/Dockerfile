FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

RUN cp -r .next/static .next/standalone/.next/static

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]