package common

import (
	"github.com/jmoiron/sqlx"
)

// NewCommonRepository returns a new [*CommonRepository].
func NewCommonRepository(db *sqlx.DB) *CommonRepository {
	return &CommonRepository{
		db: db,
	}
}

type CommonRepository struct {
	db *sqlx.DB
}
