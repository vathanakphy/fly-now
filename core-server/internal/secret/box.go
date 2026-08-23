// Package secret encrypts sensitive application configuration.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
)

// Box encrypts and authenticates values with AES-GCM.
type Box struct {
	aead       cipher.AEAD
	keyVersion int
}

// NewBox constructs an encryption box for one versioned key.
func NewBox(key []byte, keyVersion int) (*Box, error) {
	if keyVersion < 1 {
		return nil, errors.New("key version must be positive")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("create AES cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("create AES-GCM: %w", err)
	}
	return &Box{aead: aead, keyVersion: keyVersion}, nil
}

// Seal encrypts plaintext with a new random nonce.
func (b *Box) Seal(plaintext, additionalData []byte) (ciphertext, nonce []byte, keyVersion int, err error) {
	nonce = make([]byte, b.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, 0, fmt.Errorf("generate encryption nonce: %w", err)
	}
	ciphertext = b.aead.Seal(nil, nonce, plaintext, additionalData)
	return ciphertext, nonce, b.keyVersion, nil
}

// Open authenticates and decrypts ciphertext.
func (b *Box) Open(ciphertext, nonce, additionalData []byte) ([]byte, error) {
	if len(nonce) != b.aead.NonceSize() {
		return nil, errors.New("invalid encryption nonce")
	}
	plaintext, err := b.aead.Open(nil, nonce, ciphertext, additionalData)
	if err != nil {
		return nil, errors.New("decrypt value")
	}
	return plaintext, nil
}
