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
          async.forEachSeries(['a','b','c'], function(v, callback) {
              fs.writeFile(path.join(testDir, v), 'test', function() {
                  setTimeout(callback, 1000);
              });
            }, function(err) {
              scanner.scan(testDir, topicCallback);
            });
        },
        "should provide a list of three datasets": function(err, scanResult) {
          scanResult.should.be.instanceof(Array);
          scanResult.should.have.length(3);
        },
        "a dataset should have": {
          topic: function(scanResult) {
            return scanResult[0];
          },
          "a list of files": function(err, dataset) {
            dataset.should.have.ownProperty('files');
            dataset.files.should.be.instanceof(Array);
            dataset.files.should.have.length(1);
          },
          "an updated time": function(err, dataset) {
            dataset.should.have.ownProperty('updated');
            dataset.updated.should.be.instanceof(Date);
          }
        }
      }
    }
}).export(module);
