/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    exec = require('child_process').exec,
    findit = require('findit'),
    fs = require('fs'),
    mime = require('mime'),
    path = require('path');

var uidLookup = {};

/* On Windows, UID is always 0, so to be safe we never cache it anywhere. */
var isUidCacheable = function(uid) { return uid > 0; };
    
var getOwnerOfFile = function (file, stat, callback) {
  // Get cached result if one is available
  if (uidLookup[stat.uid]) {
    callback(null, uidLookup[stat.uid]);
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
     if (isUidCacheable(stat.uid))
       uidLookup[stat.uid] = username;
     // Return the result
     callback(null, username); 
  });
  // STDIN needs to be closed, or we'll wait forever
  child.stdin.end();
};

var groupDatasets = function(dataset) {
    extRegex = new RegExp(path.extname(_.first(dataset.files).href)+"$");
    withoutExt = _.first(dataset.files).href.replace(extRegex,'');
    return dataset.author.name+" - "+withoutExt
};

var combineGroupedDatasets = function(datasets) {
    // Handle singular case quickly
    if (datasets.length == 1)
      return _.first(datasets);
    return {
      'author': _.first(datasets).author,
      'files': _.pluck(datasets,'files'),
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

var scan = function(directory, callback) {
  var finder = findit.find(directory);
  
  var results = {};
  var filesBeingProcessed = {};
  finder.on('file', function(file, stat) {
      filesBeingProcessed[file] = true;
      getOwnerOfFile(file, stat, function(owner) {
          results[file] = {
            'file': file,
            'owner': owner,
            'stat': stat
          };
          delete filesBeingProcessed[file];
      });
  });
  
  finder.on('end', function() {
    var processFiles = function(results) {
      retval = _.chain(_.values(results))
        .sortBy(function(details) {
            // Sort by time
            return details['stat'].mtime.getTime();
        })
        .reverse() // Reverse sort
        .map(_.bind(buildDatasetObject, {'directory': directory}))
        .groupBy(groupDatasets)
        .map(combineGroupedDatasets)
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

exports.scan = scan;
