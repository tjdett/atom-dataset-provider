/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var _ = require('underscore'),
    async = require('async'),
    FeedMe = require('feedme'),
    fs = require('fs'),
    should = require('should'),
    vows = require('vows');

vows.describe('Templater').addBatch({
    'the Templater,': {
      topic: require('../lib/atom-dataset-provider/templater.js'),
      'when run with an empty list of datasets': {
        topic: function(templater) {
          templater.render({
              'id': 'test',
              'title': 'test',
              'datasets': []
          }, this.callback);
        },
        "should produce a valid empty Atom feed": function(result) {
          parser = new FeedMe();
          parser.write(result);
          feed = parser.done();
          console.dir(feed);
          feed.type.should.equal('atom');
          feed.id.should.equal('test');
          feed.title.should.equal('test');
          should.not.exist(feed.items);
        }
      }
    }
}).export(module);


