/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    Mustache = require('mustache'),
    fs = require('fs');

/* From http://stackoverflow.com/a/1917041/701439 */
var sharedStart = function(A) {
  var tem1, tem2, s, A= A.slice(0).sort();
  tem1= A[0];
  s= tem1.length;
  tem2= A.pop();
  while(s && tem2.indexOf(tem1)== -1){
      tem1= tem1.substring(0, --s);
  }
  return tem1;
}
    
var itemId = function() {
  groupName = sharedStart(_.pluck(this.files, 'href'));
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
