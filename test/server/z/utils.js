'use strict';
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let Model = require('./../../../build/server/common/dao');
let utils = require('./../../../build/server/common/utils');
let expect = require('chai').expect;
describe('DAO', () => {
    it('should disconnect when the server stops', (done) => {
        tu.setupServer()
            .then((res) => {
                let server = res.server;
                server.start(() => {
                    expect(Model.connect('app', {})).to.exist;
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
