FROM node:21.6.1

WORKDIR /usr/src/app/

COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/
COPY express.js /usr/src/app/
COPY public /usr/src/app/public

EXPOSE 3000

RUN npm install

CMD ["node", "express.js"]