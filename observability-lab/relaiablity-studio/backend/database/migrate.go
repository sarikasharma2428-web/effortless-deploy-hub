package database

import (
    _ "embed"
)

//go:embed schema.sql
var schemaSql string

func Migrate() error {
    _, err := DB.Exec(schemaSql)
    return err
}