Atom Dataset Producer
=====================

[![Build Status](https://secure.travis-ci.org/tjdett/atom-dataset-provider.png)](http://travis-ci.org/tjdett/atom-dataset-provider)

About
-----

This app provides a tiny web-server for exposing a directory via an Atom feed.
It is intended to act as a producer for the [MyTardis Atom app][atom-app].

Platform Support
----------------

This app is targeted at [Node.js][nodejs] 0.6.x on Linux and Windows.

Due to a lack of uid support in Windows (and the relatively immature APIs
currently available) performance will be MUCH better on Linux.


Installing
----------

Once you've checked out the latest version of this app from Github, you can 
install the dependencies with [NPM][npm] (which is bundled with Node.js) 
and run the tests:

    npm install
    npm test

Usage
-----

To serve up the directory `~/mydir` on port 8001:

    bin/atom-dataset-provider -d ~/mydir -p 8001

Run `bin/atom-dataset-provider --help` for a full list of options:

    Usage: atom-dataset-provider [options]

    Options:

      -h, --help                       output usage information
      -V, --version                    output the version number
      -d, --directory <dir>            <dir> to monitor
      -p, --port <port>                <port> to serve on
      --title <title>                  <title> for feed
      --group-pattern <pattern>        <pattern> with capture to group by. eg. /^(.*)\.\w+$/
      --exclude-pattern <pattern>      exclude any file containing <pattern>. eg /Thumbs.db|/archived/$/
      --entry-title-pattern <pattern>  <pattern> with capture to set title of entry. eg. /^.*/([^/]+)$/
      --no-hashes                      do not generate SHA hashes for file contents


Customising the feed template
-----------------------------

In `lib/atom-dataset-provider/templates` there is a feed.atom file which you should modify to suit your local environment. It uses
the Mustache templating engine. See http://mustache.github.com/mustache.5.html for syntax.

For example, if you are serving up files in this sort of directory structure:

    /data/username/experimentname/datasetname/file.txt

You can do things like this:

    <author>{{relpath2}}</author>
    <title>{{relpath3}}</title>

These substitutions are supported:

### Top level
Use these directly inside a `<feed>` element
* `{{id}}`: URL of the feed itself
* `{{title}}`: Title as set by `--title` command line parameter (defaults to hostname)
* `{{updatedAsTimestamp}}`: Age of newest dataset (and hence, newest file), formatted as ISO date.
* `{{#next}}`: Relative link to *next* page of feed, or nothing.
* `{{#prev}}`: Relative link to *previous* page of feed, or nothing.
* `{{#datasets}}`: Array of datasets.

### Inside the `{{#datasets}}` array
Use these inside an `<entry>` element

* `{{path}}`, `{{path1}}`, `{{relpath}}`, ...: Path properties of the first item in the `{{#files}}` array
* `{{entrytitle}}`: title computed from `--entry-title--pattern` if given, or first filename 
* `{{author.name}}`: Filesystem username of owner of first file
* `{{author.uid}}`: Filesystem userid of owner of first file
* `{{id}}`: Unique ID computed from feed URL, SHA hash (of what?) and updated timestamp. 
* `{{updated}}`: updated time of most recently updated file, in system time format, eg "Wed Aug 08 2012 05:43:18 GMT+0000 (UTC)"
* `{{updatedAsTimestamp}}`: Most recently updated file date, formatted as ISO, eg "2012-08-08T05:43:18.000Z"
* `{{#files}}`: Array of files.

### Inside the `{{#files}}` array

* `{{path}}`: Absolute path, eg "/var/data/dataset1"
* `{{path1}}`, `{{path2}}`... Individual elements, eg, "var", "data", "dataset1"
* `{{relpath}}`: Filename relative to `--directory` option. eg "dataset1"
* `{{relpath1}}`, `{{relpath2}}`... Individual elements of relative path, eg "dataset1"
* `{{path1.lower()}}`, `{{relpath1.lower()}}`: Individual elements, lowercased. 
* `{{href}}`: Relative path, including filename, eg "/var/data/dataset1/file.txt"
* `{{sha512}}`: Computed SHA512 hash. (Can be disabled with --no-hashes).
* `{{type}}`: MIME type of file, eg "text/plain"
* `{{title}}`: File name without path, eg "file.txt"
* `{{length}}`: Size in bytes of file, eg "50"
* `{{updated}}`: Updated date of file, in epoch milliseconds, eg "1343195678000"
* `{{created}}`: Same for creation date (file system dependent)
* `{{updatedAsTimestamp}}`: Updated date of file, formatted as ISO 8601, eg "2012-08-07T15:57:52.000Z""


[atom-app]: https://github.com/tjdett/mytardis-app-atom
[nodejs]: http://nodejs.org/
[npm]: http://npmjs.org/
