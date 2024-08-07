INSERT INTO account 
    (username, versioned_salted_hash)
VALUES 
    ('testuser1', ':1:gyZa14tdPBUsOzbcZG99cQ==:eDdVGqorzEcYL4+arqiSHfMlQsq/+fM9ua2Gq7wrT7g=');

INSERT INTO monitor 
    (name, kind, active, interval, timeout, description, 
    remote_address, remote_port, 
    plugin_name, plugin_args,
    http_range, http_method, http_request_headers, http_request_body, http_expired_cert_mod,
    http_capture_headers, http_capture_body,
    icmp_size)
VALUES
    (
        'Mercury', 
        'ICMP',
        false, 
        30,
        10, 
        'Mercury Description',
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        NULL, 
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        30
    ),
    (
        'Venus', 
        'HTTP', 
        true, 
        30, 
        10, 
        NULL,
        'https://wikipedia.org', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'GET',
        '{"X-Debug-Info": "Value"}',
        NULL,
        'WARN',
        NULL,
        NULL,
        NULL
    ),
    (
        'Earth', 
        'PLUGIN', 
        false, 
        137, 
        10, 
        'Earth Description',
        NULL, 
        NULL, 
        'helloworld.sh',
        '["one", "two"]',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'Mars', 
        'HTTP', 
        false, 
        112, 
        10, 
        NULL,
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'GET',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'Jupiter', 
        'HTTP', 
        false, 
        133, 
        10, 
        NULL,
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'POST',
        '{"X-Debug-Info": "Value"}',
        '{"KeyA": "ValueA", "KeyB": "ValueB"}',
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'Saturn', 
        'HTTP', 
        false, 
        139, 
        10, 
        NULL,
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'GET',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'Uranus', 
        'HTTP', 
        false, 
        110, 
        10, 
        NULL,
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'GET',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    ),
    (
        'Neptune', 
        'HTTP', 
        false, 
        109, 
        10, 
        NULL,
        'http://google.com', 
        NULL,
        NULL,
        NULL,
        '200-299', 
        'GET',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
    );

INSERT INTO measurement 
    (monitor_id, recorded_at, state, state_hint, kind, duration, 
    http_status_code, http_response_headers, http_response_body, 
    icmp_packets_in, icmp_packets_out, icmp_min_rtt, icmp_avg_rtt, icmp_max_rtt, 
    plugin_exit_code, plugin_stdout, plugin_stderr)
VALUES
    (1, '2024-07-01T17:45:24-06:00', 'OK', NULL, 'ICMP', 364.22, 
    NULL, NULL, NULL, 
    5, 5, 1.99, 2.22, 2.46, 
    NULL, NULL, NULL),
    (1, '2024-07-01T17:45:24-06:00', 'WARN', '[ "Received less packets than expected." ]', 'ICMP', 233.32, 
    NULL, NULL, NULL,
    4, 5, 4.54, 5.66, 6.56,
    NULL, NULL, NULL),
    (2, '2024-07-01T17:45:24-06:00', 'OK', NULL, 'HTTP', 300.22, 
    200, 'Connection: Keep-Alive\nContent-Encoding: gzip', 'abc', 
    NULL, NULL, NULL, NULL, NULL, 
    NULL, NULL, NULL),
    (2, '2024-07-01T17:45:24-06:00', 'OK', NULL, 'HTTP', 288.10, 
    200, 'Set-Cookie: mykey=myvalue; expires=Mon, 17-Jul-2017 16:06:00 GMT; Max-Age=31449600; Path=/; secure', 'def', 
    NULL, NULL, NULL, NULL, NULL, 
    NULL, NULL, NULL),
    (2, '2024-07-04T17:45:24-06:00', 'OK', NULL, 'HTTP', 114.233, 
    200, 'X-Backend-Server: developer2.webapp.scl3.mozilla.com\nX-Cache-Info: not cacheable; meta data too large', 'ghi', 
    NULL, NULL, NULL, NULL, NULL, 
    NULL, NULL, NULL),
    (2, '2024-07-04T17:45:24-06:00', 'DEAD', '[ "The response status code is out of range." ]', 'HTTP', 388.83, 
    500, 'Connection: close', 'Server Error', 
    NULL, NULL, NULL, NULL, NULL, 
    NULL, NULL, NULL),
    (3, '2024-07-01T17:45:24-06:00', 'OK', NULL, 'PLUGIN', 212.88, 
    NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, 
    0, 'shell  0.01s user 0.02s system 0% cpu 9.033 total\nchildren  0.01s user 0.02s system 0% cpu 9.033 total', NULL),
    (3, '2024-07-01T17:45:24-06:00', 'DEAD', '[ "Plugin returned a dead exit code." ]', 'PLUGIN', 119.03, 
    NULL, NULL, NULL, 
    NULL, NULL, NULL, NULL, NULL, 
    2, '', 'received malformed data');

INSERT INTO certificate
    (measurement_id, version, serial_number, public_key_algorithm, issuer_common_name, subject_common_name, 
    not_before, not_after)
VALUES
    (4, 3, '184328649162696774378172381754866658485', 'ECDSA', 'WR2', 'www.google.com', 
    '2024-07-01T17:45:24-06:00', '2024-07-01T17:45:24-06:00'),
    (4, 3, '170058220837755766831192027518741805976', 'RSA', 'GTS Root R1', 'WR2', 
    '2024-07-01T17:45:24-06:00', '2024-07-01T17:45:24-06:00'),
    (4, 3, '159159747900478145820483398898491642637', 'RSA', 'GlobalSign Root CA', 'GTS Root R1', 
    '2024-07-01T17:45:24-06:00', '2024-07-01T17:45:24-06:00');
