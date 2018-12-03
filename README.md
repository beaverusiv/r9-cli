# r9

Room9 commandline tool to run common developer tasks

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/r9.svg)](https://npmjs.org/package/@room9/r9)
[![Downloads/week](https://img.shields.io/npm/dw/r9.svg)](https://npmjs.org/package/@room9/r9)
[![License](https://img.shields.io/npm/l/r9.svg)](https://github.com/room9/r9/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
  <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g r9
$ r9 COMMAND
running command...
$ r9 (-v|--version|version)
r9/0.1.0 linux-x64 node-v8.12.0
$ r9 --help [COMMAND]
USAGE
  $ r9 COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- `r9 config`
- `r9 create-admin`
- `r9 help [COMMAND]`

## `r9 config`

Setup needed config for running commands like API keys.

**Visit https://git.room9.co.nz/profile/personal_access_tokens and ensure you have a personal access token with api access ready for input!**

```
USAGE
  $ r9 config

OPTIONS
  No options

EXAMPLE
  $ r9 config
```

## `r9 create-admin`

Create a new react-admin project, including the Gitlab project and stable/demo-integration branches

```
USAGE
  $ r9 create-admin

OPTIONS
  No options

EXAMPLE
  $ r9 create-admin
```

## `r9 help [COMMAND]`

display help for r9

```
USAGE
  $ r9 help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.3/src/commands/help.ts)_

<!-- commandsstop -->
