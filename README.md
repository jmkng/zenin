# Zenin 🌩️

A simple infrastructure monitoring tool.

![Zenin](../assets/01.png?raw=true)

> [!Tip]
> Additional images of the user interface are stored in the [Assets](https://github.com/jmkng/zenin/tree/assets) branch. Feel free to provide feedback on the design.

## Summary

> [!WARNING]  
> The information below may describe how something is *planned* to work, but because the project is young, the implementation may be a work in progress. A note will be left for these cases.

Zenin is an infrastructure monitoring tool. It is something you can host on your own hardware (or not) to help you understand which of your services are considered "ok", which are "dead" and which may be in a degraded "warn" state.

It is an evolution of other tools like Nagios and Uptime Kuma.

|            | Nagios              | Uptime Kuma        | Zenin                  |
| ---------- | :-----------------: | :----------------: | :--------------------: |
| Performant | :heavy_check_mark:  | :x:                | :heavy_check_mark:     |
| Simple     | :x:                 | :heavy_check_mark: | :heavy_check_mark:     |
| Versatile  | :heavy_check_mark:  | :warning:          | :heavy_check_mark:     |

:warning: Uptime Kuma is generally quite versatile, but Zenin was originally created to fill in a couple missing pieces.

Zenin exposes an API that can be used to retrieve information, but similar to Uptime Kuma, makes use of WebSocket to actively distribute measurement information to connected clients, known as "feed subscribers".

> [!Note]
> The API is not yet documented.

This means that you can connect to the client and be alerted to ongoing issues, see monitor statistics change, and watch messages being passed back and forth between the client and server in real time, without reloading the page.

Performance is also a priority for this project. Zenin will poll each monitor in its own thread, leaving the distribution of information to a separate "distributor" thread. Access to this distributor is serialized by way of a message passing architecture. Zenin should be able to poll thousands of monitors this way, with the performance bottleneck generally being the network, or database.

## Installation 

Zenin has only one dependency not included in the binary, and that is some kind of database.

### Manual

Decide what database you want to use and get it running somewhere that Zenin will be able to access.

> [!Note]
> Postgres is currently the only supported database. Support for MySQL and SQLite is planned.

Configure your environment variables to point to this new database. 

For example, if you created a Postgres database like this:

```
docker run --name zenin-db -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_USER=username -d postgres
```

You might export variables like these:

```
export ZENIN_DB_KIND="postgres"
export ZENIN_DB_HOST="0.0.0.0"
export ZENIN_DB_PORT="5432"
export ZENIN_DB_NAME="postgres"
export ZENIN_DB_USERNAME="username"
export ZENIN_DB_PASSWORD="password"
```

Next, acquire a Zenin binary.

A binary may eventually be available on the [Releases](https://github.com/jmkng/zenin/releases) page, but until then, you can get going by following these instructions.

#### Prerequisites

1. [Go](https://go.dev/dl/) v1.22.4+
2. [Node.js](https://nodejs.org/) v20.8.1+
    + npm v10.1.0+

Clone the project.

```
git clone https://github.com/jmkng/zenin
```

Build the user interface. This should create a "build" folder inside of "server". This needs to be done first because Zenin will embed these files.

```
cd zenin/web
npm install && npm run build
```

Build the binary.

```
cd ..
go build cmd/zenin.go
```

You can now run the binary.

```
./zenin
```

### Docker

> [!Note]
> A Docker image is not yet available.

## Hacking

The scripts in `/scripts` may rely on these external tools:

- [curl](https://curl.se/download.html)
- [jq](https://github.com/jqlang/jq)

Several of the upcoming steps rely on your environment variables, so update and source the `export` script before you do anything.

```
. scripts/export.sh
```

First, stand up a Docker container for the development Postgres database.

```
scripts/database.sh
```

Zenin will automatically migrate when connecting to a new database. Don't use the `migrate` script to migrate a database that you are planning to actually use, since it will inject insecure test data and prevent the server from being claimed.

You can run migrations manually if needed:

```
psql -h 127.0.0.1 -p 5432 -U username -d postgres -f <$MIGRATION>
```

If you need to get a shell on the database, a script exists for that to save some keystrokes:

```
scripts/shell.sh
```

Zenin should start up normally at this point:

```
go run cmd/zenin.go
```

Some scripts exist in `/scripts/api` that can be used to test the API, but they may not have 100% coverage.

Scripts that hit authenticated endpoints will search the environment for a token. You can use the `authenticate` script to sign in as `testuser1` (an account that will exist if you used the `migrate` script to migrate your database) and export this easily:

```
. scripts/authenticate.sh
```

The following example relies on this external tool to display the output:

- [neovim](https://neovim.io)

Use `get_related` to fetch all the monitors on the server, including the two most recent measurements for each.

Format the output with `jq` and view the result with `neovim`.

```
scripts/api/monitor/get_related.sh | jq . | nvim -R
```

Executing the script without passing the result to `jq` and `neovim` will just display the output from curl:

```
*   Trying 127.0.0.1:50010...
* Connected to 127.0.0.1 (127.0.0.1) port 50010
> GET /api/v1/monitor?measurements=2 HTTP/1.1
> Host: 127.0.0.1:50010
> User-Agent: curl/8.6.0
> Accept: */*
> Authorization: Bearer ...
> Content-Type: application/json
>
< HTTP/1.1 200 OK
< Access-Control-Allow-Headers: Content-Type, Authorization
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
< Access-Control-Allow-Origin: *
< Content-Type: application/json
< Date: Sun, 14 Jul 2024 19:17:07 GMT
< Transfer-Encoding: chunked
<
* Leftovers after chunking: 12 bytes
* Connection #0 to host 127.0.0.1 left intact
{"data":[ ... ]}
```

## Testing

```
go test ./...
```
