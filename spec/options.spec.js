/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var vows = require('vows'),
    should = require('should');

var Options = require('../lib/atom-dataset-provider/options');
    
vows.describe('CLI Parser').addBatch({
    'when a directory is not provided': {
      topic: function() {
        return (new Options).parse("node myapp.js".split(" "));
      },
      "should default directory to '.'": function(parser) {
        parser.should.have.property('directory', '.');
      }
    },
    'when a directory is provided': {
      topic: function() {
        return (new Options)
                .parse("node myapp.js --directory myDir".split(" "));
      },
      '"directory" property should be that string': function(parser) {
        parser.should.have.property('directory', 'myDir');
      }
    },
    'when a port is provided to serve on': {
      topic: function() {
        return (new Options)
                .parse("node myapp.js --port 4000".split(" "));
      },
      '"port" property should be that integer': function(parser) {
        parser.should.have.property('port', 4000);
      },
    }
}).export(module);
