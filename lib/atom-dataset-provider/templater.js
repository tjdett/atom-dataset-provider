/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var Mustache = require('mustache'),
    fs = require('fs');

var render = function(data, callback) {
  var result = "";
  fs.readFile(__dirname+"/templates/feed.atom", function(err, template) {
      callback(null, Mustache.to_html(template.toString('UTF-8'), data));
  });
};

exports.render = render;
