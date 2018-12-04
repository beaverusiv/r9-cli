# r9

Room9 commandline tool to run common developer tasks

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/r9.svg)](https://npmjs.org/package/@room9/r9)
[![Downloads/week](https://img.shields.io/npm/dw/r9.svg)](https://npmjs.org/package/@room9/r9)
[![License](https://img.shields.io/npm/l/r9.svg)](https://github.com/room9/r9/blob/master/package.json)

<!-- toc -->

- [r9](#r-9)
- [Usage](#usage)
- [Commands](#commands)
  <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @room9/r9-cli
$ r9 COMMAND
running command...
$ r9 (-v|--version|version)
@room9/r9-cli/0.2.2 linux-x64 node-v8.14.0
$ r9 --help [COMMAND]
USAGE
  $ r9 COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`r9 config`](#r-9-config)
- [`r9 create-admin`](#r-9-create-admin)
- [`r9 create-feature`](#r-9-create-feature)
- [`r9 create-silverstripe`](#r-9-create-silverstripe)
- [`r9 help [COMMAND]`](#r-9-help-command)

## `r9 config`

Setup needed config for running commands like API keys

```
USAGE
  $ r9 config
```

_See code: [src/commands/config.ts](https://github.com/room9/r9-cli/blob/v0.2.2/src/commands/config.ts)_

## `r9 create-admin`

Create a new react-admin project, including the Gitlab project and stable/demo-integration branches

```
USAGE
  $ r9 create-admin
```

_See code: [src/commands/create-admin.ts](https://github.com/room9/r9-cli/blob/v0.2.2/src/commands/create-admin.ts)_

## `r9 create-feature`

Create a new twgit feature sourced from Pivotal Tracker

```
USAGE
  $ r9 create-feature
```

_See code: [src/commands/create-feature.ts](https://github.com/room9/r9-cli/blob/v0.2.2/src/commands/create-feature.ts)_

## `r9 create-silverstripe`

Create a new Silverstripe project, including the Gitlab project and stable/demo-integration branches, and Dockerfile/.gitlab-ci.yml

```
USAGE
  $ r9 create-silverstripe
```

_See code: [src/commands/create-silverstripe.ts](https://github.com/room9/r9-cli/blob/v0.2.2/src/commands/create-silverstripe.ts)_

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
