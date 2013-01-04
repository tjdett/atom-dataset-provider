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
    // has beneficial side-effect to normalising directory names
    options.directory = fs.realpathSync(options.directory) + '/';
    app.use(express.static(options.directory));
});

app.get('/', function(req, res) {
    var scanOptions = _.clone(req.query);
    // Default to only showing datafiles updated at least two minutes ago to avoid race conditions:
    // a file could be in the process of copying, getting progressively larger and causing nasty
    // data integrity issues. (Note: this prevents the whole _dataset_ showing up, which could be problematic.)
    var twominutesago = (d = new Date()).getTime() + d.getTimezoneOffset() * 60000 - 2 * 60 * 1000;
    
    _.defaults(scanOptions, { groupPattern: options.groupPattern, excludePattern: options.excludePattern,
        entryTitlePattern: options.entryTitlePattern, limit: 10, hashes: options.hashes, before: twominutesago });
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