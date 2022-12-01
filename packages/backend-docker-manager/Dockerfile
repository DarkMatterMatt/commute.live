# syntax=docker/dockerfile:1

############################################################
# Build Commute.live backend Docker manager.
############################################################
FROM node:lts-alpine AS builder
WORKDIR /app

# Install Lerna.
COPY package*.json .
RUN npm ci --ignore-scripts
ENV PATH /app/node_modules/.bin:$PATH
COPY *.json .

# Build backend-docker-manager.
COPY packages/backend-docker-manager/package*.json packages/backend-docker-manager/
RUN lerna --scope=*/backend-docker-manager bootstrap --include-dependencies
COPY packages/backend-docker-manager/*.json packages/backend-docker-manager/
COPY packages/backend-docker-manager/src/ packages/backend-docker-manager/src/
RUN lerna --scope=*/backend-docker-manager run build

# Remove dev dependencies.
COPY scripts/printDependencies.js scripts/printDependencies.js
RUN node scripts/printDependencies.js package-lock.json dev \
    | grep -v "\w/node_modules" \
    | xargs rm -rf

############################################################
# Extract distribution image.
############################################################
FROM node:lts-alpine
WORKDIR /app/packages/backend-docker-manager

# Install docker-cli.
RUN apk add --update --no-cache docker-cli

# Copy runtime files.
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules/ /app/node_modules/
COPY --from=builder /app/packages/backend-docker-manager/package.json /app/packages/backend-docker-manager/package.json
COPY --from=builder /app/packages/backend-docker-manager/node_modules/ /app/packages/backend-docker-manager/node_modules/
COPY --from=builder /app/packages/backend-docker-manager/dist/ dist/

# Set start command.
CMD ["npm", "start"]
