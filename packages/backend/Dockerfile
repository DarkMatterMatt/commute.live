# syntax=docker/dockerfile:1

############################################################
# Build commute.live server.
############################################################
FROM node:lts-alpine AS builder
WORKDIR /app

# Install dependencies's dependencies.
# > gtfs
# - > sqlite3
# - - > python
# > uWebSockets.js
# - > gcompat
RUN apk add python3 make g++ gcompat && \
    ln -sf python3 /usr/bin/python

# Install production/runtime dependencies.
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install --omit=dev && \
    cp -r node_modules node_modules_prod

# Install the rest of the dependencies.
RUN npm install

# Remove unused uWebSockets.js versions. Cuts image size by ~75MB.
RUN ls node_modules_prod/uWebSockets.js/*.node \
    | grep -v "$(node -p "process.platform+'_'+process.arch+'_'+process.versions.modules")" \
    | xargs rm

# Build server.
COPY tsconfig.json tsconfig.json
COPY src/ src/
RUN npm run build

############################################################
# Extract distribution image.
############################################################
FROM node:lts-alpine
WORKDIR /app

# Copy runtime files.
COPY --from=builder /app/package.json package.json
COPY --from=builder /app/node_modules_prod/ node_modules/
COPY --from=builder /app/dist/ dist/

# uWebSockets.js is fussy; copy extra dependency and test that it loads
COPY --from=builder /lib/ld-linux-x86-64.so.2 /lib/ld-linux-x86-64.so.2
RUN node -p "require('uWebSockets.js')"

# Declare TCP port & start command.
EXPOSE 9001
CMD ["npm", "start"]
