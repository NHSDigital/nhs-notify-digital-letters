# NHS Notify Digital Letters

[![CI/CD Pull Request](https://github.com/NHSDigital/nhs-notify-digital-letters/actions/workflows/cicd-1-pull-request.yaml/badge.svg)](https://github.com/NHSDigital/nhs-notify-digital-letters/actions/workflows/cicd-1-pull-request.yaml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=NHSDigital_nhs-notify-digital-letters&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=NHSDigital_nhs-notify-digital-letters)

This repository contains the infrastructure and code required to deliver letters digitally that would traditionally be printed and posted.

NHS Trusts currently generate a high volume of letters for patients and other care providers, most of which are still sent in printed form. This project enables those letters to be delivered through the NHS App in digital form, with a fallback to printed letter.

## Table of Contents

- [NHS Notify Digital Letters](#nhs-notify-digital-letters)
  - [Setup](#setup)
    - [Prerequisites](#prerequisites)
    - [Configuration](#configuration)
  - [Usage](#usage)
    - [Testing](#testing)
  - [Design](#design)
    - [Diagrams](#diagrams)
  - [Contacts](#contacts)
  - [Licence](#licence)

## Setup

Clone the repository

```shell
git clone https://github.com/NHSDigital/nhs-notify-digital-letters.git
cd nhs-notify-digital-letters
code protject.code-workspace
```

Reopen with container

```shell
make debug
```

### Prerequisites

The following software packages, or their equivalents, are expected to be installed and configured:

- [Docker](https://www.docker.com/) container runtime or a compatible tool, e.g. [Podman](https://podman.io/), [Rancher](https://rancherdesktop.io/)
- [asdf](https://asdf-vm.com/) version manager,
- [GNU make](https://www.gnu.org/software/make/) 3.82 or later,

> [!NOTE]<br>
> The version of GNU make available by default on macOS is earlier than 3.82. You will need to upgrade it or certain `make` tasks will fail. On macOS, you will need [Homebrew](https://brew.sh/) installed, then to install `make`, like so:
>
> ```shell
> brew install make
> ```
>
> You will then see instructions to fix your [`$PATH`](https://github.com/nhs-england-tools/dotfiles/blob/main/dot_path.tmpl) variable to make the newly installed version available. If you are using [dotfiles](https://github.com/nhs-england-tools/dotfiles), this is all done for you.

- [GNU sed](https://www.gnu.org/software/sed/) and [GNU grep](https://www.gnu.org/software/grep/) are required for the scripted command-line output processing,
- [GNU coreutils](https://www.gnu.org/software/coreutils/) and [GNU binutils](https://www.gnu.org/software/binutils/) may be required to build dependencies like Python, which may need to be compiled during installation,

> [!NOTE]<br>
> For macOS users, installation of the GNU toolchain has been scripted and automated as part of the `dotfiles` project. Please see this [script](https://github.com/nhs-england-tools/dotfiles/blob/main/assets/20-install-base-packages.macos.sh) for details.

- [Python](https://www.python.org/) required to run Git hooks,
- [`jq`](https://jqlang.github.io/jq/) a lightweight and flexible command-line JSON processor.

### Configuration

Installation and configuration of the toolchain dependencies

```shell
make config
```

## Usage

### Testing

There are `make` tasks for you to configure to run your tests.  Run `make test` to see how they work.  You should be able to use the same entry points for local development as in your CI pipeline.

## Design

### Diagrams

![Digital Letters Process](./docs/diagrams/digital-letters-process.png)

## Contacts

NHS Notify Team

Ross Buggins - [ross.buggins@nhs.net](mailto:ross.buggins@nhs.net)

Thomas D'Roza - [tom.droza2@nhs.net](mailto:tom.droza2@nhs.net)

## Licence

The source code for the repository's documentation can be found under [/docs](docs) and is deployed by the CD pipeline to [NHS Notify Digital Letters](https://nhsdigital.github.io/nhs-notify-digital-letters).
