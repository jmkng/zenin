package common

import (
	"context"
	"fmt"
	"sort"

	"github.com/jmkng/zenin/internal/measurement"
	"github.com/jmkng/zenin/internal/monitor"
	zsql "github.com/jmkng/zenin/pkg/sql"
)

func (c CommonRepository) SelectMonitor(ctx context.Context, measurements int, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	if measurements > 0 {
		monitors, err = c.selectMonitorRelated(ctx, params, measurements)
	} else {
		monitors, err = c.selectMonitor(ctx, params)
	}
	if err != nil || len(monitors) == 0 {
		return []monitor.Monitor{}, err
	}

	store := make(map[int]*monitor.Monitor)
	var distinct []int

	for _, v := range monitors {
		distinct = append(distinct, *v.Id)
		store[*v.Id] = &v
	}

	var builder = zsql.NewBuilder(zsql.NumberPositional)
	builder.Push(`SELECT 
		id "event_id",
		monitor_id "event_monitor_id",
        plugin_name,
        plugin_args,
        threshold
    FROM event
    WHERE monitor_id IN (`)
	builder.SpreadInt(distinct...)
	builder.Push(") ORDER BY id DESC")

	no := []monitor.Event{}
	err = c.db.SelectContext(ctx, &no, builder.String(), builder.Args()...)
	if err != nil {
		return []monitor.Monitor{}, err
	}

	sort.Slice(no, func(i, j int) bool {
		return *no[i].Id < *no[j].Id
	})

	for _, v := range no {
		owner := store[*v.MonitorId]
		owner.Events = append(owner.Events, v)
	}

	result := []monitor.Monitor{}
	for _, v := range store {
		result = append(result, *v)
	}

	return result, err
}

func (c CommonRepository) SelectMeasurement(ctx context.Context, id int, params *monitor.SelectMeasurementParams) ([]measurement.Measurement, error) {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	builder.Push(`SELECT
		id AS "measurement_id",
		created_at,
		updated_at,
		monitor_id AS "measurement_monitor_id",
		duration,
		state,
		state_hint,
		kind AS "measurement_kind",
		http_status_code,
		http_response_headers,
		http_response_body,
		icmp_packets_in,
		icmp_packets_out,
		icmp_min_rtt,
		icmp_avg_rtt,
		icmp_max_rtt,
		plugin_exit_code,
		plugin_stdout,
		plugin_stderr
	FROM measurement`)
	builder.Push(fmt.Sprintf("%v monitor_id = ", builder.Where()))
	builder.BindInt(id)
	if params != nil {
		builder.Inject(params)
	}
	builder.Push("ORDER BY id DESC")

	var measurements []measurement.Measurement

	err := c.db.SelectContext(ctx, &measurements, builder.String(), builder.Args()...)
	if err != nil {
		return measurements, err
	}

	return measurements, nil
}

func (c CommonRepository) DeleteMonitor(ctx context.Context, builder *zsql.Builder, id []int) error {
	builder.Push("DELETE FROM monitor WHERE id in (")
	builder.SpreadInt(id...)
	builder.Push(")")

	_, err := c.db.ExecContext(ctx, builder.String(), builder.Args()...)
	return err
}

func (c CommonRepository) selectMonitor(ctx context.Context, params *monitor.SelectMonitorParams) ([]monitor.Monitor, error) {
	var monitors []monitor.Monitor
	var err error

	var builder = zsql.NewBuilder(zsql.NumberPositional)
	builder.Push(`SELECT
            mo.id "monitor_id",
			mo.created_at,
			mo.updated_at,
            mo.name,
            mo.kind "monitor_kind",
            mo.active,
            mo.interval,
            mo.timeout,
            mo.description,
            mo.remote_address,
            mo.remote_port,
            mo.plugin_name,
            mo.plugin_args,
            mo.http_range,
            mo.http_method,
            mo.http_request_headers,
            mo.http_request_body,
            mo.http_expired_cert_mod,
			mo.http_capture_headers,
			mo.http_capture_body,
            mo.icmp_size,
			mo.icmp_wait,
			mo.icmp_count,
			mo.icmp_ttl,
			mo.icmp_protocol,
            mo.icmp_loss_threshold
        FROM monitor mo`)
	if params != nil {
		builder.Inject(params)
	}
	builder.Push("ORDER BY mo.id;")

	err = c.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	return monitors, err
}

func (c CommonRepository) selectMonitorRelated(ctx context.Context, params *monitor.SelectMonitorParams, measurements int) ([]monitor.Monitor, error) {
	builder := zsql.NewBuilder(zsql.NumberPositional)
	builder.Push(`SELECT 
		id "monitor_id",
		created_at,
		updated_at,
		name,
		kind "monitor_kind", 
		active, 
		interval, 
		timeout, 
		description, 
		remote_address, 
		remote_port, 
		plugin_name, 
		plugin_args, 
		http_range, 
		http_method, 
		http_request_headers, 
		http_request_body, 
		http_expired_cert_mod, 
		http_capture_headers, 
		http_capture_body,
		icmp_size, 
		icmp_wait, 
		icmp_count, 
		icmp_ttl, 
		icmp_protocol,
        icmp_loss_threshold
	FROM monitor`)
	if params != nil {
		builder.Inject(params)
	}

	store := make(map[int]*monitor.Monitor)
	var distinct []int

	monitors := []monitor.Monitor{}
	err := c.db.SelectContext(ctx, &monitors, builder.String(), builder.Args()...)
	if err != nil || len(monitors) == 0 {
		return []monitor.Monitor{}, err
	}

	for _, v := range monitors {
		distinct = append(distinct, *v.Id)
		store[*v.Id] = &v
	}

	builder.Reset()
	builder.Push(`WITH raw AS (SELECT
		m.*,
		ROW_NUMBER() OVER (PARTITION BY m.monitor_id ORDER BY m.created_at DESC) AS rank
	FROM measurement m   
	WHERE m.monitor_id IN (`)
	builder.SpreadInt(distinct...)
	builder.Push(`) ORDER BY m.id DESC)
	SELECT 
		id "measurement_id",
		created_at,
		updated_at,
		monitor_id "measurement_monitor_id",
		state, 
		state_hint, 
		kind "measurement_kind", 
		duration, 
		http_status_code, 
		http_response_headers, 
		http_response_body,
		icmp_packets_in, 
		icmp_packets_out, 
		icmp_min_rtt, 
		icmp_avg_rtt, 
		icmp_max_rtt,
		plugin_exit_code, 
		plugin_stdout, 
		plugin_stderr
	FROM raw WHERE rank <=`)
	builder.BindInt(measurements)

	me := []measurement.Measurement{}
	err = c.db.SelectContext(ctx, &me, builder.String(), builder.Args()...)
	if err != nil {
		return []monitor.Monitor{}, err
	}
	for _, v := range me {
		owner := store[*v.MonitorId]
		owner.Measurements = append(owner.Measurements, v)
	}

	result := []monitor.Monitor{}
	for _, v := range store {
		result = append(result, *v)
	}
	return result, nil
}
