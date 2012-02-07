/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var vows = require('vows');
var should = require('should');

vows.describe('CLI Parser').addBatch({
    'the CLI parser': {
      topic: require('../lib/atom-dataset-provider/options'),
      "defaults directory to '.'": function(parser) {
        parser.parse("node myapp.js".split(" "));
        parser.should.have.property('directory', '.');
      },
      "takes directory to monitor": function(parser) {
        parser.parse("node myapp.js --directory myDir".split(" "));
        parser.should.have.property('directory', 'myDir');
      },
      "takes port to serve on": function(parser) {
        parser.parse("node myapp.js --port 4000".split(" "));
        parser.should.have.property('port', 4000);
      },
    }
}).export(module);
