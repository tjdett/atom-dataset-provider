/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    exec = require('child_process').exec,
    fs = require('fs'),
    mime = require('mime'),
    path = require('path'),
    os = require('os');

var getFileOwner = function (file, callback) {
  var cmd;
  switch (os.platform) {
    case 'win32':
      cmd = 'powershell -Command "(get-acl <%=filename%>).owner"';
      break;
    default:
      cmd = 'stat -c "%U" <%=filename%>';
  }
  cmd = _.template(cmd, {filename: file});
  exec(cmd, function (error, stdout, stderr) {
     callback(null, stdout.trim()); 
  });
};

var scan = function(directory, callback) {
  fs.readdir(directory, function(err, files) {
    files = _.map(files, function(v) { return path.join(testDir, v); });
    async.parallel({
        owners: function(callback) { 
          async.map(files, getFileOwner, callback); 
        },
        stats: function(callback) {
          async.map(files, fs.stat, callback); 
        }
      }, 
      function(err, results) {
        retval = _.chain(_.zip(files, results.owners, results.stats))
          .sortBy(function(tuple) {
              return _.last(tuple).mtime.getTime();
          })
          .reverse()
          .map(function(tuple) {
            relativeName = path.relative(directory, _.first(tuple)).trim();
            return {
              'author': {
                'name': tuple[1],
              },
              'files': [{
                'href': relativeName,
                'length': _.last(tuple).size,
                'title': path.basename(relativeName),
                'type': mime.lookup(relativeName)
              }],
              'updated': _.last(tuple).mtime
            }
          })
          .value();
        callback(null, retval);
      });
  });
};

exports.scan = scan;
