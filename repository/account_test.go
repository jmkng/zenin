package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/jmkng/zenin/internal"
	"github.com/jmkng/zenin/internal/account"
	"github.com/jmkng/zenin/internal/debug"
)

func TestInsertAccount(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	username := "testuser3"
	acc := account.Account{
		Username: username,
		Root:     false,
	}
	id, err := repository.InsertAccount(context.Background(), acc)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, id, 3)
}

func TestUpdateAccount(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	before := "testuser1"
	accounts, err := repository.SelectAccount(context.Background(), &account.SelectAccountParams{
		Username: &before,
	})
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(accounts), 1)
	debug.AssertEqual(t, accounts[0].Username, before)

	after := "testuser100"
	ctx := context.Background()
	err = repository.UpdateAccount(ctx, account.UpdateAccountParams{
		Id:                  *accounts[0].Id,
		UpdatedAt:           internal.NewTimeValue(time.Now()),
		Username:            after,
		VersionedSaltedHash: nil,
	})
	if err != nil {
		t.Fatal(err)
	}

	accounts, err = repository.SelectAccount(ctx, &account.SelectAccountParams{
		Username: &after,
	})
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(accounts), 1)
	debug.AssertEqual(t, accounts[0].Username, after)
}

func TestDeleteAccount(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	ctx := context.Background()
	before, err := repository.SelectAccountTotal(ctx)
	if err != nil {
		t.Fatalf("failed to select accounts before delete: %v", err)
	}
	debug.Assert(t, before == 2, "expected two accounts in test fixture")

	err = repository.DeleteAccount(ctx, []int{2})
	if err != nil {
		t.Fatal(err)
	}

	after, err := repository.SelectAccountTotal(ctx)
	if err != nil {
		t.Fatalf("failed to select accounts after delete: %v", err)
	}

	debug.Assert(t, after == 1, "expected one account in test fixture after delete")

	err = repository.DeleteAccount(ctx, []int{1})
	if err != nil {
		t.Fatal(err)
	}

	final, err := repository.SelectAccountTotal(ctx)
	if err != nil {
		t.Fatalf("failed to select accounts after delete: %v", err)
	}

	debug.Assert(t, final == 1, "deleting root account should be a no-op")
}

func TestSelectAccountTotal(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	total, err := repository.SelectAccountTotal(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, total, 2)
}

func TestSelectAccount(t *testing.T) {
	if _, set := os.LookupEnv(SkipKey); !set {
		skip(t)
	}
	repository := fixture(t)

	username := "testuser1"
	params := account.SelectAccountParams{
		Username: &username,
	}
	accounts, err := repository.SelectAccount(context.Background(), &params)
	if err != nil {
		t.Fatal(err)
	}

	debug.AssertEqual(t, len(accounts), 1)
	debug.AssertEqual(t, accounts[0].Username, username)
}
