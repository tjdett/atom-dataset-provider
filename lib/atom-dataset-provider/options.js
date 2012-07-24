/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var commander = require('commander'),
    path = require('path');

var version = JSON.parse(require('fs')
    .readFileSync(path.join(__dirname, '..', '..', 'package.json')))
    .version;

var stringToPattern = function(strPattern) {
  if (strPattern.charAt(0) == '/')
    strPattern = strPattern.slice(1, strPattern.length-1);
  return new RegExp(strPattern);
};
    
var Options = function() {
   return (new commander.Command)
    .version(version)
    .option('-d, --directory <dir>', '<dir> to monitor', '.')
    .option('-p, --port <port>', '<port> to serve on', parseInt, 4000)
    .option('--title <title>', '<title> for feed', require('os').hostname())
    .option('--group-pattern <pattern>', 
            '<pattern> with capture to group by. eg. /^(.*)\\.\\w+$/', 
            stringToPattern, /^(.*)\.\w+$/)
    .option('--exclude-pattern <pattern>', 
            'exclude any file containing <pattern>. eg /Thumbs.db|/archived/$/', 
            stringToPattern, /$^/)
    .option('--entry-title-pattern <pattern>', 
            '<pattern> with capture to set title of entry. eg. /^.*/([^/]+)$/', 
            stringToPattern, /^.*\/([^/]+)$/)
    .option('--no-hashes', 'do not generate SHA hashes for file contents');
}

exports = module.exports = Options;
