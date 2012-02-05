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
    'the Directory Scanner': {
      'when run on an empty directory': {
        topic: function() {
          testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
          scanner.scan(testDir, this.callback);
        },
        "should provide an empty list of datasets": function(err, scanResult) {
          scanResult.should.be.instanceof(Array);
          scanResult.should.have.length(0);
        }
      },
      'when run on a directory with files "a", "b" & "c"': {
        topic: function() {
          testDir = temp.mkdirSync('atom-dataset-provider-test-data-');
          topicCallback = this.callback;
          async.forEachSeries([['a',3],['b',2],['c',1]], function(v, callback) {
              // Create absolute path for test file
              var testFile = path.join(testDir, _.first(v));
              // Write file
              fs.writeFile(testFile, 'test', function() {
                  // Create new modified time (using second argument as a time
                  // offset) so we get ['a','b','c'] when sorted by time.
                  var newTime = new Date((new Date).getTime()-_.last(v)*1000);
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
          "have a list of files": function(err, dataset) {
            dataset.should.have.ownProperty('files');
            dataset.files.should.be.instanceof(Array);
            dataset.files.should.have.length(1);
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
            .compact()
            .map(function(v) { return path.basename(v).trim(); })
            .value();
          // Check file array against given
          _.each(_.zip(files, ['c','b','a']), function(v) {
             _.first(v).should.equal(_.last(v)); 
          });
        }
      }
    }
}).export(module);
