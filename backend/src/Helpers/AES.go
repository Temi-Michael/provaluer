package Helpers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
)

// AESEncrypt encrypts a string using AES-GCM
func AESEncrypt(value string, key string) string {
	if value == "" {
		return ""
	}
	// Pad key to 32 bytes if needed, or assume it's exactly 32 bytes
	keyBytes := []byte(key)
	if len(keyBytes) < 32 {
		padded := make([]byte, 32)
		copy(padded, keyBytes)
		keyBytes = padded
	} else {
		keyBytes = keyBytes[:32]
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return value
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return value
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return value
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(value), nil)
	return base64.StdEncoding.EncodeToString(ciphertext)
}

// AESDecrypt decrypts an AES-GCM encrypted string
func AESDecrypt(encryptedValue string, key string) string {
	if encryptedValue == "" {
		return ""
	}
	
	keyBytes := []byte(key)
	if len(keyBytes) < 32 {
		padded := make([]byte, 32)
		copy(padded, keyBytes)
		keyBytes = padded
	} else {
		keyBytes = keyBytes[:32]
	}

	encryptedData, err := base64.StdEncoding.DecodeString(encryptedValue)
	if err != nil {
		return encryptedValue
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return encryptedValue
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return encryptedValue
	}

	nonceSize := gcm.NonceSize()
	if len(encryptedData) < nonceSize {
		return encryptedValue
	}

	nonce, ciphertext := encryptedData[:nonceSize], encryptedData[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return encryptedValue
	}

	return string(plaintext)
}
