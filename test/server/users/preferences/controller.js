'use strict';
var relativeToServer = './../../../../server/';

var Users = require(relativeToServer + 'users/model');
var Preferences = require(relativeToServer + 'users/notifications/model');
var Audit = require(relativeToServer + 'audit/model');
var Promise = require('bluebird');
//var expect = require('chai').expect;
var tu = require('./../../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Preferences', function () {
    var rootAuthHeader = null;
    var server = null;
    beforeEach(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    afterEach(function (done) {
        done();
    });
});

