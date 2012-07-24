/*:tabSize=2:indentSize=2:noTabs=true:mode=javascript:*/

var _ = require('underscore'),
    express = require('express'),
    Options = require('./atom-dataset-provider/options'),
    scanner = require('./atom-dataset-provider/directory-scanner'),
    templater = require('./atom-dataset-provider/templater');
    fs = require('fs');
    
var options = (new Options).parse(process.argv);

var app = express.createServer();

app.configure(function() {
    app.use(express.logger());
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(app.router);
    app.use(express.favicon());
    // Resolve '.' to actual path, or Express explodes with "Forbidden at SendStream.error"
    app.use(express.static(fs.realpathSync(options.directory)));
});

app.get('/', function(req, res) {
    var scanOptions = _.clone(req.query);
    _.defaults(scanOptions, { groupPattern: options.groupPattern, excludePattern: options.excludePattern,
        entryTitlePattern: options.entryTitlePattern, limit: 10 });
    res.header('Content-Type', 'application/xml');
    scanner.scan(options.directory, scanOptions, function(err, scanResult) {
        var feedData = _.defaults(scanResult, {
          id: 'http://'+require('os').hostname()+':'+options.port+'/',
          title: options.title
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

app.listen(options.port);

console.log(_.template(
  '*** Atom Provider'+
  ' now serving "<%=directory%>"'+
  ' on port <%=port%>'+
  ' (grouping by <%=groupPattern%>) ***',
  options
));