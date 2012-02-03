/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path');

var scan = function(directory, callback) {
  fs.readdir(directory, function(err, files) {
      files = _.map(files, function(v) { return path.join(testDir, v); });
      async.map(files, fs.stat, function(err, stats) {
          tuples = _.sortBy(_.zip(files, stats), function(tuple) {
              return tuple[1].mtime.getTime();
          });
          results = _.map(tuples, function(tuple) {
              return {
                'files': [ tuple[0] ],
                'updated': tuple[1].mtime
              }
          });
          callback(null, results);
      });
  });
};

exports.scan = scan;
