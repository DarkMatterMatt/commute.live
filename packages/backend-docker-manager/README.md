# @commutelive/backend-docker-manager

This is deployed on the server to automatically update the [Commute.live](https://commute.live) backend with zero downtime.

## Usage

Start this container with the following command:

```sh
docker run -d --name <ANYTHING> \
    -e ENV_FILE=/env/.env \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v <DOCKER_ENV_DIR>:/env:ro \
    -v <DOCKER_LOGS_DIR>:/logs \
    -v <DOCKER_CACHE_DIR>:/cache \
    -p <MANAGER_PORT>:<MANAGER_PORT> \
    -p <WORKER_PORT>:<WORKER_PORT> \
    --restart unless-stopped \
    ghcr.io/darkmattermatt/commute.live-manager:main
```

- `ENV_FILE` is the .env file, containing environmental variables for the manager and workers.
- `DOCKER_ENV_DIR` (optional) is a directory containing the .env file (and SSL certificates for the manager and workers).
- `DOCKER_LOGS_DIR` and `DOCKER_CACHE_DIR` (both optional) are additional bind mounts that will be passed on to the workers.
- `MANAGER_PORT` matches the environmental variable.
- `WORKER_PORT` is the port that the workers will be providing their API through (i.e. <https://api.commute.live/v3/>).

## Environmental variables

See the [example `.env`](./example.env) file. A default value of ⭐ indicates that the variable is required.

| Name                              | Description                                                                               | Type      | Default       |
| :-------------------------------- | :---------------------------------------------------------------------------------------- | :-------- | :------------ |
| `ENV_FILE`                        | File path for the `.env` file, containing variables for the manager and workers.          | string    | ⭐            |
| `MANAGER_PORT`                    | The manager will listen for GitHub `package` webhook events on this port.                 | string    | ⭐            |
| `MANAGER_INTERNAL_PORT`           | The backend will send a GET request to this URL when it is ready to serve requests.       | number    | 8080          |
| `MANAGER_GITHUB_WEBHOOK_SECRET`   | Secret used for validating GitHub webhook events.                                         | string    | ⭐            |
| `MANAGER_SSL_CERT_CHECK_FREQ`     | Check for SSL certificate updates every `n` milliseconds.                                 | number    | 600000        |
| `MANAGER_SSL_CERT_FILE`           | SSL certificate file in the PEM format.                                                   | string    | undefined     |
| `MANAGER_SSL_KEY_FILE`            | SSL key file in the PEM format.                                                           | string    | undefined     |
| `MANAGER_USE_SSL`                 | Enables SSL, disabled by default.                                                         | boolean   | false         |
| `MANAGER_WORKER_IMAGE`            | Commute.live backend Docker image.                                                        | string    | ⭐            |
| `MANAGER_WORKER_MAX_MEMORY`       | Limit Docker container's max memory. E.g. `1048576k`, `1024m`, `1g`.                      | string    | undefined     |
| `MANAGER_WORKER_NAME`             | Name of the Commute.live backend Docker container.                                        | string    | ⭐            |
| Backend environmental variables   | [Commute.live backend environmental variables](../backend/#environmental-variables) to be passed on | | ⭐            |
