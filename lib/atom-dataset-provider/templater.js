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
  item.updatedAsTimestamp = item.updated.toISOString();
  return item;
};
    
var render = function(data, callback) {
  // Modify prev() and next() for templating
  _.each(['prev','next'], function(rel) {
      if (_.has(data, rel)) {
        // Wrap the result with a templating function
        data[rel] = _.compose(function(d) { 
            return _.map(d, function(v, k) { return k+'='+v }).join('&');
        }, data[rel]);
      }
  });
  data.datasets = _.map(data.datasets, transformDatasets);
  if (data.datasets.length == 0) {
    data.updatedAsTimestamp = (new Date).toISOString();
  } else {
    data.updatedAsTimestamp = _.first(data.datasets).updatedAsTimestamp;
  }
  var result = "";
  fs.readFile(__dirname+"/templates/feed.atom", function(err, template) {
      callback(null, Mustache.to_html(template.toString('UTF-8'), data));
  });
};

exports.render = render;
