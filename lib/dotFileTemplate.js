module.exports = `` +
`/*
 * config (REQUIRED): The path to a json file with elasticsearch connection information, see elasticsearch docs
 * migrations (REQUIRED): The path where you want your migration files to live in the app
 * service (OPTIONAL): this namespaces the migrations in the version index to a specific app.
 *                     Useful if you have many different services accessing a single cluster and each needs their own
 *                     migration history to track. Use with caution. You can easily shoot yourself in the foot using it.
 */\n` +
`const path = require('path');\n` +
`\n` +
`module.exports = {\n` +
`   config: path.resolve('config', 'elastic.json'),\n` +
`   'migrations-path': path.resolve('elasticulize', 'migrations'),\n` +
`   // service: 'myAppName',\n` +
`};\n`;
