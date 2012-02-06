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
    'the Directory Scanner,': {
      'when run on an empty directory': {
        topic: function() {
          var testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
          scanner.scan(testDir, this.callback);
        },
        "should provide an empty list of datasets": function(err, scanResult) {
          scanResult.should.be.instanceof(Array);
          scanResult.should.have.length(0);
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
              scanner.scan(testDir, topicCallback);
            });
        },
        "should provide a list of three datasets": function(err, scanResult) {
          scanResult.should.be.instanceof(Array);
          scanResult.should.have.length(3);
        },
        "should in a dataset": {
          topic: function(scanResult) {
            return scanResult[0];
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
          scanResult.should.be.instanceof(Array);
          files = _.chain(scanResult)
            .pluck('files')
            .flatten()
            .pluck('href')
            .value();
          // Check file array against given
          _.each(_.zip(files, ['c .txt','b.txt','a.txt']), function(v) {
             _.first(v).should.equal(_.last(v));
          });
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
              scanner.scan(testDir, topicCallback);
            });
        },
        "there should be one dataset": function(err, scanResult) {
          scanResult.should.be.instanceof(Array);
          scanResult.should.have.length(1);
        },
        "the single dataset should have two files": function(err, scanResult) {
          _.first(scanResult).files.should.be.instanceof(Array);
          _.first(scanResult).files.should.have.length(2);
        }
      }
    }
}).export(module);
