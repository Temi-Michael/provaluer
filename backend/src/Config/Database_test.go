package Config

import (
	"context"
	"strings"
	"testing"

	"gorm.io/gorm"
)

// GORM redacts bound values by calling ParamsFilter on the logger before
// Dialector.Explain() inlines them (see gorm/callbacks.go). This test exercises
// that same contract, which is what actually keeps secrets out of the logs.
func TestDBLoggerDropsBoundParameters(t *testing.T) {
	t.Setenv("DB_LOG_PARAMS", "")

	l, ok := newDBLogger().(gorm.ParamsFilter)
	if !ok {
		t.Fatal("configured logger does not implement ParamsFilter — GORM cannot redact bound values")
	}

	const sql = `INSERT INTO "users" ("email","password_hash","verification_token") VALUES ($1,$2,$3)`
	secrets := []any{
		"user@example.com",
		"$2a$10$3wQbUayW.i8AFdMmCDNdHescuysmETsZRKjrNyFtFZdO9YIbRIBhi",
		"59927561345dd78f209500e3130c8e98af0e2281020005776e3b1de82c565816",
	}

	gotSQL, gotVars := l.ParamsFilter(context.Background(), sql, secrets...)

	if len(gotVars) != 0 {
		t.Errorf("bound values survived redaction: %v", gotVars)
	}
	// Placeholders must remain so slow-query diagnostics stay readable.
	if !strings.Contains(gotSQL, "$2") {
		t.Errorf("expected placeholders to be preserved, got: %s", gotSQL)
	}
}

// The escape hatch must be explicit: only DB_LOG_PARAMS=true restores values.
func TestDBLogParamsOptInOnly(t *testing.T) {
	for _, v := range []string{"", "false", "1", "yes"} {
		t.Setenv("DB_LOG_PARAMS", v)
		l := newDBLogger().(gorm.ParamsFilter)
		if _, vars := l.ParamsFilter(context.Background(), "SELECT $1", "secret"); len(vars) != 0 {
			t.Errorf("DB_LOG_PARAMS=%q should keep redaction on, but values were logged", v)
		}
	}

	t.Setenv("DB_LOG_PARAMS", "true")
	l := newDBLogger().(gorm.ParamsFilter)
	if _, vars := l.ParamsFilter(context.Background(), "SELECT $1", "secret"); len(vars) != 1 {
		t.Error("DB_LOG_PARAMS=true should surface values for local debugging")
	}
}
