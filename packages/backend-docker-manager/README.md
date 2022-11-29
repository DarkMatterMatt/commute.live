# Container manager for the Commute.Live backend

Start this container with the following command:

```sh
docker run -d --name ANYTHING \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$(pwd)"/DOCKER_ENV_DIR:/env \
    -p <MANAGER_PORT>:<MANAGER_PORT> \
    -p <WORKER_PORT>:<WORKER_PORT> \
    ghcr.io/darkmattermatt/commute.live-manager:main
```

- `DOCKER_ENV_DIR` is a directory containing the .env file (and SSL certificates for the manager and workers).
- `MANAGER_PORT` is the port that the manager will be listening for GitHub's webhooks.
- `WORKER_PORT` is the port that the workers will be providing their API through (i.e. <https://api.commute.live/v3/websocket>).
