'use strict';
/*eslint-disable no-unused-expressions*/
/*eslint-disable no-var*/
/*jshint -W079*/
let tu = require('./../../../../testutils');
let Model = require('./../../../../../../server/common/dao');
let expect = require('chai').expect;
describe('DAO', () => {
    it('should disconnect when the server stops', (done) => {
        tu.setupServer()
            .then((res) => {
                let server = res.server;
                server.start(() => server.stop(() => {
                    var ct = setTimeout(() => {
                        expect(Model.db('app')).to.be.undefined;
                        clearTimeout(ct);
                        done();
                    }, 1000);
                }));
            });
    });
});
/*eslint-enable no-var*/
