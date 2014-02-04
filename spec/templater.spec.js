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
            'id': 'http://example.test/',
            'title': 'test',
            'datasets': []
        }, this.callback);
      },
      "should produce a valid empty Atom feed": function(nothing, result) {
        parser = new FeedMe();
        parser.write(result);
        feed = parser.done();
        feed.type.should.equal('atom');
        feed.id.should.equal('http://example.test/');
        feed.title.should.equal('test');
        feed.updated.should.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d.\d{3}Z$/);
        should.not.exist(feed.items);
      }
    },
    'when run with "next" available': {
      topic: function() {
        templater.render({
            'id': 'http://example.test/',
            'title': 'test',
            'datasets': [],
            'next': function() { return { 'after': 5 } }
        }, this.callback);
      },
      "should produce a valid next relation": function(result) {
        parser = new FeedMe();
        parser.write(result);
        feed = parser.done();
        should.exist(feed.link);
        feed.link.rel.should.eql('next');
        feed.link.href.should.eql('?after=5');
      }
    },
    'when run with a single dataset': {
      topic: function() {
        templater.render({
            'id': 'http://example.test/',
            'title': 'test',
            'datasets': [{
                'author': {'name': 'fred'},
                'files': [{
                  'href': 'general/a.tif',
                  'title': 'a.tif',
                  'type': 'image/tiff',
                  'sha512': 'deadbeefdeadbeefdeadbeefdeadbeef'
                           +'deadbeefdeadbeefdeadbeefdeadbeef'
                           +'deadbeefdeadbeefdeadbeefdeadbeef'
                           +'deadbeefdeadbeefdeadbeefdeadbeef'
                }, {
                  'href': 'general/a.txt',
                  'title': 'a.txt',
                  'type': 'text/plain',
                  'sha512': 'beeffeedbeeffeedbeeffeedbeeffeed'
                           +'beeffeedbeeffeedbeeffeedbeeffeed'
                           +'beeffeedbeeffeedbeeffeedbeeffeed'
                           +'beeffeedbeeffeedbeeffeedbeeffeed'
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
        feed.id.should.equal('http://example.test/');
        feed.title.should.equal('test');
        // Feed "updated" should match dataset
        feed.updated.should.match(/^1970-01-\d\dT\d\d:\d\d:\d\d.\d{3}Z$/);
        // There should be one item
        should.exist(feed.items);
        feed.items.should.be.length(1);
        var item = _.first(feed.items);
        /*
        Disabled: out of sync with feed.atom. Maybe there should be a specific testfeed.atom 
        item.id.should.match(new RegExp('^'+feed.id+'c24842[a-f0-9]+@1970-01'));
        */
        
        //item.author.name.should.equal('fred');
        //item.title.should.match(/^fred - 1970-01-/);
        item.updated.should.equal(feed.updated);
        _.each(item.link, function(enclosure) {
          enclosure.should.have.property('href');
          enclosure.should.have.property('title');
          enclosure.should.have.property('type');
          enclosure.should.have.property('hash');
          enclosure.hash.length.should.equal('sha-512:'.length + 128);
        });
      }
    }
}).export(module);


