package Helpers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"
	"os"

	"golang.org/x/crypto/argon2"
)

// --- AES-256-GCM Encryption ---

// getEncryptionKey ensures we always have a 32-byte key for AES-256
func getEncryptionKey() []byte {
	key := os.Getenv("AES_SECRET_KEY")
	if key == "" {
		panic("AES_SECRET_KEY environment variable is not set")
	}
	// Hash the string to ensure it's exactly 32 bytes
	hash := sha256.Sum256([]byte(key))
	return hash[:]
}

// Encrypt string to base64 using AES-256-GCM
func Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt base64 string using AES-256-GCM
func Decrypt(encryptedBase64 string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(getEncryptionKey())
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// --- Argon2id Hashing for Admins ---

// HashPasswordArgon2 creates a secure Argon2id hash
func HashPasswordArgon2(password string) (string, error) {
	// Standard parameters for Argon2id
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	time := uint32(1)
	memory := uint32(64 * 1024)
	threads := uint8(4)
	keyLen := uint32(32)

	hash := argon2.IDKey([]byte(password), salt, time, memory, threads, keyLen)
	
	// Format: salt:hash
	encoded := hex.EncodeToString(salt) + ":" + hex.EncodeToString(hash)
	return encoded, nil
}

// ComparePasswordArgon2 verifies a password against an Argon2id hash
func ComparePasswordArgon2(password, encodedHash string) bool {
	// Expected format: salt:hash
	parts := len(encodedHash)
	if parts < 33 { // Min reasonable length
		return false
	}

	// Split at the colon
	var saltHex, hashHex string
	for i := 0; i < len(encodedHash); i++ {
		if encodedHash[i] == ':' {
			saltHex = encodedHash[:i]
			hashHex = encodedHash[i+1:]
			break
		}
	}

	if saltHex == "" || hashHex == "" {
		return false
	}

	salt, err := hex.DecodeString(saltHex)
	if err != nil {
		return false
	}

	expectedHash, err := hex.DecodeString(hashHex)
	if err != nil {
		return false
	}

	time := uint32(1)
	memory := uint32(64 * 1024)
	threads := uint8(4)
	keyLen := uint32(32)

	hash := argon2.IDKey([]byte(password), salt, time, memory, threads, keyLen)

	if len(hash) != len(expectedHash) {
		return false
	}

	// Constant time comparison
	var result byte
	for i := 0; i < len(hash); i++ {
		result |= hash[i] ^ expectedHash[i]
	}

	return result == 0
}
