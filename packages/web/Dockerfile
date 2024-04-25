# syntax=docker/dockerfile:1

############################################################
# Build Commute.live web.
############################################################
FROM node:20-slim AS builder
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

# Build common.
COPY packages/common/package*.json packages/common/
RUN lerna --scope=*/common bootstrap --include-dependencies
COPY packages/common/*.json packages/common/
COPY packages/common/src/ packages/common/src/
RUN lerna --scope=*/common run build

# Build web.
COPY packages/web/package*.json packages/web/
RUN lerna --scope=*/web bootstrap --include-dependencies
COPY packages/web/.babelrc packages/web/
COPY packages/web/.browserslistrc packages/web/
COPY packages/web/.env packages/web/
COPY packages/web/*.json packages/web/
COPY packages/web/*.js packages/web/
COPY packages/web/src/ packages/web/src/
RUN lerna --scope=*/web run build

############################################################
# Create distribution image.
############################################################
FROM nginx:stable-alpine-slim

# Copy static files.
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
