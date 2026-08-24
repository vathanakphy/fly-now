# Domain Model

## Summary

An `Application` is the aggregate root. It owns source, runtime, and environment
configuration needed to build and run one service.

## Relationship view

```text
Application
  |-- 1 Source
  |-- 1 RuntimeConfig
  `-- 0..n EnvironmentVariable

Application 1 -------- 0..n Deployment   (database only for now)
```

Deployment domain behavior has not been implemented yet.

## Application

Important fields:

- `ID`: stable UUID identity.
- `Name`: user-facing name.
- `Slug`: normalized identifier generated during creation.
- `LifecycleState`: `active` or `suspended`.
- `DeletedAt`: supports soft deletion.

The service generates slugs by lowercasing ASCII letters and numbers and
replacing separators or unsupported characters with `-`.

## Source

`Source` identifies where application code comes from:

- `URL`: required absolute `git`, `http`, `https`, `s3`, or `ssh` URL.
- `Ref`: optional branch, tag, commit, or similar reference.

Blank optional references are normalized to `nil`.

## RuntimeConfig

Supported runtime values are:

- `auto`
- `dockerfile`
- `go`
- `node`
- `python`
- `static`

Runtime configuration also contains the source root directory, optional build
and start commands, service port, optional health path, and auto-deploy flag.

Defaults are `runtime=auto`, `root_directory=.`, and `service_port=8080`.

## EnvironmentVariable

Environment variables contain encrypted storage data, never plaintext:

- key and target (`build`, `runtime`, or `both`);
- ciphertext and nonce;
- encryption key version;
- sensitive flag.

The service removes ciphertext and nonce before returning list results. The key
and metadata remain available for display.

## Input models

Create and update inputs are separate from stored domain models. Updates use:

```go
type Change[T any] struct {
    Value T
    Set   bool
}
```

`Set=false` means “leave the existing field unchanged.” `Set=true` allows even a
zero value such as `false` or `nil` to be applied intentionally.

## Key rules

- A name is required and limited to 100 bytes.
- A generated slug must be non-empty and at most 63 bytes.
- Root directories must remain inside the source directory.
- Commands are limited to 4,000 bytes.
- Service ports must be between 1 and 65,535.
- Health-check paths must begin with `/`.
- Environment keys follow shell-style name syntax.

