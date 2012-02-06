/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    mime = require('mime'),
    path = require('path');

var scan = function(directory, callback) {
  fs.readdir(directory, function(err, files) {
      files = _.map(files, function(v) { return path.join(testDir, v); });
      async.map(files, fs.stat, function(err, stats) {
          results = _.chain(_.zip(files, stats))
            .sortBy(function(tuple) {
                return _.last(tuple).mtime.getTime();
            })
            .reverse()
            .map(function(tuple) {
              relativeName = path.relative(directory, _.first(tuple)).trim();
              return {
                'files': [{
                  'href': relativeName,
                  'length': _.last(tuple).size,
                  'type': mime.lookup(relativeName)
                }],
                'updated': _.last(tuple).mtime
              }
            })
            .value();
          callback(null, results);
      });
  });
};

exports.scan = scan;
