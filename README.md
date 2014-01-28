## See [stevage](https://github.com/stevage/atom-dataset-provider)'s fork for continued development!

> I'm no longer maintaining this code, or am an active member of the MyTardis community. Take a look at Steve's continued development work. I hear good things about it. -- Tim


Atom Dataset Producer
=====================

[![Build Status](https://secure.travis-ci.org/tjdett/atom-dataset-provider.png)](http://travis-ci.org/tjdett/atom-dataset-provider) [![Abandoned](http://stillmaintained.com/tjdett/atom-dataset-provider.png)](http://stillmaintained.com/tjdett/atom-dataset-provider)


About
-----

This app provides a tiny web-server for exposing a directory via an Atom feed.
It is intended to act as a demonstration producer for the [MyTardis Atom app][atom-app].

*Note: This app has previously been described as a reference implementation, which caused confusion. It is not. While the output produced is still correct, the method it uses to generate that output is not suitable for use in a production environment. It may have been previously, however the addition of hash digests for files (which MyTardis now requires) makes the "store nothing" architecture impractical for datasets larger than a few megabytes.*

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

Run `bin/atom-dataset-provider --help` for a full list of options.

[atom-app]: https://github.com/tjdett/mytardis-app-atom
[nodejs]: http://nodejs.org/
[npm]: http://npmjs.org/
