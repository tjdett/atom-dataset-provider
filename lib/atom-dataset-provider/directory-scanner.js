/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    exec = require('child_process').exec,
    Fs = require('meta-fs'),
    fs = require('fs'),
    mime = require('mime'),
    path = require('path'),
    stripPathExt = require('./util').stripPathExt;

var uidLookup = {};

/* On Windows, UID is always 0, so to be safe we never cache it anywhere. */
var isUidCacheable = function(uid) { return uid > 0; };

var getOwnerOfFile = function (file, uid, callback) {
  // Get cached result if one is available
  if (uidLookup[uid]) {
    callback(null, uidLookup[uid]);
    return;
  }
  // Get command to run
  switch (process.platform) {
    case 'win32':
      tmpl = 'powershell -Command "(get-acl <%=filename%>).owner"';
      break;
    default:
      tmpl = 'stat -c "%U" "<%=filename%>"';
  }
  cmd = _.template(tmpl, {filename: file});
  // Run the command
  var child = exec(cmd, function (error, stdout, stderr) {
     username = stdout.trim();
     // If we can cache this result, do so
     if (isUidCacheable(uid))
       uidLookup[uid] = username;
     // Return the result
     callback(null, username); 
  });
  // STDIN needs to be closed, or we'll wait forever
  child.stdin.end();
};

var groupMatchingDatasets = function(dataset) {
  return dataset.author.name+" - "+stripPathExt(_.first(dataset.files).href);
};

var getDatasetTime = function(dataset) {
  var getTimeUTC = function(d) { 
    return d.getTime() + (d.getTimezoneOffset() * 60000);
  };
  return getTimeUTC(dataset.updated);
};

var combineGroupedDatasets = function(datasets) {
  // Handle singular case quickly
  if (datasets.length == 1)
    return _.first(datasets);
  return {
    'author': _.first(datasets).author,
    'files': _.flatten(_.pluck(datasets,'files')),
    'updated': _.max(datasets, function(d) { 
      return d.updated.getTime(); 
    }).updated
  };
};

var buildDatasetObject = function(details) {
  relativeName = path.relative(this.directory, details['file']).trim();
  return {
    'author': {
      'name': details['owner'],
    },
    'files': [{
      'href': relativeName,
      'length': details['stat'].size,
      'title': path.basename(relativeName),
      'type': mime.lookup(relativeName)
    }],
    'updated': details['stat'].mtime
  }
};

// Scan the given directory and return a list of datasets.
//
// Useful options:
//
//  * `before` -  UTC milli-second timestamp, which limits results
//                to only datasets modified before this date.
//  * `limit`  -  Soft limit for datasets to return. The limit will be 
//                exceeded where multiple near the limit have the same
//                modification time.
var scan = function(directory, options, callback) {
  _.defaults(options, {
    'before': null,
    'limit':  null
  });
  var results = {};
  var filesBeingProcessed = {};
  Fs.find(directory, 
    { 
      'match_fn': function(file, stat, depth, cb) {
        // Skip directories, process files
        if (stat.isFile()) {
          file = path.normalize(file);
          filesBeingProcessed[file] = true;
          getOwnerOfFile(file, stat.uid, function(err, owner) {
              results[file] = {
                'file': file,
                'owner': owner,
                'stat': stat
              };
              delete filesBeingProcessed[file];
          });
        }
        cb(null);
      }
    },
    function(err) {
      var processFiles = function(results) {
        var groupedDatasets = _.chain(_.values(results))
          .map(_.bind(buildDatasetObject, {'directory': directory}))
          .groupBy(groupMatchingDatasets)
          .map(combineGroupedDatasets)
          .groupBy(getDatasetTime)
          .sortBy(function(v, k) { return k; })
          .reverse();
        if (options.before != null)  
          groupedDatasets = groupedDatasets.filter(function(v) {
            return this.before > getDatasetTime(_.first(v));
          }, { 'before': options.before });
        if (options.limit != null)
          groupedDatasets = groupedDatasets.filter(function(v) {
            if (this.count >= this.limit)
              return false;
            this.count += v.length;
            return true;
          }, { 'count': 0, 'limit': options.limit });
        var retval = groupedDatasets
          .flatten()
          .value();
        callback(null, retval);
      };
      // Can't process until all the files are in
      var waitForFiles = function() {
        if (_.values(filesBeingProcessed).length == 0) 
          processFiles(results);
        else
          process.nextTick(waitForFiles);
      };
      // Wait before processing
      waitForFiles();
    });
};

exports.stripPathExt = stripPathExt;
exports.scan = scan;
