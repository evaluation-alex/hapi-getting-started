'use strict';
/*eslint-disable no-unused-expressions*/
/*eslint-disable no-var*/
/*jshint -W079*/
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let Model = require('./../../../build/common/dao');
let utils = require('./../../../build/common/utils');
let expect = require('chai').expect;
describe('DAO', () => {
    it('should disconnect when the server stops', (done) => {
        tu.setupServer()
            .then((res) => {
                let server = res.server;
                server.start(() => {
                    expect(Model.connect('app')).to.exist;
                    utils.dumpTimings();
                    server.stop({timeout: 100}, () => {
                        var ct = setTimeout(() => {
                            expect(Model.db('app')).to.be.undefined;
                            clearTimeout(ct);
                            done();
                        }, 1000);
                    });
                });
            });
    });
});
/*eslint-enable no-var*/
