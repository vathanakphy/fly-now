# Security and Secret Handling

## Summary

Environment values are encrypted with authenticated encryption before reaching
the repository. Startup key configuration and key rotation are not implemented.

## Encryption flow

```text
plaintext value
      |
      v
application.Service.SetEnvironment
      |
      +-- additional data = application ID + NUL + variable key
      v
secret.Box.Seal (AES-GCM + random nonce)
      |
      v
ciphertext + nonce + key version --> PostgreSQL
```

AES-GCM provides confidentiality and detects modification. Additional data binds
the encrypted value to its application and variable key without storing that
context inside the ciphertext.

## Output protection

`Service.Environment` clears ciphertext and nonce before returning variables.
There is currently no operation that returns decrypted values.

The future CLI must mask sensitive values and must not print plaintext,
ciphertext, nonces, or encryption keys in output or logs.

## Implemented tests

Unit tests cover:

- encryption and decryption round trips;
- invalid key configuration;
- invalid nonce length;
- modified ciphertext;
- mismatched additional data.

## Remaining work

1. Add typed encryption key and key-version configuration.
2. Decode and validate the key during startup.
3. Support lookup of old key versions for decryption and rotation.
4. Add configuration, rotation, and database integration tests.
5. Establish a safe operational process for supplying keys outside source code.

