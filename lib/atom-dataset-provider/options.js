/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var commander = require('commander'),
    path = require('path');

var version = JSON.parse(require('fs')
    .readFileSync(path.join(__dirname, '..', '..', 'package.json')))
    .version;

var Options = function() {
   return (new commander.Command)
    .version(version)
    .option('-d, --directory <dir>', '<dir> to monitor', '.')
    .option('-p, --port <port>', '<port> to serve on', parseInt, 4000)
    .option('--title <title>', '<title> for feed', require('os').hostname());
}

exports = module.exports = Options;
