CREATE TABLE account (
    created               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    username              TEXT NOT NULL UNIQUE,
    versioned_salted_hash TEXT NOT NULL
);

--#

CREATE TABLE monitor (
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    name                  TEXT NOT NULL,
    kind                  TEXT NOT NULL CHECK (kind IN ('HTTP', 'TCP', 'ICMP', 'PING', 'SCRIPT')),
    active                BOOLEAN NOT NULL,
    "interval"            INTEGER NOT NULL CHECK ("interval" > 0),
    timeout               INTEGER NOT NULL CHECK (timeout > 0),
    description           TEXT,
    remote_address        TEXT,
    remote_port           INTEGER CHECK (remote_port >= 0 AND remote_port <= 65535),
    script_path           TEXT,
    http_range            TEXT CHECK (http_range IN ('100-199', '200-299', '300-399', '400-499', '500-599')),
    http_method           TEXT CHECK (http_method IN ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
    http_response_headers TEXT,
    http_response_body    TEXT,
    http_expired_cert_mod TEXT CHECK (http_expired_cert_mod IN ('WARN', 'DEAD')),
    icmp_size             INTEGER CHECK (icmp_size > 0)
);

--#

CREATE TABLE measurement (
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id                    SERIAL PRIMARY KEY,
    monitor_id            INTEGER REFERENCES "monitor"(id),
    recorded_at           TIMESTAMP NOT NULL,
    state                 TEXT NOT NULL CHECK (state IN ('OK', 'WARN', 'DEAD')),
    duration              NUMERIC,
    http_status_code      INTEGER,
    http_response_headers TEXT,
    http_response_body    TEXT,
    icmp_packets_in       INTEGER,
    icmp_packets_out      INTEGER,
    icmp_min_rtt          NUMERIC, 
    icmp_avg_rtt          NUMERIC,
    icmp_max_rtt          NUMERIC,
    script_exit_code      INTEGER,
    script_stdout         TEXT,
    script_stderr         TEXT
);

--#

CREATE TABLE certificate (
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  id                   SERIAL PRIMARY KEY,
  measurement_id       INTEGER REFERENCES "measurement"(id),
  raw                  BYTEA, -- Keep the raw DER encoded bytes, just in case.
  version              INTEGER, 
  serial_number        NUMERIC,
  public_key_algorithm TEXT,
  issuer_common_name   TEXT,
  subject_common_name  TEXT,
  not_before           TIMESTAMP,
  not_after            TIMESTAMP
);

--#

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--#

CREATE TRIGGER update_account_timestamp
BEFORE UPDATE ON account
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

--#

CREATE TRIGGER update_monitor_timestamp
BEFORE UPDATE ON monitor
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

--#

CREATE TRIGGER update_measurement_timestamp
BEFORE UPDATE ON measurement
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

--# 

CREATE TRIGGER update_certificate_timestamp
BEFORE UPDATE ON certificate
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
