/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var _ = require('underscore'),
    async = require('async'),
    should = require('should'),
    fs = require('fs'),
    path = require('path'),
    temp = require('temp'),
    vows = require('vows');

var scanner = require('../lib/atom-dataset-provider/directory-scanner.js');

vows.describe('Directory Scanner').addBatch({
    'when run on an empty directory': {
      topic: function() {
        var testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
        scanner.scan(testDir, {}, this.callback);
      },
      "should provide an empty list of datasets": function(err, scanResult) {
        scanResult.should.be.instanceof(Object);
        scanResult.datasets.should.be.instanceof(Array);
        scanResult.datasets.should.have.length(0);
        scanResult.should.not.have.property('next');
        scanResult.should.not.have.property('prev');
      }
    },
    'when run on a directory with files "a.txt", "b.txt" & "c .txt"': {
      topic: function() {
        var testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
        var topicCallback = this.callback;
        var testData = _.zip(
          ['a.txt','b.txt','c .txt'],
          _.range(3000, 0, -1000));
        async.forEachSeries(testData, function(v, callback) {
            // Create absolute path for test file
            var testFile = path.join(testDir, _.first(v));
            // Write file
            fs.writeFile(testFile, 'test', function() {
                // Create new modified time (using second argument as a time
                // offset) so we get ['a','b','c'] when sorted by time.
                var newTime = new Date((new Date).getTime()-_.last(v));
                fs.utimes(testFile, newTime, newTime, callback);
            });
          }, function(err) {
            scanner.scan(testDir, {}, topicCallback);
          });
      },
      "should provide a list of three datasets": function(err, scanResult) {
        scanResult.should.be.instanceof(Object);
        scanResult.datasets.should.be.instanceof(Array);
        scanResult.datasets.should.have.length(3);
      },
      "should in a dataset": {
        topic: function(scanResult) {
          return _.first(scanResult.datasets);
        },
        'have a list of files with "href", "length", "title" & "type"': 
          function(err, dataset) {
            dataset.should.have.ownProperty('files');
            dataset.files.should.be.instanceof(Array);
            dataset.files.should.have.length(1);
            _.first(dataset.files).href.should.be.a('string');
            _.first(dataset.files).length.should.equal(4);
            _.first(dataset.files).title.should.be.a('string');
            _.first(dataset.files).type.should.equal('text/plain');
          },
        "have an updated time": function(err, dataset) {
          dataset.should.have.ownProperty('updated');
          dataset.updated.should.be.instanceof(Date);
        }
      },
      "should produce datasets in reverse order": function(err, scanResult) {
        scanResult.datasets.should.be.instanceof(Array);
        files = _.chain(scanResult.datasets)
          .pluck('files')
          .flatten()
          .pluck('href')
          .value();
        // Check file array against given
        files.should.eql(['c .txt','b.txt','a.txt']);
      }
    },
    'when run on a directory with files "a.tif" & "a.txt"': {
      topic: function() {
        var testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
        var topicCallback = this.callback;
        var testData = _.zip(
          ['a.tif','a.txt'],
          _.range(2000, 0, -1000));
        async.forEachSeries(testData, function(v, callback) {
            // Create absolute path for test file
            var testFile = path.join(testDir, _.first(v));
            // Write file
            fs.writeFile(testFile, 'test', function() {
                // Modify timestamp
                var newTime = new Date((new Date).getTime()-_.last(v));
                fs.utimes(testFile, newTime, newTime, callback);
            });
          }, function(err) {
            scanner.scan(testDir, {}, topicCallback);
          });
      },
      "there should be one dataset": function(err, scanResult) {
        scanResult.should.be.instanceof(Object);
        scanResult.datasets.should.be.instanceof(Array);
        scanResult.datasets.should.have.length(1);
      },
      "the single dataset should have two files": function(err, scanResult) {
        _.first(scanResult.datasets).files.should.be.instanceof(Array);
        _.first(scanResult.datasets).files.should.have.length(2);
      }
    },
    'when run on a directory with 10 files with a limit of 3': {
      topic: function() {
        var testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
        var topicCallback = this.callback;
        var testData = _.zip(
          _.map(_.range(1, 11), function(i) { return i+".txt" }),
          _.range(10000, 0, -1000));
        async.forEachSeries(testData, function(v, callback) {
            // Create absolute path for test file
            var testFile = path.join(testDir, _.first(v));
            // Write file
            fs.writeFile(testFile, 'test', function() {
                // Modify timestamp
                var newTime = new Date((new Date).getTime()-_.last(v));
                fs.utimes(testFile, newTime, newTime, callback);
            });
          }, function(err) {
            scanner.scan(testDir, {'limit': 3}, topicCallback);
          });
      },
      "only the three files most recent files should be returned": 
        function(err, scanResult) {
          scanResult.should.be.instanceof(Object);
          scanResult.datasets.should.be.instanceof(Array);
          scanResult.datasets.should.have.length(3);
          files = _.map(_.pluck(scanResult.datasets, 'files'),_.first);
          files[0].href.should.equal('10.txt');
          files[1].href.should.equal('9.txt');
          files[2].href.should.equal('8.txt');
        },
      "a next() function should be provided": function(err, scanResult) {
        scanResult.should.have.property('next');
        scanResult.next.should.be.a('function');
        scanResult.next().should.have.property('before');
        scanResult.next().should.have.property('limit');
      },
      "a prev() function should not be provided": function(err, scanResult) {
        scanResult.should.not.have.property('prev');
      },
      "and when run using next() details": {
        topic: function(scanResult) {
          scanner.scan(scanResult.directory, scanResult.next(), this.callback);
        },
        "the next three files most recent files should be returned": 
          function(err, scanResult) {
            scanResult.should.be.instanceof(Object);
            scanResult.datasets.should.be.instanceof(Array);
            scanResult.datasets.should.have.length(3);
            files = _.map(_.pluck(scanResult.datasets, 'files'),_.first);
            files[0].href.should.equal('7.txt');
            files[1].href.should.equal('6.txt');
            files[2].href.should.equal('5.txt');
          },
        "a next() function should be provided": function(err, scanResult) {
          scanResult.should.have.property('next');
          scanResult.next.should.be.a('function');
          scanResult.next().should.have.property('before');
          scanResult.next().should.have.property('limit');
        },
        "a prev() function should be provided": function(err, scanResult) {
          scanResult.should.have.property('prev');
          scanResult.prev.should.be.a('function');
          scanResult.prev().should.have.property('after');
          scanResult.prev().should.have.property('limit');
        },
        "then the prev() details": {
          topic: function(scanResult) {
            scanner.scan(scanResult.directory, scanResult.prev(), this.callback);
          },
          "the previous three files should be the same": 
            function(err, scanResult) {
              scanResult.should.be.instanceof(Object);
              scanResult.datasets.should.be.instanceof(Array);
              scanResult.datasets.should.have.length(3);
              files = _.map(_.pluck(scanResult.datasets, 'files'),_.first);
              files[0].href.should.equal('10.txt');
              files[1].href.should.equal('9.txt');
              files[2].href.should.equal('8.txt');
            }
        },
        "twice": {
          topic: function(scanResult) {
            scanner.scan(scanResult.directory, scanResult.next(), this.callback);
          },
          "then the prev() details": {
            topic: function(scanResult) {
              scanner.scan(scanResult.directory, scanResult.prev(), 
                            this.callback);
            },
            "the previous three files should be the same": 
              function(err, scanResult) {
                scanResult.should.be.instanceof(Object);
                scanResult.datasets.should.be.instanceof(Array);
                scanResult.datasets.should.have.length(3);
                files = _.map(_.pluck(scanResult.datasets, 'files'),_.first);
                files[0].href.should.equal('7.txt');
                files[1].href.should.equal('6.txt');
                files[2].href.should.equal('5.txt');
              }
        },
        }
      },
      "and when run just 'before' from next() details": {
        topic: function(scanResult) {
          var options = {
            'before': scanResult.next().before
          };
          scanner.scan(scanResult.directory, options, this.callback);
        },
        "the other seven files should be returned": 
          function(err, scanResult) {
            scanResult.should.be.instanceof(Object);
            scanResult.datasets.should.be.instanceof(Array);
            scanResult.datasets.should.have.length(7);
            _.chain(scanResult.datasets)
              .pluck('files')
              .map(_.first)
              .pluck('href')
              .zip(_.map(_.range(7, 0, -1), function(v) { return v+".txt" }))
              .each(function(v) { 
                  v[0].should.eql(v[1]);
              });
            
          },
        "a next() function should not be provided": function(err, scanResult) {
          scanResult.should.not.have.property('next');
        },
        "a prev() function should be provided": function(err, scanResult) {
          scanResult.should.have.property('prev');
          scanResult.prev.should.be.a('function');
          scanResult.prev().should.have.property('after');
          // No limit should be present for scans without one
          scanResult.prev().should.not.have.property('limit');
        }
      }
    }
}).export(module);
