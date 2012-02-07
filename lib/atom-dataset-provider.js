/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var express = require('express'), 
    options = require('./atom-dataset-provider/options').parse(process.argv),
    scanner = require('./atom-dataset-provider/directory-scanner'),
    templater = require('./atom-dataset-provider/templater');

var app = express.createServer();

app.configure(function() {
    app.use(express.static(options.directory));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(app.router);
});

app.get('/', function(req, res){
    res.header('Content-Type', 'application/xml');
    scanner.scan(options.directory, function(err, datasets) {
        var feedData = {
          id: 'test',
          title: 'test',
          datasets: datasets
        };
        templater.render(feedData, function(err, data) {
            res.send(data);
        });
    });
});

app.listen(options.port || 4000);