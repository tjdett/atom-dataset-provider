var path = require('path');

var version = JSON.parse(require('fs')
    .readFileSync(path.join(__dirname, '..', '..', 'package.json')))
    .version

var options = require('commander')
  .version(version)
  .option('-d, --directory <dir>', '<dir> to monitor', '.')
  .option('-p, --port <port>', '<port> to serve on', parseInt);

exports = module.exports = options;
