# @commutelive/backend

The main backend of [Commute.live](https://commute.live), which aggregates static and realtime data from multiple sources and exposes it via an API.

## Environmental variables

See the [example `.env`](./example.env) file. A default value of ⭐ indicates that the variable is required.

| Name                          | Description                                                                                                   | Type      | Default       |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------ | :-------- | :------------ |
| `AUCKLAND_TRANSPORT_KEY`      | API key for the [Auckland Transport Developer Portal](https://dev-portal.at.govt.nz/).                        | string    | ⭐            |
| `NSW_KEY`                     | API key for the [NSW Open Data Hub](https://opendata.transport.nsw.gov.au/).                                  | string    | ⭐            |
| `CACHE_DIR`                   | Directory to store semi-permanent data (e.g. processed GTFS data that changes infrequently).                  | string    | 'cache'       |
| `LOG_FORMAT`                  | Log filename format for [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file).  | string    | '%DATE%.log'  |
| `FETCH_URL_WHEN_LOADED`       | The backend will send a GET request to this URL when it is ready to serve requests.                           | string    | undefined     |
| `PORT`                        | Port to expose the API with.                                                                                  | number    | 9001          |
| `SSL_CERT_FILE`               | SSL certificate file in the PEM format.                                                                       | string    | undefined     |
| `SSL_KEY_FILE`                | SSL key file in the PEM format.                                                                               | string    | undefined     |
| `USE_SSL`                     | Enables SSL, disabled by default.                                                                             | boolean   | false         |
