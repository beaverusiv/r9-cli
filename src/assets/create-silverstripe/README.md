# PROJECT_NAME

## Overview

This is a SilverStripe application with support for docker.

## Installation

Clone repository and run `docker-compose -f docker-compose.production.yml -f docker-compose.development.yml up`

## Development

Running the above command will bring up everything needed to start development. If you setup other processes needed for development, please ensure they are triggered with a `docker-compose [config] up`.

Once `docker-compose` has finished running, the application is available at `http://localhost:8081`.

### Watchers

To set up some new watchers for e.g. SCSS you will need to create a watcher task in Gulp and use `command: './node_modules/.bin/gulp watch'` in your `docker-compose.development.yml` file for the npm container.

### Installing packages

#### PHP

```bash
docker-compose -f docker-compose.production.yml -f docker-compose.development.yml run PROJECT_NAME-composer require --ignore-platform-reqs symfony/console
```

This command will install `symfony/console`. The `--ignore-platform-reqs` is needed because composer is not run inside the PHP container and cannot see those system packages.

#### Javascript

```bash
docker-compose -f docker-compose.production.yml -f docker-compose.development.yml run PROJECT_NAME-npm npm install express
```

This command will install `express`.

### SSPak

```bash
docker-compose -f docker-compose.production.yml -f docker-compose.development.yml run PROJECT_NAME-sspak save /app /app/tmp.sspak
```

This command will make an .sspak in the project root. SSPak requires your environment variables to run, so make sure all database-specific variables are set in .env file, and not just the PHP container.

### Troubleshooting

If you are having issues with Docker, you can refer to the [Room9 Docker page](https://room9nz.atlassian.net/wiki/spaces/RI/pages/388628481/Docker#Docker-Troubleshooting) for troubleshooting info. If you encounter an issue not mentioned on this page **add it**.
