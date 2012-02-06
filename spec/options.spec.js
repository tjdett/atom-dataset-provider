/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var vows = require('vows');
var should = require('should');

vows.describe('CLI Parser').addBatch({
    'the CLI parser': {
      topic: require('../lib/atom-dataset-provider/options'),
      "defaults directory to '.'": function(parser) {
        parser.parse("node myapp.js".split(" "));
        should.exist(parser.directory);
        parser.directory.should.equal('.');
      },
      "takes directory to monitor": function(parser) {
        parser.parse("node myapp.js --directory myDir".split(" "));
        should.exist(parser.directory);
        parser.directory.should.equal('myDir');
      },
    }
}).export(module);
