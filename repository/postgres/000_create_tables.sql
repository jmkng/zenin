CREATE TABLE settings (
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "key"                 TEXT NOT NULL UNIQUE,
    text_value            TEXT
);

CREATE TABLE account (
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    username              TEXT NOT NULL UNIQUE,
    versioned_salted_hash TEXT NOT NULL,
    root                  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE monitor (
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    name                  TEXT NOT NULL,
    kind                  TEXT NOT NULL CHECK (kind IN ('HTTP', 'TCP', 'ICMP', 'PLUGIN')),
    active                BOOLEAN NOT NULL,
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
    http_capture_headers  BOOLEAN,
    http_capture_body     BOOLEAN,
    icmp_size             INTEGER CHECK (icmp_size > 0),
    icmp_wait             INTEGER CHECK (icmp_wait > 0), -- Milliseconds
    icmp_count            INTEGER CHECK (icmp_count > 0),
    icmp_ttl              INTEGER CHECK (icmp_ttl > 0),
    icmp_protocol         TEXT CHECK (icmp_protocol IN ('ICMP', 'UDP')),
    icmp_loss_threshold   INTEGER CHECK (icmp_loss_threshold < 100) -- Percentage (1 .. 99)
);

CREATE TABLE event (
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id                    BIGSERIAL PRIMARY KEY,
    monitor_id            INTEGER REFERENCES "monitor"(id) ON DELETE CASCADE,
    plugin_name           TEXT NOT NULL,
    plugin_args           TEXT,
    threshold             TEXT CHECK (threshold IN ('WARN', 'DEAD'))
);

CREATE TABLE measurement (
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    monitor_id            INTEGER REFERENCES "monitor"(id) ON DELETE CASCADE,
    state                 TEXT NOT NULL CHECK (state IN ('OK', 'WARN', 'DEAD')),
    state_hint            TEXT,
    kind                  TEXT NOT NULL CHECK (kind IN ('HTTP', 'TCP', 'ICMP', 'PLUGIN')),
    duration              NUMERIC, -- Milliseconds
    http_status_code      INTEGER,
    http_response_headers TEXT,
    http_response_body    TEXT,
    icmp_packets_in       INTEGER,
    icmp_packets_out      INTEGER,
    icmp_min_rtt          NUMERIC, 
    icmp_avg_rtt          NUMERIC,
    icmp_max_rtt          NUMERIC,
    plugin_exit_code      INTEGER,
    plugin_stdout         TEXT,
    plugin_stderr         TEXT
);

CREATE TABLE certificate (
  created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  id                   SERIAL PRIMARY KEY,
  measurement_id       INTEGER REFERENCES "measurement"(id) ON DELETE CASCADE,
  version              INTEGER, 
  serial_number        TEXT,
  public_key_algorithm TEXT,
  issuer_common_name   TEXT,
  subject_common_name  TEXT,
  not_before           TIMESTAMPTZ,
  not_after            TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_account_timestamp
BEFORE UPDATE ON account
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_monitor_timestamp
BEFORE UPDATE ON monitor
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_event_timestamp
BEFORE UPDATE ON event
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_measurement_timestamp
BEFORE UPDATE ON measurement
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_certificate_timestamp
BEFORE UPDATE ON certificate
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
