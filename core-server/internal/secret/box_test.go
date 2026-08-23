package secret

import (
	"bytes"
	"testing"
)

func TestBoxRoundTrip(t *testing.T) {
	box, err := NewBox(bytes.Repeat([]byte{1}, 32), 3)
	if err != nil {
		t.Fatalf("NewBox() error = %v", err)
	}

	plaintext := []byte("database-password")
	additionalData := []byte("app-id\x00DATABASE_PASSWORD")
	ciphertext, nonce, version, err := box.Seal(plaintext, additionalData)
	if err != nil {
		t.Fatalf("Seal() error = %v", err)
	}
	if version != 3 {
		t.Fatalf("Seal() version = %d, want 3", version)
	}
	if bytes.Contains(ciphertext, plaintext) {
		t.Fatal("Seal() ciphertext contains plaintext")
	}

	got, err := box.Open(ciphertext, nonce, additionalData)
	if err != nil {
		t.Fatalf("Open() error = %v", err)
	}
	if !bytes.Equal(got, plaintext) {
		t.Fatalf("Open() = %q, want %q", got, plaintext)
	}
}

func TestBoxRejectsModifiedCiphertext(t *testing.T) {
	box, err := NewBox(bytes.Repeat([]byte{2}, 32), 1)
	if err != nil {
		t.Fatalf("NewBox() error = %v", err)
	}
	ciphertext, nonce, _, err := box.Seal([]byte("secret"), []byte("context"))
	if err != nil {
		t.Fatalf("Seal() error = %v", err)
	}
	ciphertext[0] ^= 1
	if _, err := box.Open(ciphertext, nonce, []byte("context")); err == nil {
		t.Fatal("Open() error = nil, want authentication error")
	}
}

func TestBoxRejectsDifferentAdditionalData(t *testing.T) {
	box, err := NewBox(bytes.Repeat([]byte{4}, 32), 1)
	if err != nil {
		t.Fatalf("NewBox() error = %v", err)
	}
	ciphertext, nonce, _, err := box.Seal([]byte("secret"), []byte("application-one"))
	if err != nil {
		t.Fatalf("Seal() error = %v", err)
	}
	if _, err := box.Open(ciphertext, nonce, []byte("application-two")); err == nil {
		t.Fatal("Open() error = nil, want authentication error")
	}
}

func TestBoxRejectsInvalidNonce(t *testing.T) {
	box, err := NewBox(bytes.Repeat([]byte{3}, 32), 1)
	if err != nil {
		t.Fatalf("NewBox() error = %v", err)
	}
	if _, err := box.Open([]byte("ciphertext"), []byte("short"), nil); err == nil {
		t.Fatal("Open() error = nil, want invalid nonce error")
	}
}

func TestNewBoxRejectsInvalidConfiguration(t *testing.T) {
	tests := []struct {
		name    string
		key     []byte
		version int
	}{
		{name: "invalid key", key: []byte("short"), version: 1},
		{name: "invalid version", key: bytes.Repeat([]byte{1}, 32), version: 0},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := NewBox(test.key, test.version); err == nil {
				t.Fatal("NewBox() error = nil, want error")
			}
		})
	}
}
