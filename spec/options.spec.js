/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var vows = require('vows');
var should = require('should');

var providerOptions = require('../lib/atom-dataset-provider/options');

vows.describe('Atom Provider').addBatch({
    'the CLI parser': {
      topic: providerOptions,
      "takes directory to monitor": function(parser) {
        parser.parse("node myapp.js --directory myDir".split(" "));
        should.exist(parser.directory);
        parser.directory.should.equal('myDir');
      },
    }
}).export(module);
