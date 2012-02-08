/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var path = require('path');

var stripPathExt = function(filepath) {
  return filepath.replace(new RegExp(path.extname(filepath)+"$"),'');
}

exports.stripPathExt = stripPathExt;
