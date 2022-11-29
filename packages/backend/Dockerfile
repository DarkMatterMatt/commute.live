# syntax=docker/dockerfile:1

############################################################
# Build commute.live backend.
############################################################
FROM node:lts-slim AS builder
WORKDIR /app

# Install dependencies' dependencies.
# > lerna
# --> git
# ----> ssh
# ------> ca-certificates

RUN apt-get update \
    && apt-get install git ssh ca-certificates \
        -yq --reinstall --no-install-suggests --no-install-recommends --allow-downgrades --allow-remove-essential --allow-change-held-packages

# Install Lerna.
COPY package*.json .
RUN npm ci --ignore-scripts
ENV PATH /app/node_modules/.bin:$PATH
COPY *.json .

# Build api-types.
COPY packages/api-types/package*.json packages/api-types/
RUN lerna --scope=*/api-types bootstrap --include-dependencies
COPY packages/api-types/*.json packages/api-types/
COPY packages/api-types/src/ packages/api-types/src/
RUN lerna --scope=*/api-types run build

# Build backend.
COPY packages/backend/package*.json packages/backend/
RUN lerna --scope=*/backend bootstrap --include-dependencies
COPY packages/backend/*.json packages/backend/
COPY packages/backend/src/ packages/backend/src/
RUN lerna --scope=*/backend run build

# Move api-types to node_modules.
RUN rm node_modules/@commutelive/api-types && \
    mkdir node_modules/@commutelive/api-types && \
    mv packages/api-types/package.json packages/api-types/dist/ node_modules/@commutelive/api-types/

# Remove unused uWebSockets.js versions. Cuts image size by ~75MB.
RUN ls node_modules/uWebSockets.js/*.node packages/backend/node_modules/uWebSockets.js/*.node \
    | grep -v "$(node -p "process.platform+'_'+process.arch+'_'+process.versions.modules")" \
    | xargs rm

# Remove dev dependencies.
COPY scripts/printDependencies.js scripts/printDependencies.js
RUN node scripts/printDependencies.js package-lock.json dev \
    | grep -v "\w/node_modules" \
    | xargs rm -rf

############################################################
# Extract distribution image.
############################################################
FROM node:lts-slim
WORKDIR /app/packages/backend

# Copy runtime files.
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules/ /app/node_modules/
COPY --from=builder /app/packages/backend/package.json /app/packages/backend/package.json
COPY --from=builder /app/packages/backend/node_modules/ /app/packages/backend/node_modules/
COPY --from=builder /app/packages/backend/dist/ dist/

# uWebSockets.js is fussy; test that it loads
RUN node -e "require('uWebSockets.js')"

# Set start command.
CMD ["npm", "start"]
