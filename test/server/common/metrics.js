'use strict';
var relativeToServer = './../../../server/';

var Hapi = require('hapi');
var MetricsPlugin = require(relativeToServer + 'common/plugins/metrics');

//var expect = require('chai').expect;
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var beforeEach = lab.beforeEach;

describe('Metrics', function () {
    var server = null;
    beforeEach(function (done) {
        server = new Hapi.Server();
        server.connection({
            host: 'localhost',
            port: 8085,
            routes: {cors: true}
        });
        var get = function (request, reply) {
            reply('Success!');
        };
        var err = function (request, reply) {
            reply(new Error());
        };
        server.route({method: 'GET', path: '/', handler: get});
        server.route({method: 'GET', path: '/err', handler: err});
        server.route({method: 'GET', path: '/test/{param}', handler: get});
        server.register({
            register: MetricsPlugin,
            options: {}
        }, done);
    });
    it('should report stats with no path in stat name', function (done) {
        server.inject('/', function () {
            done();
        });
    });
    it('should report stats with path in stat name', function (done) {
        server.inject('/test/123', function () {
            done();
        });
    });
    it('should report stats with generic not found path', function (done) {
        server.inject('/fnord', function () {
            done();
        });
    });
    it('should report stats with generic CORS path', function (done) {
        server.inject({
            method: 'OPTIONS',
            headers: {
                Origin: 'http://test.domain.com'
            },
            url: '/'
        }, function () {
            done();
        });
    });
    it('should not change the status code of a response', function (done) {
        server.inject('/err', function () {
            done();
        });
    });
});
