# @commutelive/web

This package is the main frontend of [Commute.live](https://commute.live), which provides a user-friendly interface to view vehicles on one or more public transport routes.

Deployed on GitHub Pages.

## Environmental variables

See the [example `.env`](./example.env) file. A default value of ⭐ indicates that the variable is required.

| Name                          | Description                                                                                           | Type      | Default       |
| :---------------------------- | :---------------------------------------------------------------------------------------------------- | :-------- | :------------ |
| `API_URL`                     | Base URL for the [Commute.live backend](../backend/).                                                 | string    | ⭐            |
| `WS_URL`                      | WebSocket connection URL for the [Commute.live backend](../backend/).                                 | string    | ⭐            |
| `PWA_BASE_URL`                | URL that this webpage will be hosted at.                                                              | string    | ⭐            |
| `GMAPS_KEY`                   | API key for [Google Maps](https://developers.google.com/maps/documentation/javascript/get-api-key).   | string    | ⭐            |
| `GTAG_ID`                     | Google tag for analytics / advertising.                                                               | string    | ⭐            |
| `LINK_GITHUB`                 | Link to the main Commute.live GitHub repository.                                                      | string    | ⭐            |
| `LINK_GITHUB_CLIENT`          | Link to the website section of Commute.live GitHub repository.                                        | string    | ⭐            |
| `LINK_GITHUB_SERVER`          | Link to the backend section of Commute.live GitHub repository.                                        | string    | ⭐            |
| `LINK_AT_API`                 | Link to the [Auckland Transport Developer Portal](https://dev-portal.at.govt.nz/).                    | string    | ⭐            |
