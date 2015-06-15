# Hapi-getting-started

A user system API for Node.js. Bring your own front-end.

[![Dependency Status](https://david-dm.org/k-sheth/hapi-getting-started.svg?style=flat)](https://david-dm.org/k-sheth/hapi-getting-started)
[![devDependency Status](https://david-dm.org/k-sheth/hapi-getting-started/dev-status.svg?style=flat)](https://david-dm.org/k-sheth/hapi-getting-started#info=devDependencies)
[![Travis Build Status](https://img.shields.io/travis/k-sheth/hapi-getting-started/master.svg?style=flat)](https://travis-ci.org/k-sheth/hapi-getting-started)
[![Coverage Status](https://coveralls.io/repos/k-sheth/hapi-getting-started/badge.svg)](https://coveralls.io/r/k-sheth/hapi-getting-started)
[![Code Climate](https://codeclimate.com/github/k-sheth/hapi-getting-started/badges/gpa.svg)](https://codeclimate.com/github/k-sheth/hapi-getting-started)
[![Test Coverage](https://codeclimate.com/github/k-sheth/hapi-getting-started/badges/coverage.svg)](https://codeclimate.com/github/k-sheth/hapi-getting-started)
 [![Issues](http://img.shields.io/github/issues/k-sheth/hapi-getting-started.svg?style=flat)](https://github.com/k-sheth/hapi-getting-started/issues)

Inspired by [frame](https://github.com/jedireza/frame)

## Technology

__Primary goal:__ get a project with up to date dependencies and obvious things out of the box.

hapi-getting-started is built with the [hapi.js framework](https://github.com/hapijs/hapi) and
[toolset](https://github.com/hapijs). We're using
[MongoDB](https://github.com/mongodb/node-mongodb-native/) as a data store. We
also use [Nodemailer](https://github.com/andris9/Nodemailer) for email
transport.

## Requirements

You need [Node.js](http://nodejs.org/download/) and
[MongoDB](http://www.mongodb.org/downloads) installed and running.

We use [`bcrypt`](https://github.com/ncb000gt/node.bcrypt.js) for hashing
secrets. bcrypt module needs python / c++ compilers to work. see [Bcrypt installation](https://github.com/jedireza/frame/wiki/bcrypt-Installation-Trouble) for details.

## Installation

```bash
$ git clone git@github.com:k-sheth/hapi-getting-started.git && cd ./hapi-getting-started
$ npm install
```


## Setup

```bash
$ npm run setup

# > hapi-getting-started@0.0.0 setup /Users/k-sheth/projects/hapi-getting-started
# > ./setup.js

# Project name: (hapi-getting-started)
# MongoDB URL: (mongodb://localhost:27017/hapi-getting-started)
# Root user email: k.sheth@gmail.com
# Root user password:
# System email: (k.sheth@gmail.com)
# SMTP host: (smtp.gmail.com)
# SMTP port: (465)
# SMTP username: (k.sheth@gmail.com)
# SMTP password:
# Setup complete.
```


## Running the app

```bash
$ npm start

# > hapi-getting-started@0.0.0 start /Users/k.sheth/projects/hapi-getting-started
# > node --harmony ./index.js
```

## Philosophy

 - Create a user system API
 - Don't include a front-end
 - Write code in a simple and consistent way
 - It's just JavaScript
 - close to 100% test coverage


## Features

 - Login system with forgot password and reset password
 - Abusive login attempt detection
 - User roles and permissions
 - User groups with ownership, access control
 - Simple blogging platform with separate ownership, contributors and subscribers
 - Simple notifications

## Questions and contributing

Any issues or questions (no matter how basic), open an issue. Please take the
initiative to include basic debugging information like operating system
and relevant version details such as:

```bash
$ npm version

# { http_parser: '1.0',
#   node: '0.10.29',
#   v8: '3.14.5.9',
#   ares: '1.9.0-DEV',
#   uv: '0.10.27',
#   zlib: '1.2.3',
#   modules: '11',
#   openssl: '1.0.1h',
#   npm: '1.4.20',
#   hapi-getting-started: '0.0.0' }
```

Contributions welcome. Your code should:

 - include 100% test coverage

If you're changing something non-trivial, you may want to submit an issue first.


## Running tests

All our tests are written in mocha and we use istanbul-harmony to get coverage.

For command line output:

```bash
$ npm test

# > hapi-getting-started@0.0.0 test /Users/k-sheth/projects/hapi-getting-started
# > "node --harmony ./node_modules/istanbul-harmony/lib/cli.js cover --config ./test/istanbul.yml ./node_modules/mocha/bin/_mocha -- ./test/server

# ..................................................
# ..................................................
# ..................................................
# ..................................................
# ..................................................
# .............................

# 249 tests complete
# Test duration: 4628 ms
# No global variable leaks detected
# Coverage: 100.00%
```

This will run the tests and open a web browser to the visual code coverage
artifacts. The generated source can be found in `/tests/artifacts/coverage.html`.

## License

MIT

