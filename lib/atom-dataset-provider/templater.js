/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    Mustache = require('mustache'),
    fs = require('fs'),
    stripPathExt = require('./util').stripPathExt;
    
var itemId = function() {
  groupName = stripPathExt(_.first(this.files).href);
  return groupName+"@"+this.updated;
}
    
var transformDatasets = function(item) {
  item.id = itemId;
  item.updated = item.updated.toISOString();
  return item;
};
    
var render = function(data, callback) {
  data.datasets = _.map(data.datasets, transformDatasets);
  if (data.datasets.length == 0) {
    data.updated = (new Date).toISOString();
  } else {
    data.updated = _.first(data.datasets).updated;
  }
  var result = "";
  fs.readFile(__dirname+"/templates/feed.atom", function(err, template) {
      callback(null, Mustache.to_html(template.toString('UTF-8'), data));
  });
};

exports.render = render;
