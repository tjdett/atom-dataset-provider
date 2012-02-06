/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    exec = require('child_process').exec,
    fs = require('fs'),
    mime = require('mime'),
    path = require('path');

var getOwnersOfFiles = function (files, callback) {
  switch (process.platform) {
    case 'win32':
      callback(null, _.map(files, function() { return 'unknown'; }));
      return;
    default:
      tmpl = 'stat -c "%U" "<%=filename%>"';
      async.map(files, function(file, c) {
        cmd = _.template(tmpl, {filename: file});
        exec(cmd, function (error, stdout, stderr) {
           c(null, stdout.trim()); 
        });
      }, callback);
  }
};

var scan = function(directory, callback) {
  fs.readdir(directory, function(err, files) {
    files = _.map(files, function(v) { return path.join(testDir, v); });
    async.parallel({
        owners: function(callback) { 
          getOwnersOfFiles(files, callback);
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
