FROM node:16.20.2-alpine3.18

RUN addgroup app && adduser -S -G app app
WORKDIR /app

COPY package*.json ./
RUN npm config set cache /app/.npm-cache && npm install

COPY . . 

USER app

EXPOSE 8080

CMD ["npm", "start"]
