/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/
var _ = require('underscore'),
    async = require('async'),
    FeedMe = require('feedme'),
    fs = require('fs'),
    should = require('should'),
    vows = require('vows');

var templater = require('../lib/atom-dataset-provider/templater.js');
    
vows.describe('Templater').addBatch({
    'when run with an empty list of datasets': {
      topic: function() {
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
        feed.type.should.equal('atom');
        feed.id.should.equal('test');
        feed.title.should.equal('test');
        feed.updated.should.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d.\d{3}Z$/);
        should.not.exist(feed.items);
      }
    },
    'when run with a single dataset': {
      topic: function() {
        templater.render({
            'id': 'test',
            'title': 'test',
            'datasets': [{
                'author': {'name': 'fred'},
                'files': [{
                  'href': 'general/a.tif',
                  'title': 'a.tif',
                  'type': 'image/tiff'
                }, {
                  'href': 'general/a.txt',
                  'title': 'a.txt',
                  'type': 'text/plain'
                }],
                'updated': new Date(1970, 00, 03)
            }]
        }, this.callback);
      },
      "should produce a valid single-entry Atom feed": function(result) {
        parser = new FeedMe();
        parser.on('error', function(err) {
            console.dir(result);
            should.fail(err);
        });
        parser.write(result);
        feed = parser.done();
        // Check feed details
        feed.type.should.equal('atom');
        feed.id.should.equal('test');
        feed.title.should.equal('test');
        // Feed "updated" should match dataset
        feed.updated.should.match(/^1970-01-\d\dT\d\d:\d\d:\d\d.\d{3}Z$/);
        // There should be one item
        should.exist(feed.items);
        feed.items.should.be.length(1);
        var item = _.first(feed.items);
        item.id.should.match(/^general\/a@1970-01/);
        item.author.name.should.equal('fred');
        item.title.should.match(/^fred - 1970-01-/);
        item.updated.should.equal(feed.updated);
        _.each(item.link, function(enclosure) {
          enclosure.should.have.property('href');
          enclosure.should.have.property('title');
          enclosure.should.have.property('type');
        });
      }
    }
}).export(module);


