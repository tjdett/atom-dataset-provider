/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    async = require('async'),
    crypto = require('crypto'),
    exec = require('child_process').exec,
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
  // ### TODO strip href back to the unique part after dataset root
  // ### (would break all existing scripts...)
  var r = pattern.exec(convertWindowsPaths(_.first(dataset.files).href));
  if (r)
    return r[1];
  else
    // if regex doesn't match, group everything together - it's better than crashing
    return "ungrouped";
};

var getTimeUTC = function(d) { 
  return d.getTime() + (d.getTimezoneOffset() * 60000);
};

var getDatasetTime = function(dataset) {
  //console.log(dataset);
  return getTimeUTC(dataset.updated);
};

var getEntryTitle = function(details, options) {
    if (_.has(options, 'entryTitlePattern')) {	
        r = options.entryTitlePattern
            .exec(_.flatten(details[0].files)[0].href);
        if (r)
           return r[1];
        else
           return _.flatten(details[0].files)[0].href;
    } else
        return details['file'];
}

var makePathVars = function(pathstr, home) {
    // Split/a/directory/tree up into path1=split, path2=a, path3=directory.
    relpathstr = pathstr.substring(home.length-1)
    re = /^\/([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?([^/]+\/)?/
    relr = re.exec(relpathstr);
    fullr = re.exec(pathstr);
    p = {};
    for (i = 1; fullr && fullr[i]; i++) {
        p["path" + i] = fullr[i].substring(0, fullr[i].length-1); // -1: remove trailing / 
        p["path" + i + ".lower()"] = p["path" + i].toLowerCase();
    }
    for (i = 1; relr && relr[i]; i++) {
        p["relpath" + i] = relr[i].substring(0, relr[i].length-1);
        p["relpath" + i + ".lower()"] = p["relpath" + i].toLowerCase(); // why? to solve a case-sensitivity issue 
    } 
    p["path"] = path.dirname(pathstr);
    p["relpath"] = path.dirname(relpathstr);               
    return p;    
}

// Groups a set of structures about files into a single dataset
// containing a list of files. Hence combineGroupedDatasets is a half-flattened
// aggregate of structures returned by buildDatasetObject.
var combineGroupedDatasets = function(datasets, options, directory) {
  p = makePathVars(datasets[0].files[0].href, directory);
  p['author'] = _.first(datasets).author;
  p['entrytitle'] = getEntryTitle(datasets, options);
  p['files'] = _.chain(datasets)
              .pluck('files')
              .flatten()
              .sortBy(function(f) { return f.title; })
              .value();
  p['updated']= _.max(datasets, function(d) { 
      return d.updated.getTime(); 
    }).updated;

  return p;
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
      'path': details['file'].trim(), // href gets mangled
      'length': details['stat'].size,
      'title': path.basename(details['file']),
      'type': mime.lookup(details['file']),
      // created/updated are unix seconds x1000
      // my cursory testing on OSX shows that ctime always == mtime.
      'created': getTimeUTC(details['stat'].ctime),  
      'updated': getTimeUTC(details['stat'].mtime)
    }],
    'updated': details['stat'].mtime
  };
};

var populateExpensiveAttributes = function(dataset, callback) {
  if (this.options.hashes) {
    async.waterfall([
      function(c) { populateHash(dataset, c); },
        _.bind(populateAuthor, this)
	], callback);  	
  } else {
  	async.waterfall([ _.bind(populateAuthor, this, dataset) ] , callback);
  }
};

var populateHash = function(dataset, callback) {
  var getHash = function(callback) {
    var sha512sum = crypto.createHash('sha512');

    var s = fs.ReadStream(this.href);
    s.on('data', function(d) {
      sha512sum.update(d);
    });

    s.on('end', function() {
      callback(null, sha512sum.digest('hex'));
    });
  };

  var hashJobs = _(dataset.files).map(function(f) {
    return _.bind(getHash, f);
  });

  async.series(
    hashJobs,
    function(err, results) {
      _.chain(dataset.files)
       .zip(results)
       .each(function(arr) {
           var file = arr[0], hash = arr[1];
           file.sha512 = hash;
       });
      callback(null, dataset);
    });
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

var walkDir = function(dir, excludePattern, done) {
  /** Produce dictionary of files within a directory structure, following symbolic links. */
  // from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
  
  var results = {};
  fs.readdir(dir, function(err, list) {
    if (err) 
      return done(err);
    var pending = list.length;
    if (!pending) 
      return done(null, results);

    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walkDir(file, excludePattern, function(err, res) {
            //results = results.concat(res);
            results = _.extend(results,res);
            if (!--pending) 
              done(null, results);
          });
        } else {
          if (!stat) {
            console.log("!stat: " + file);
          }
          //console.log("Found " + file);
          if (!excludePattern.exec(file)) 
            results[file] = { 'file': file, 'stat': stat };
          if (!--pending) 
            done(null, results);
        }
      });
    });
  });
};


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
  function process_results(results) {
    util = require('util');
     var groupedDatasets = _.chain(_.values(results))
        .map(buildDatasetObject)
        .filter(function(i) { return groupMatchingDatasets(i, options.groupPattern) != "ungrouped"; })
        .groupBy(function(i) { return groupMatchingDatasets(i, options.groupPattern); })
        .map(function(x) { return combineGroupedDatasets(x, options, directory); })
        .groupBy(getDatasetTime)
        .sortBy(function(v, k) { return k; })
        .reverse()
        .value();
      //console.log("Groups: " + util.inspect(groupedDatasets));
      var scanResult = filterGroupedDatasetsToPage(groupedDatasets, options);
      scanResult.directory = directory;
      
      async.map(scanResult.datasets, 
        _.bind(populateAuthor, {'directory': directory}), 
        function(err, datasets) {
          scanResult.datasets = datasets;
          callback(null, scanResult); 
        });
      
    
  }

  // This redundant defaulting should be cleaned up. It's there because the Options processing stuff
  // (Commander) doesn't get called from Vows, so the defaults don't get applied. There's probably
  // a way around this.
  _.defaults(options, {
      groupPattern: /^(.*)\.\w+$/,
      excludePattern: /^$/,
      entryTitlePattern: /^.*\/([^/]+)$/,
      hashes: true,
      fileList: ''
  });
  var results = {};
  var filesBeingProcessed = {};
  
  if (options.fileList != '') {
    // Instead of scanning a whole directory, use a pre-computed list of recently modified/created files.
    // Two ways to create such a file:
    // 1. inotifywait (works on any *nix system), sits in the background monitoring a directory tree. Suitable for a setup
    //    where users write directly to a network store, for instance.
    //    example: inotifywait -e close_write -mrq --format %w%f /mnt/np_staging >> filechanges.log &
    // 2. rsync: output a list of files copied during an rsync process with the --out-format argument
    //     This is suitable when using the MicroTardis Harvest scripts, for instance (https://github.com/stevage/MicroTardis-Harvest)
    //    example: rsync -ratu np_staging np_out --out-format "%n" > filechanges.log

    // ## Unresolved question: how often should the filechanges.log file be purged? 
    // ## Also...still, how do we bulk load the first lot of data?
    
    // In some applications would it be useful to rename the file first?
    //    fs.renameSync(filename, filename + '.wip');
    //    filename = filename + '.wip';

    filenames = fs.readFileSync(options.fileList).toString().split("\n");
    filenames.pop(); // remove blank entry after last linefeed
    filenames = _.uniq(filenames);
    //console.log(filenames);
     _.each(filenames, function (f) { 
      results[f] = { 
        'file': f, 
        'stat': fs.statSync(f) 
      };
    });
    process_results(results);
  } else {

    walkDir(directory, options.excludePattern, function(err, results) {
      if (err) {
        console.log("Error in directory scan: " + err);
      }
      process_results(results);
    });
    
  };
}

exports.scan = scan;
