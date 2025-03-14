# Zenin 🌩️

A simple infrastructure monitoring tool.

![Zenin](../assets/1.png?raw=true)

> [!Tip]
> Find more images of the user interface in the [Assets](https://github.com/jmkng/zenin/tree/assets) branch. Feel free to provide feedback on the design.

## Summary

Zenin is an infrastructure monitoring tool. You set up monitors that perform some kind of action, and Zenin records data. 

Several probe types are built-in, and plugins are also supported. You can even arrange for plugins to be executed in response to the data your monitor collects.

Zenin is an evolution of other tools like Nagios and Uptime Kuma. It has no runtime dependencies; everything is included in the binary.

|            | Nagios              | Uptime Kuma        | Zenin                  |
| ---------- | :-----------------: | :----------------: | :--------------------: |
| Performant | :heavy_check_mark:  | :x:                | :heavy_check_mark:     |
| Simple     | :x:                 | :heavy_check_mark: | :heavy_check_mark:     |
| Versatile  | :heavy_check_mark:  | :warning:          | :heavy_check_mark:     |

:warning: Zenin started out as a fork of Uptime Kuma that added support for plugins.

## Installation 

> [!Note]
> PostgreSQL and SQLite are supported, MySQL support is planned.

### Docker

See the troubleshooting section below if you have any problems running the container.

```
 docker run -d \
    -u zenin \
    -p 23111:23111 \
    -v ~/.config/zenin:/home/zenin/.config/zenin \
    --name zenin \
    jmkng/zenin:dev
```

This image is configured to use SQLite by default. No database setup is required.

You can configure it to use PostgresSQL by passing in some additional environment variables that tell Zenin how to connect to your database:

```
...

-e ZENIN_REPO_KIND=postgres
-e ZENIN_REPO_NAME=postgres
-e ZENIN_REPO_ADDRESS=0.0.0.0
-e ZENIN_REPO_PORT=5432
-e ZENIN_REPO_USERNAME=username
-e ZENIN_REPO_PASSWORD=password

...
```

Adjust the remaining flags as needed.

```
-u zenin
```

The image includes a non-root user account "zenin" so that you aren't forced to run as root. 

Keep in mind, the built-in ICMP probe requires root access to send ICMP packets. If you aren't running as root, you can still use the ICMP probe to send UDP packets.

Just remove the flag to run as root.

```
-v ~/.config/zenin:/home/zenin/.config/zenin
```

[Binds](https://docs.docker.com/engine/storage/bind-mounts/#options-for---volume) the directory `~/.config/zenin` on your host system to `/home/zenin/.config/zenin` inside of the container. This allows you easy access to the database file and plugins from your host system.

You should change `~/.config/zenin` to a path where you are comfortable storing this information.

### Troubleshooting

Error: "make sure plugins directory exists and is accessible"

If the host path of a bind mount does not exist when you pass it to the container, Docker will [create](https://docs.docker.com/engine/storage/bind-mounts/#syntax) it and it may be owned by root. Ensure the directory exists before starting the container.

Create the directory:

```
mkdir -p ~/.config/zenin
```

Or, adjust the user and group:

```
chown $USER:$USER ~/.config/zenin -R
```

### Manual

> [!Note]
> A binary may eventually be available on the [Releases](https://github.com/jmkng/zenin/releases) page.

If you want to build Zenin from source, follow these instructions.

#### Prerequisites

1. [Go](https://go.dev/dl/) v1.22.4+
2. [Node.js](https://nodejs.org/) v20.8.1+
    + npm v10.1.0+

Clone the project:

```
git clone https://github.com/jmkng/zenin
```

```
make build
```

You should end up with a zenin binary.

```
./zenin
```

## Usage

The first account created on a Zenin server becomes the root account.

When you connect for the first time you will be prompted to claim the server by creating that account. Additional accounts can only be created by the root account. No registrations are allowed, your server is invite only.

After you claim the server, you can create monitors.

## Environment Variables

Supported environment variables are documented here.

| Name                        | Explanation                                                                   | Accepted Values                 | Example                                               | Default
| :-------------------------- | :---------------------------------------------------------------------------- | :------------------------------ | :---------------------------------------------------- | :-------
| ZENIN_ADDRESS               | An address for Zenin to bind on.                                              | any valid IP address            | export ZENIN_ADDRESS="0.0.0.0"                        | 127.0.0.1
| ZENIN_PORT                  | A port number for Zenin to use. [^1]                                          | any u16                         | export ZENIN_PORT="23111"                             | 23111
| ZENIN_REDIRECT_PORT         | A port number used to redirect HTTP requests. [^1]                            | any u16                         | export ZENIN_REDIRECT_PORT="80"                       | N/A
| ZENIN_SIGN_SECRET           | A sequence used to sign tokens. [^2]                                          | any >=16 byte string            | export ZENIN_SIGN_SECRET="ab93Be(...)"                | random
| ZENIN_STDOUT_FORMAT         | Determines the format of logs sent to standard output.                        | flat, nested, json              | export ZENIN_STDOUT_FORMAT="json"                     | flat
| ZENIN_STDOUT_TIME_FORMAT    | Determines the timestamp format in logs sent to standard output.              | [^3]                            | export ZENIN_STDOUT_TIME_FORMAT="2006-01-02 15:04:05" | "15:04:05"
| ZENIN_BASE_DIR              | A base directory used to store files.                                         | absolute path                   | export ZENIN_BASE_DIR="/usr/local/x"                  |
| ZENIN_BASE_DIR (Windows)    |                                                                               |                                 |                                                       | %AppData%\local\Zenin
| ZENIN_BASE_DIR (macOS)      |                                                                               |                                 |                                                       | $XDG_CONFIG_HOME/Zenin
| ZENIN_BASE_DIR (Linux)      |                                                                               |                                 |                                                       | $XDG_CONFIG_HOME/zenin
| ZENIN_PLUGINS_DIR           | A directory used to store executable plugins.                                 | absolute path                   | export ZENIN_PLUGINS_DIR="/usr/local/p"               | See notes
| ZENIN_PLUGINS_DIR (Windows) |                                                                               |                                 |                                                       | %AppData%\local\Zenin\plugins
| ZENIN_PLUGINS_DIR (macOS)   |                                                                               |                                 |                                                       | $XDG_CONFIG_HOME/Zenin/plugins
| ZENIN_PLUGINS_DIR (Linux)   |                                                                               |                                 |                                                       | $XDG_CONFIG_HOME/zenin/plugins
| ZENIN_ENABLE_COLOR          | Determines if ANSI color codes are included in logs sent to standard output.  | true, false                     | export ZENIN_ENABLE_COLOR="false"                     | true
| ZENIN_ENABLE_DEBUG          | Enables debug logging.                                                        | true, false                     | export ZENIN_ENABLE_DEBUG="true"                      | false
| ZENIN_ALLOW_INSECURE        | Allows insecure behavior, such as ignoring CORS.                              | true, false                     | export ZENIN_ALLOW_INSECURE="true"                    | false
| ZENIN_REPO_KIND             | The database kind.                                                            | postgres                        | export ZENIN_REPO_KIND="postgres"                     | N/A
| ZENIN_REPO_USERNAME         | The username used to sign in to the database.                                 | any string                      | export ZENIN_REPO_USERNAME="username"                 | N/A
| ZENIN_REPO_PASSWORD         | The password used to sign in to the database.                                 | any string                      | export ZENIN_REPO_PASSWORD="password"                 | N/A
| ZENIN_REPO_ADDRESS          | The address of the server that is running the database.                       | any valid IP address            | export ZENIN_REPO_ADDRESS="0.0.0.0"                   | N/A
| ZENIN_REPO_PORT             | The port that the database is listening on.                                   | any u16                         | export ZENIN_REPO_PORT="5432"                         | N/A
| ZENIN_REPO_NAME             | The name of the database, or file name for SQLite.                            | any string                      | export ZENIN_REPO_NAME="postgres"                     | N/A
| ZENIN_REPO_MAX_CONN         | The maximum number of open database connections.                              | any number                      | export ZENIN_REPO_MAX_CONN="5"                        | N/A
| ZENIN_REPO_ENABLE_TEST      | Enable or disable repository testing.                                         | any value                       | export ZENIN_REPO_ENABLE_TEST="y"                     | N/A

[^1]: When TLS is enabled, HTTPS connections are accepted on ZENIN_PORT, while ZENIN_REDIRECT_PORT will redirect to ZENIN_PORT. Otherwise, ZENIN_PORT will accept HTTP connections.

[^2]: If you don't specify this key, Zenin will generate one on startup. If the Zenin server restarts, all tokens will become unrecognized, effectively signing out every user. If you specify a key, Zenin will use the same one when it starts back up, and existing tokens will remain valid until expiration.

[^3]: Any value accepted by the [time](https://pkg.go.dev/time#Layout) package can be entered here.

## Hacking

Clone the project:

```
git clone https://github.com/jmkng/zenin
```

Modify the `export` script as needed, and source it:

```
. scripts/export.sh
```

Start Zenin:

```
make run
```

If you are making changes to the user interface, start the local server for the web project too:

```
cd web && npm run dev
```

You can use the scripts in `scripts/api` to test the API, or just use them as example requests.

You might need these tools to run them:

- [curl](https://curl.se/download.html)
- [jq](https://github.com/jqlang/jq)

Scripts that hit authenticated endpoints will expect a token to be in the `ZENIN_SCRIPT_TOKEN` environment variable. If you used the `migrate` script to insert seed data, you can just source the `authenticate` script to set this up for you:

```
. scripts/authenticate.sh
```

Use `get_related` to fetch all the monitors on the server, including the two most recent measurements for each:

```
scripts/api/monitor/get_related.sh

...

*   Trying 127.0.0.1:23111...
* Connected to 127.0.0.1 (127.0.0.1) port 23111
> GET /api/v1/monitor?measurements=2 HTTP/1.1
> Host: 127.0.0.1:23111
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

Alternatively, use `jq` to format the data:

```
scripts/api/monitor/get_related.sh | jq .
```

Use the makefile to build:

```
make
```

Linker flags are used to bake in a program version and the most recent commit hash.

## Testing

Database tests are disabled by default. Enable them with the `ZENIN_REPO_ENABLE_TEST` environment variable. 

> [!WARNING]
> Unit tests that interact with a database are not mocked in any way,
> they use the database that Zenin is pointed at using the typical environment variables.
>
> When a database unit test runs, it will acquire a test fixture by deleting all data on the repository,
> migrating, and inserting seed data. 
> Do not run these tests when Zenin is pointed to a repository with valuable data.

Use the makefile to run tests:

```
go clean -testcache && make test
```
