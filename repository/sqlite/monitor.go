package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/jmkng/zenin"
	zjson "github.com/jmkng/zenin/internal/json"
)

type MonitorRepository struct {
	db *sql.DB
}

func (m MonitorRepository) Create(ctx context.Context, t time.Time, c zenin.CreateMonitor) (int64, error) {
	//attr := zjson.MarshalAttributes(o.Attributes)

	time := NewUTCTime(t)
	q := `INSERT INTO monitor (
		created_at
		,updated_at
		,name
		,description
		,active`
	result, err := m.db.ExecContext(
		ctx,
		q,
		time,
		time,
		o.MonitorID,
		o.ProbeID,
		o.State,
		zjson.Slice[string](o.Hints),
		o.Duration,
		attr,
	)
	if err != nil {
		return 0, fmt.Errorf("sqlite: creating measurement: %w", err)
	}

	// Insert equip here, if needed.
	// Inser tags!

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("sqlite: getting id: %w", err)
	}

	return id, nil
}

//func (m MonitorRepository) Get(ctx context.Context, o zenin.GetMonitorOpts) ([]zenin.Monitor, error) {
//	b := zsql.NewBuilder(zsql.NumberPositional)
//	b.Push(`SELECT
//        FROM monitor mo
//        LEFT JOIN monitor_group mg on mg.id = mo.group_id`)
//	where := b.Where()
//	if len(o.ID) > 0 {
//		where.InInt("id", o.ID...)
//	}
//	if o.Active.Valid {
//		where.Equal("active", o.Active.Value)
//	}
//	if o.EquipName.Valid {
//		where.Equal("equip_name", o.EquipName.Value)
//	}
//	var mo []monitor
//	err := m.db.SelectContext(ctx, &mo, b.String(), b.Args()...)
//	if err != nil || len(mo) == 0 {
//		return []zenin.Monitor{}, err
//	}
//
//	store := make(map[int]*monitor)
//	var distinct []int
//	for _, v := range mo {
//		distinct = append(distinct, v.ID)
//		store[v.ID] = &v
//	}
//
//	// Triggers.
//	b.Reset()
//	b.Push(`SELECT
//		t.id "trigger_id",
//		t.created_at "trigger_created_at",
//		t.updated_at "trigger_updated_at",
//		t.monitor_id "trigger_monitor_id",
//		t.name "trigger_name",
//		t.description "trigger_description',
//		t.run_level,
//		t.formats_json,
//		mt.monitor_id "owner_id"
//	FROM trigger t
//	INNER JOIN monitor_trigger mt ON t.id = mt.trigger_id`)
//	b.Where().InIntUnsafe("mt.monitor_id", distinct...)
//
//	var omo []struct {
//		trigger
//		OwnerMonitorID int `db:"owner_id"`
//	}
//	if err := m.db.SelectContext(ctx, &omo, b.String(), b.Args()...); err != nil {
//		return nil, err
//	}
//	for _, tw := range omo {
//		if mon, ok := store[tw.OwnerMonitorID]; ok {
//			mon.Triggers = append(mon.Triggers, tw.trigger)
//		}
//	}
//
//	// Tags.
//	b.Reset()
//	b.Push(`SELECT
//		t.id "tag_id",
//		t.name "tag_name",
//		mt.monitor_id "owner_id"
//	FROM monitor_tag mt
//	INNER JOIN tag t ON mt.tag_id = t.id`)
//	b.Where().InIntUnsafe("mt.monitor_id", distinct...)
//
//	var ta []struct {
//		tag
//		MonitorID int `db:"owner_id"`
//	}
//	if err := m.db.SelectContext(ctx, &ta, b.String(), b.Args()...); err != nil {
//		return nil, err
//	}
//	for _, r := range ta {
//		if mon, ok := store[r.MonitorID]; ok {
//			mon.Tags = append(mon.Tags, tag{ID: r.ID, Name: r.Name})
//		}
//	}
//
//	monitors := make([]zenin.Monitor, 0, len(store))
//	for _, v := range store {
//		monitors = append(monitors, v.ToMonitor())
//	}
//
//	return monitors, err
//}
//
//type group struct {
//	ID          int    `db:"group_id"`
//	CreatedAt   Time   `db:"group_created_at"`
//	UpdatedAt   Time   `db:"group_updated_at"`
//	Name        string `db:"group_name"`
//	Description string `db:"group_description"`
//}
//
//func (g group) ToGroup() zenin.Group {
//	return zenin.Group{
//		ID:          g.ID,
//		CreatedAt:   g.CreatedAt.time,
//		UpdatedAt:   g.UpdatedAt.time,
//		Name:        g.Name,
//		Description: g.Description,
//	}
//}
//
//func (m MonitorRepository) GetGroup(ctx context.Context, o zenin.GetGroupOpts) ([]zenin.Group, error) {
//	b := zsql.NewBuilder(zsql.NumberPositional)
//	b.Push(`SELECT
//            id "group_id",
//            created_at "group_created_at",
//            updated_at "group_updated_at",
//            name "group_name",
//            description "group_description"
//        FROM monitor_group`)
//	if len(o.ID) > 0 {
//		b.Where().InInt("id", o.ID...)
//	}
//	var gr []group
//	err := m.db.SelectContext(ctx, &gr, b.String(), b.Args()...)
//	if err != nil || len(gr) == 0 {
//		return []zenin.Group{}, err
//	}
//
//	groups := make([]zenin.Group, 0, len(gr))
//	for _, v := range gr {
//		groups = append(groups, v.ToGroup())
//	}
//
//	return groups, nil
//}
//
//type trigger struct {
//	ID          int        `db:"trigger_id"`
//	CreatedAt   Time       `db:"trigger_created_at"`
//	UpdatedAt   Time       `db:"trigger_updated_at"`
//	MonitorID   int        `db:"trigger_monitor_id"`
//	Name        string     `db:"trigger_name"`
//	Description string     `db:"trigger_description"`
//	RunLevel    string     `db:"run_level"`
//	Formats     JSONMapAny `db:"formats_json"`
//}
//
//func (t trigger) ToTrigger() zenin.Trigger {
//	formats := make(map[string]string, len(t.Formats))
//	for k, v := range t.Formats {
//		formats[k] = v.(string)
//	}
//	return zenin.Trigger{
//		ID:          t.ID,
//		CreatedAt:   t.CreatedAt.time,
//		UpdatedAt:   t.UpdatedAt.time,
//		MonitorID:   t.MonitorID,
//		Name:        t.Name,
//		Description: t.Description,
//		RunLevel:    zenin.State(t.RunLevel),
//		Formats:     formats,
//	}
//}
//
//func (m MonitorRepository) GetTrigger(ctx context.Context, o zenin.GetTriggerOpts) ([]zenin.Trigger, error) {
//	b := zsql.NewBuilder(zsql.NumberPositional)
//	b.Push(`SELECT
//            id "trigger_id",
//            created_at "trigger_created_at",
//            updated_at "trigger_updated_at",
//            monitor_id "trigger_monitor_id",
//            name "trigger_name",
//            description "trigger_description",
//            run_level,
//            formats_json
//        FROM trigger`)
//	where := b.Where()
//	if len(o.ID) > 0 {
//		where.InInt("id", o.ID...)
//	}
//	if len(o.MonitorID) > 0 {
//		where.InInt("monitor_id", o.MonitorID...)
//	}
//	var tr []trigger
//	err := m.db.SelectContext(ctx, &tr, b.String(), b.Args()...)
//	if err != nil || len(tr) == 0 {
//		return []zenin.Trigger{}, err
//	}
//
//	triggers := make([]zenin.Trigger, 0, len(tr))
//	for _, v := range tr {
//		triggers = append(triggers, v.ToTrigger())
//	}
//
//	return triggers, nil
//}
//
//type tag struct {
//	ID        int    `db:"tag_id"`
//	CreatedAt Time   `db:"tag_created_at"`
//	UpdatedAt Time   `db:"tag_updated_at"`
//	Name      string `db:"tag_name"`
//}
//
//func (t tag) ToTag() zenin.Tag {
//	return zenin.Tag{
//		ID:        t.ID,
//		CreatedAt: t.CreatedAt.time,
//		UpdatedAt: t.UpdatedAt.time,
//		Name:      t.Name,
//	}
//}
//
//func (m MonitorRepository) GetTag(ctx context.Context, o zenin.GetTagOpts) ([]zenin.Tag, error) {
//	b := zsql.NewBuilder(zsql.NumberPositional)
//	b.Push(`SELECT
//            id "tag_id",
//            created_at "tag_created_at",
//            updated_at "tag_updated_at",
//            name "tag_name"
//       FROM tag`)
//	if len(o.ID) > 0 {
//		b.Where().InInt("id", o.ID...)
//	}
//	var ta []tag
//	err := m.db.SelectContext(ctx, &ta, b.String(), b.Args()...)
//	if err != nil || len(ta) == 0 {
//		return []zenin.Tag{}, err
//	}
//
//	tags := make([]zenin.Tag, 0, len(ta))
//	for _, v := range ta {
//		tags = append(tags, v.ToTag())
//	}
//
//	return tags, nil
//}
