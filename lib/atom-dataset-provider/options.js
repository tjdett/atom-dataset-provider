var path = require('path');

var version = JSON.parse(require('fs')
    .readFileSync(path.join(__dirname, '..', '..', 'package.json')))
    .version

var options = require('commander')
  .version(version)
  .option('-d, --directory <dir>', 'Specify <dir> to monitor', '.');

exports = module.exports = options;
