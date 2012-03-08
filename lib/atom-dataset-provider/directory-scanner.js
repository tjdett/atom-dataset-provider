/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    exec = require('child_process').exec,
    Fs = require('meta-fs'),
    fs = require('fs'),
    mime = require('mime'),
    path = require('path');

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
     case 'darwin':
      tmpl = 'stat -f "%Su" "<%=filename%>"';
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

var convertWindowsPaths = function(path) {
  return process.platform == 'win32' ? path.replace('\\','/') : path;
};

// Group by first pattern capture
var groupMatchingDatasets = function(dataset, pattern) {
  return pattern.exec(convertWindowsPaths(_.first(dataset.files).href))[1];
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
    'files': _.chain(datasets)
              .pluck('files')
              .flatten()
              .sortBy(function(f) { return f.title; })
              .value(),
    'updated': _.max(datasets, function(d) { 
      return d.updated.getTime(); 
    }).updated
  };
};

// Build dataset object using the file path and stat object.
var buildDatasetObject = function(details) {
  return {
    'author': {
      // UID is set for later use by populateAuthor()
      'uid': details['stat'].uid,
    },
    'files': [{
      'href': details['file'].trim(),
      'length': details['stat'].size,
      'title': path.basename(details['file']),
      'type': mime.lookup(details['file'])
    }],
    'updated': details['stat'].mtime
  };
};

// Use the previously-populated file path (href) and uid to determine the
// author of the datasets.
// 
// This is more efficient than setting the owner beforehand.
var populateAuthor = function(dataset, callback) {
  var directory = this.directory;
  getOwnerOfFile(_.first(dataset.files).href, dataset.author.uid, 
    function(err, owner) {
      _.each(dataset.files, function(file) {
          // Make relative path & encode URI
          file.href = encodeURI(
            convertWindowsPaths(path.relative(directory, file.href)));
      }); 
      _.defaults(dataset.author, { 'name': owner });
      callback(null, dataset);
    });
};

var nextFunc = function() {
  return {
    'before': getDatasetTime(_.last(this.datasets)),
    'limit': this.limit
  };
};

var prevFunc = function() {
  return {
    'after': getDatasetTime(_.first(this.datasets)),
    'limit': this.limit
  };
};

var filterGroupedDatasetsToPage = function(groupedDatasets, options) {
  var flags = {
    hasPrev: false,
    hasNext: false,
    canLimit: true
  };
  if (_.has(options,'before') && _.has(options, 'after')) {
    // Limit based on `before` and `after`
    groupedDatasets = filterAfter(
      filterBefore(groupedDatasets, options.before, flags), 
        options.after, flags);
  } else if (_.has(options, 'after')) {
    // Limit based on `after` & `limit`
    groupedDatasets = filterAfter(groupedDatasets, options.after, flags);
    if (_.has(options, 'limit')) {
      groupedDatasets = filterLimitBackwards(groupedDatasets, 
                                             options.limit, 
                                             flags);
    }
  } else if (_.has(options, 'before')) {
    // Limit based on `before` & `limit`
    groupedDatasets = filterBefore(groupedDatasets, 
                                  options.before, 
                                  flags);
    if (_.has(options, 'limit')) {
      groupedDatasets = filterLimit(groupedDatasets, 
                                    options.limit, 
                                    flags);
    }
  } else if (_.has(options, 'limit')) {
    groupedDatasets = filterLimit(groupedDatasets, 
                                  options.limit, 
                                  flags);
  }
  
  var page = {
    'datasets': _.flatten(groupedDatasets)
  };
  if (options.limit)  page.limit = options.limit;
  if (flags.hasPrev)  page.prev = _.bind(prevFunc, page);
  if (flags.hasNext)  page.next = _.bind(nextFunc, page);
  
  return page;
};

var filterAfter = function(groupedDatasets, after, flags) {
  return _.filter(groupedDatasets, function(v) {
      if (after < getDatasetTime(_.first(v)))
        return true;
      flags.hasNext = true;
      return false;
    });
}

var filterBefore = function(groupedDatasets, before, flags) {
  return _.filter(groupedDatasets, function(v) {
      if (before > getDatasetTime(_.first(v)))
        return true;
      flags.hasPrev = true;
      return false;
    });
}

var filterLimit = function(groupedDatasets, limit, flags) {
  var count = 0;
  return _.filter(groupedDatasets, function(v) {
      if (count < limit) {
        count += v.length;
        return true;
      }
      flags.hasNext = true;
      return false;
    });
}

var filterLimitBackwards = function(groupedDatasets, limit, flags) {
  return _.chain(groupedDatasets)
    .reverse()
    .filter(function(v) {
      if (this.count < this.limit) {
        this.count += v.length;
        return true;
      }
      this.flags.hasPrev = true;
      return false;
    }, { 'flags': flags, 'count': 0, 'limit': limit })
    .reverse()
    .value();
}

// Scan the given directory and return a list of datasets.
//
// Useful options:
//
//  * `before` -  UTC milli-second timestamp, which limits results
//                to only datasets modified before this date.
//  * `after`  -  UTC milli-second timestamp, which limits results
//                to only datasets modified after this date.
//  * `limit`  -  Soft limit for datasets to return. The limit will be 
//                exceeded where multiple datasets near the limit have 
//                the same modification time.
var scan = function(directory, options, callback) {
  _.defaults(options, {
      groupPattern: /^(.*)\.\w+$/
  });
  var results = {};
  var filesBeingProcessed = {};
  Fs.find(directory, 
    { 
      'match_fn': function(file, stat, depth, cb) {
        // Skip directories, process files
        if (stat.isFile()) {
          file = path.normalize(file);
          results[file] = {
            'file': file,
            'stat': stat
          };
        }
        cb(null);
      }
    },
    function(err) {
      var groupedDatasets = _.chain(_.values(results))
        .map(buildDatasetObject)
        .groupBy(function(i) { return groupMatchingDatasets(i, options.groupPattern); })
        .map(combineGroupedDatasets)
        .groupBy(getDatasetTime)
        .sortBy(function(v, k) { return k; })
        .reverse()
        .value();
      
      var scanResult = filterGroupedDatasetsToPage(groupedDatasets, options);
      scanResult.directory = directory;
      
      async.map(scanResult.datasets, 
        _.bind(populateAuthor, {'directory': directory}), 
        function(err, datasets) {
          scanResult.datasets = datasets;
          callback(null, scanResult); 
        });
      
    });
};

exports.scan = scan;
