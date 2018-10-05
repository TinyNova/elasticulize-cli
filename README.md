# Elasticulize-cli

Elasticulize is a command line tool to help automate deployment changes to your elasticsearch cluster. It closely follows the same patterns set by ["Sequelize"](https://github.com/sequelize/cli) a nodejs ORM.

## Installation
---
### Globally

Dillinger requires [Node.js](https://nodejs.org/) v8.0+ to run.

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

### cluster:migrate
Runs all migrations from the current version of the cluster. Will create an index called `version` to store the current state of the cluster if it doesnt exist.

**!NOTE!**  *Migrations are non transactional. If your migration fails half way through, you can end up in a bad state which not only sucks, it is sometimes very hard to correct. This is a limitation due to the nature of elasticsearch not having transactional functionality like a relational database.*

### cluster:migrate:undo
Rolls back a single migration. Unlike `cluster:migrate` which will run all migrations needed to put the cluster at the current version, `cluster:migrate:undo` only rolls back a single version from the current version on the cluster.

### cluster:migrate:create
(Optional): `--name my-useful-description`
Creates a template for a new migration. Using the `--name` parameter will suffix the file with that value of the parameter. This is used for your sanity when looking at a folder of migrations.

Migrations can be sync or async. If you need to perform an async task, the function must return a promise.
example:

***20180929121903-create-users-index.js***
Up/Down expect a promise returned if performing an async task. Since client.indices.create/delete return a promise, so for ease of use, just return that.
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