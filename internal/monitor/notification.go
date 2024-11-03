package monitor

import "time"

type Notification struct {
	Id        *int      `json:"id" db:"notification_id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
	MonitorId *int      `json:"monitorId" db:"notification_monitor_id"`
	Threshold string    `json:"threshold" db:"threshold"`

	PluginFields
}
