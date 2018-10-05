# Elasticulize-cli

Elasticulize is a command line tool to help automate deployment changes to your elasticsearch cluster. It closely follows the same patterns set by ["Sequelize"](https://github.com/sequelize/cli) a nodejs ORM.

### What is the problem Elasticulize solves?

In a true CI pipeline, everything should be automated. This includes upgrades to your data stores such as a relational database or in this case an elasticsearch cluster. You want to upgrade the data store at the time you also release new code.

You can make this client part of your release process. Run `cluster:migrate` and it will attempt to run any upgrades everytime you release. If it is already at the latest version, nothing will happen.

If you use Circle CI, for example as your CI pipeline, your config might look something like this

```yaml
version: 2
jobs:
  build:
    docker:
      - image: circleci/<language>:<version TAG>
    steps:
      - checkout
      - run:
          name: Upgrade Database
          command: |
            sequelize db:migrate
            sequelize db:seed:all
      - run:
          name: Upgrade Elastic Search Cluster
          command: |
            elasticulize:migrate
  test:
    docker:
      - image: circleci/<language>:<version TAG>
    steps:
      - checkout
      - run: <command>
workflows:
  version: 2
  build_and_test:
    jobs:
      - build
      - test
```

## Installation

### Globally

Elasticulize requires [Node.js](https://nodejs.org/) v8.0+ to run.

Install CLI globally with

```sh
$ npm install -g elasticulize-cli
```
Now you can run CLI using following command anywhere
```sh
$ elasticulize
```
### Locally
Install CLI locally to your `node_modules` folder with

```sh
$ npm install --save elasticulize-cli
```
You should be able to run CLI with
```sh
$ node_modules/.bin/elasticulize
```

## Usage
```
Elasticulize CLI [Node: v8.10.0, CLI: 1.0.0]

Commands:
    init                    Initialize the project
    cluster:migrate         Run pending migrations
    cluster:migrate:undo    Reverts a migration
    cluster:migrate:create  Generates a new migration
```
### init
Will build out initial files and folders needed to run migrations.
```
- .elasticulize
- config/
  | _ elastic.json
- migrations/
  |_ {future migrations}
```

The `.elasticulize` file contains file references for the client. You can move/rename the config or migrations folder. If you do, update the .elasticulize file to point to the new correct paths/names.

This file should remain in your root folder. All commands should be performed in your root folder where this file resides.

### cluster:migrate
Runs all migrations from the current version of the cluster. Will create an index called `version` to store the current state of the cluster if it doesnt exist.

**!NOTE!**  *Migrations are non transactional. If your migration fails half way through, you can end up in a bad state which not only sucks, it is sometimes very hard to correct. This is a limitation due to the nature of elasticsearch not having transactional functionality like a relational database.*

It is better to have more small migrations (perferably only performing a single task) than a migration that does lots.

### cluster:migrate:undo
Rolls back a single migration. Unlike `cluster:migrate` which will run all migrations needed to put the cluster at the current version, `cluster:migrate:undo` only rolls back a single version from the current version on the cluster.

### cluster:migrate:create
(Optional): `--name my-useful-description`
Creates a template for a new migration. Using the `--name` parameter will suffix the file with that value of the parameter. This is used for your sanity when looking at a folder of migrations.

Migrations can be sync or async. If you need to perform an async task, the function must return a promise.

example: ***20180929121903-create-users-index.js***

Here is an example of a migration that creates an index. A client is passed to your function. Up/Down expect a promise returned if performing an async task. The methods `client.indices.create/delete` return a promise.
```javascript
'use strict';
module.exports = {
    up: (client) => {
        return client.indices.create({
            index: 'users'
        });
    },
    down: (client) => {
        return client.indicies.delete({
            index: 'users'
        });
    }
};
```

### Todos

 - Add in Seed ability
 - Make the commands more robust and handle errors better
 - Refactor a bit


---
### Please contribute if you can. ###
License
----

MIT