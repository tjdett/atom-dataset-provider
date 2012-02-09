/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    express = require('express'), 
    Options = require('./atom-dataset-provider/options'),
    scanner = require('./atom-dataset-provider/directory-scanner'),
    templater = require('./atom-dataset-provider/templater');
    
var options = (new Options).parse(process.argv);

var app = express.createServer();

app.configure(function() {
    app.use(express.logger());
    app.use(express.static(options.directory));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(app.router);
});

app.get('/', function(req, res) {
    _.defaults(req.query, { limit: 10 });
    res.header('Content-Type', 'application/xml');
    scanner.scan(options.directory, req.query, function(err, scanResult) {
        var feedData = _.defaults(scanResult, {
          id: 'test',
          title: 'test'
        });
        templater.render(feedData, function(err, data) {
            res.send(data);
        });
    });
});

app.get('/atom2html.xsl', function(req, res) {
    res.header('Content-Type', 'application/xml');
    res.sendfile(__dirname+'/atom-dataset-provider/atom2html.xsl');
});

app.listen(options.port || 4000);