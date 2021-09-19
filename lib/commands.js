const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const moment = require('moment');
const async = require('async');
const appInfo = require('../package.json');
const env = process.env.NODE_ENV || 'development';
const configTemplate = require('./configTemplate.json');
const dotFileTemplate = require('./dotFileTemplate');
const migrationTemplate = require('./migrationTemplate');

function Commands (paths) {
    this.CONFIG_PATH = paths['config'];
    this.MIGRATION_PATH = paths['migrations-path'];
    this.SERVICE_NAME = paths['service'];

    this._init = (envArgument) => {
        return new Promise(async (res, rej) => {
            if (!this.CONFIG_PATH) {
                setImmediate(res);
                return;
            }

            const configData = require(this.CONFIG_PATH);
            const configType = typeof configData;

            let config = {};
            if (configType === 'function' && configData.constructor.name === 'AsyncFunction') {
                config = await configData();
            } else if (configType === 'function') {
                config = configData();
            } else {
                config = configData;
            }
            this.config = _.get(config, `${envArgument || env}`);

            // Weird bug where you cant pass https-aws-es by ref
            // Would love to remove this if someone can figure out why
            if (this.config.awsConfig) {
                this.config.connectionClass = require('http-aws-es');
            }

            this.client = new elasticsearch.Client(this.config);
            res();
        });
    };

    this['init'] = function () {
        const rootDir = './elasticulize';
        const migrationsDir = `${rootDir}/migrations`;
        const configDir = './config';
        const configFile = `${configDir}/elastic.json`;
        const dotFile = `./.elasticulizerc`;

        if (!fs.existsSync(rootDir)){
            fs.mkdirSync(rootDir);
        }

        if (!fs.existsSync(configDir)){
            fs.mkdirSync(configDir);
        }

        if (!fs.existsSync(migrationsDir)){
            fs.mkdirSync(migrationsDir);
        }

        if (!fs.existsSync(configFile)) {
            fs.writeFileSync(configFile, JSON.stringify(configTemplate, true, 4), 'utf8');
        }

        if (!fs.existsSync(dotFile)) {
            fs.writeFileSync(dotFile, dotFileTemplate, 'utf8');
        }
    }

    this['cluster:migrate'] = async function () {
        const migrations = getMigrations(this.MIGRATION_PATH);
        const versionIndexExists = await this.client.indices.exists({
            index: 'version'
        });

        if (!versionIndexExists) {
            await this.client.indices.create({
                index: 'version'
            });
        }

        const versionsResponse = await getVersions(this.client, this.SERVICE_NAME);
        const versions = _.sortBy(_.get(versionsResponse, 'hits.hits', []), '_id');
        const currentVersion = _.get(versions.pop(), '_id');
        console.log(`Found current version: ${currentVersion}`);
	    console.log(`Migrations found: ${JSON.stringify(migrations)}`);
	    const index = _.findIndex(migrations, m => m.filename == `${currentVersion}.js`);
        const toDoMigrations = migrations.slice(index + 1, migrations.length);
        if (toDoMigrations.length == 0) {
            console.log('Already at the highest version');
            return;
        }
        printApplicationInfo();
        async.mapSeries(toDoMigrations, (migration, cb) => {
            const migrationNumber = path.parse(migration.filename).name;
            console.log(`== ${migration.filename}: migrating =======`);
            const beginTime = Date.now();
            migration.up(this.client)
                .then(() => {
                    return this.client.create({
                        index: 'version',
                        type: 'default',
                        id: migrationNumber,
                        body: {
                            version: migrationNumber,
                            released: Date.now(),
                            ...(this.SERVICE_NAME ? {
                                service: this.SERVICE_NAME
                            } : null)
                        }
                    });
                })
                .then(() => {
                    const endTime = Date.now()
                    const duration = moment.duration(endTime - beginTime).asSeconds();
                    console.log(`== ${migration.filename}: migrated (${duration}s) \n`);
                    cb();
                })
                .catch(error => {
                    console.log('Error: ', error);
                    process.exit(1);
                });
        });
    }

    this['cluster:migrate:undo'] = async function () {
        const migrations = getMigrations(this.MIGRATION_PATH);
        const versionsResponse = await getVersions(this.client, this.SERVICE_NAME);
        const versions = _.sortBy(_.get(versionsResponse, 'hits.hits', []), '_id');
        if (versions.length == 0) {
            console.log('Nothing left to undo');
            return;
        }

        const currentVersion = _.get(versions.pop(), '_id');
        const index = _.findIndex(migrations, m => m.filename == `${currentVersion}.js`);
        const migration = migrations[index];
        const migrationNumber = path.parse(migration.filename).name;

        printApplicationInfo();
        console.log(`== ${migration.filename}: reverting =======`);
        const beginTime = Date.now();
        await migration.down(this.client);
        await this.client.delete({
            index: 'version',
            type: 'default',
            id: migrationNumber
        });
        const endTime = Date.now()
        const duration = moment.duration(endTime - beginTime).asSeconds();
        console.log(`== ${migration.filename}: reverted (${duration}s) \n`);
    }

    this['cluster:migrate:create'] = async function ({ name }) {
        name = name || 'migration';
        const fileName = `${moment().format('YYYYMMDDhhmmss')}-${name}.js`;
        const filePath = `${this.MIGRATION_PATH}/${fileName}`;
        fs.writeFileSync(filePath, migrationTemplate, 'utf8');
    }
}

function getMigrations (migrationPath) {
    const migrations = [];
    fs.readdirSync(migrationPath)
        .filter(file =>
            (file.indexOf('.') !== 0) &&
            (file.slice(-3) === '.js'))
        .forEach(file => {
            const migration = require(path.join(migrationPath, file));
            migration.filename = file;
            migrations.push(migration);
        });
    return _.sortBy(migrations, 'filename');;
}

async function getVersions (client, service) {
    let serviceFilter = {};
    if (service) {
        serviceFilter = {
            query: {
                bool: {
                    filter: {
                        term: {
                            service: service
                        }
                    }
                }
            }
        }
    }
    return client.search({
        index: 'version',
        body: {
            size: 10000,
            ...serviceFilter,
        }
    });
}

function printApplicationInfo() {
    console.log(`Elasticulize CLI [Node: ${process.version}, CLI: ${appInfo.version}] \n`);
}

module.exports = Commands;
