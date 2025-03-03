CREATE TABLE settings (
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    "key"                 TEXT NOT NULL UNIQUE,
    text_value            TEXT
);

CREATE TABLE account (
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    username              TEXT NOT NULL UNIQUE,
    versioned_salted_hash TEXT NOT NULL,
    root                  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE monitor (
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL,
    kind                  TEXT NOT NULL CHECK (kind IN ('HTTP', 'TCP', 'ICMP', 'PLUGIN')),
    active                INTEGER NOT NULL,
    "interval"            INTEGER NOT NULL CHECK ("interval" > 0), -- Seconds
    timeout               INTEGER NOT NULL, -- Seconds
    description           TEXT,
    remote_address        TEXT,
    remote_port           INTEGER CHECK (remote_port >= 0 AND remote_port <= 65535),
    plugin_name           TEXT,
    plugin_args           TEXT,
    http_range            TEXT CHECK (http_range IN ('100-199', '200-299', '300-399', '400-499', '500-599')),
    http_method           TEXT CHECK (http_method IN ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE')),
    http_request_headers  TEXT,
    http_request_body     TEXT,
    http_expired_cert_mod TEXT CHECK (http_expired_cert_mod IN ('WARN', 'DEAD')),
    http_capture_headers  INTEGER,
    http_capture_body     INTEGER,
    icmp_size             INTEGER CHECK (icmp_size > 0),
    icmp_wait             INTEGER CHECK (icmp_wait > 0), -- Milliseconds
    icmp_count            INTEGER CHECK (icmp_count > 0),
    icmp_ttl              INTEGER CHECK (icmp_ttl > 0),
    icmp_protocol         TEXT CHECK (icmp_protocol IN ('ICMP', 'UDP')),
    icmp_loss_threshold   INTEGER CHECK (icmp_loss_threshold < 100) -- Percentage (1 .. 99)
);

CREATE TABLE event (
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    monitor_id            INTEGER,
    plugin_name           TEXT NOT NULL,
    plugin_args           TEXT,
    threshold             TEXT CHECK (threshold IN ('WARN', 'DEAD')),
    FOREIGN KEY (monitor_id) REFERENCES monitor(id) ON DELETE CASCADE
);

CREATE TABLE measurement (
    created_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at            TEXT DEFAULT CURRENT_TIMESTAMP,
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    monitor_id            INTEGER,
    state                 TEXT NOT NULL CHECK (state IN ('OK', 'WARN', 'DEAD')),
    state_hint            TEXT,
    kind                  TEXT NOT NULL CHECK (kind IN ('HTTP', 'TCP', 'ICMP', 'PLUGIN')),
    duration              REAL, -- Milliseconds
    http_status_code      INTEGER,
    http_response_headers TEXT,
    http_response_body    TEXT,
    icmp_packets_in       INTEGER,
    icmp_packets_out      INTEGER,
    icmp_min_rtt          REAL, 
    icmp_avg_rtt          REAL,
    icmp_max_rtt          REAL,
    plugin_exit_code      INTEGER,
    plugin_stdout         TEXT,
    plugin_stderr         TEXT,
    FOREIGN KEY (monitor_id) REFERENCES monitor(id) ON DELETE CASCADE
);

CREATE TABLE certificate (
    created_at           TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at           TEXT DEFAULT CURRENT_TIMESTAMP,
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    measurement_id       INTEGER,
    version              INTEGER, 
    serial_number        TEXT,
    public_key_algorithm TEXT,
    issuer_common_name   TEXT,
    subject_common_name  TEXT,
    not_before           TEXT,
    not_after            TEXT,
    FOREIGN KEY (measurement_id) REFERENCES measurement(id) ON DELETE CASCADE
);

CREATE TRIGGER update_settings_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW
BEGIN
  UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER update_account_timestamp
BEFORE UPDATE ON account
FOR EACH ROW
BEGIN
  UPDATE account SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER update_monitor_timestamp
BEFORE UPDATE ON monitor
FOR EACH ROW
BEGIN
  UPDATE monitor SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER update_event_timestamp
BEFORE UPDATE ON event
FOR EACH ROW
BEGIN
  UPDATE event SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER update_measurement_timestamp
BEFORE UPDATE ON measurement
FOR EACH ROW
BEGIN
  UPDATE measurement SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;

CREATE TRIGGER update_certificate_timestamp
BEFORE UPDATE ON certificate
FOR EACH ROW
BEGIN
  UPDATE certificate SET updated_at = CURRENT_TIMESTAMP WHERE rowid = OLD.rowid;
END;
