FROM node:lts-alpine

WORKDIR /app

# install dependencies
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install

# build project
COPY tsconfig.json tsconfig.json
COPY src/ src/
RUN npm run build

#
EXPOSE 9001

# run
CMD npm start
