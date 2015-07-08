'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../server/';
let tu = require('./../testutils');
let Model = require(relativeToServer + 'common/model');
let expect = require('chai').expect;
describe('Model', () => {
    it('should disconnect when the server stops', (done) => {
        tu.setupServer()
            .then((res) => {
                let server = res.server;
                server.start(() => server.stop(() => {
                    let ct = setTimeout(() => {
                        expect(Model.connections.app).to.be.undefined;
                        clearTimeout(ct);
                        done();
                    }, 1000);
                }));
            });
    });
});

