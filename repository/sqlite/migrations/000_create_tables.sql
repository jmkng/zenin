CREATE TABLE IF NOT EXISTS monitor (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    name        TEXT NOT NULL CHECK (name <> ''),
    description TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS equip (
    monitor_id      INTEGER NOT NULL,
    probe_id        INTEGER NOT NULL CHECK (probe_id > 0 AND probe_id <= 1),
    parameters_json TEXT NOT NULL CHECK (json_valid(parameters_json)) DEFAULT '{}',
    interval_ns     INTEGER NOT NULL,
    timeout_ns      INTEGER NOT NULL,
    FOREIGN KEY (monitor_id) REFERENCES monitor(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tag (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    name       TEXT NOT NULL UNIQUE CHECK (name <> '')
);

CREATE TABLE IF NOT EXISTS monitor_tag (
    monitor_id  INTEGER NOT NULL,
    tag_id      INTEGER NOT NULL,
    PRIMARY KEY (monitor_id, tag_id),
    FOREIGN KEY (monitor_id) REFERENCES monitor(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS measurement (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL,
    monitor_id               INTEGER NOT NULL,
    probe_id                 INTEGER NOT NULL CHECK (probe_id > 0 AND probe_id <= 1),
    state                    INTEGER NOT NULL CHECK (state > 0 AND state <= 3),
    hints_json               TEXT NOT NULL CHECK (json_valid(hints_json)) DEFAULT '[]',
    duration_ns              INTEGER NOT NULL,
    attributes_json          TEXT NOT NULL CHECK (json_valid(attributes_json)) DEFAULT '{}',
    FOREIGN KEY (monitor_id) REFERENCES monitor(id) ON DELETE CASCADE
);
