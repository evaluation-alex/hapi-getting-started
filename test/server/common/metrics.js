'use strict';
let Hapi = require('hapi');
let MetricsPlugin = require('./../../../build/server/plugins/metrics');
describe('Metrics', () => {
    let server = null;
    before((done) => {
        server = new Hapi.Server();
        server.connection({
            host: 'localhost',
            port: 8085,
            routes: {cors: true}
        });
        let get = (request, reply) => {
            reply('Success!');
        };
        let err = (request, reply) => {
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
    it('should report stats with no path in stat name', (done) => {
        server.inject('/', () => {
            done();
        });
    });
    it('should report stats with path in stat name', (done) => {
        server.inject('/test/123', () => {
            done();
        });
    });
    it('should report stats with generic not found path', (done) => {
        server.inject('/fnord', () => {
            done();
        });
    });
    it('should report stats with generic CORS path', (done) => {
        server.inject({
            method: 'OPTIONS',
            headers: {
                Origin: 'http://test.domain.com'
            },
            url: '/'
        }, () => {
            done();
        });
    });
    it('should not change the status code of a response', (done) => {
        server.inject('/err', () => {
            done();
        });
    });
});
