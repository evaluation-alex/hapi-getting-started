'use strict';
let relativeToServer = './../../../server/';
let utils = require(relativeToServer + '/common/utils');
let Config = require(relativeToServer + '../config');
let Code = require('code');
//let Lab = require('lab');
//let lab = exports.lab = Lab.script();
//let describe = lab.describe;
//let it = lab.it;
let expect = Code.expect;
describe('Utils', () => {
    it('should log when errback called with', (done) => {
        let prev = Config.logger;
        Config.logger = {
            error: (args) => {
                expect(args.error).to.be.an.instanceof(Error);
            }
        };
        utils.errback(new Error('testing'));
        Config.logger = prev;
        done();
    });
    it('should do nothing when no error passed', (done) => {
        let prev = Config.logger;
        Config.logger = {
            error: () => {
                expect(true).to.be.false();
            }
        };
        utils.errback(undefined);
        Config.logger = prev;
        done();
    });
    it('should return the proper ip address from the request', (done) => {
        expect(utils.ip({info: {remoteAddress: '127.0.0.1'}})).to.equal('127.0.0.1');
        done();
    });
    it('should lookup params first, then payload, then query', (done) => {
        expect(utils.lookupParamsOrPayloadOrQuery({}, 'f')).to.be.undefined();
        expect(utils.lookupParamsOrPayloadOrQuery({
            params: {
                f: 'inparams'
            }
        }, 'f')).to.equal('inparams');
        expect(utils.lookupParamsOrPayloadOrQuery({
            params: {
                g: 'inparams'
            }
        }, 'f')).to.be.undefined();
        expect(utils.lookupParamsOrPayloadOrQuery({
            payload: {
                f: 'inpayload'
            }
        }, 'f')).to.equal('inpayload');
        expect(utils.lookupParamsOrPayloadOrQuery({
            payload: {
                g: 'inpayload'
            }
        }, 'f')).to.be.undefined();
        expect(utils.lookupParamsOrPayloadOrQuery({
            query: {
                f: 'inquery'
            }
        }, 'f')).to.equal('inquery');
        expect(utils.lookupParamsOrPayloadOrQuery({
            query: {
                g: 'inquery'
            }
        }, 'f')).to.be.undefined();
        done();
    });
    it('should give undefined / blank when unauthorized', (done) => {
        expect(utils.org({auth: {}})).to.equal('');
        expect(utils.user({auth: {}})).to.be.undefined();
        done();
    });
    it('should give the query built with in when passed an array', (done) => {
        let fields = [['a', 'a'], ['b', 'b']];
        let request = {
            payload: {
                a: 'a1',
                b: ['b1', 'b2']
            }
        };
        let query = utils.buildQueryForPartialMatch({}, request, fields);
        expect(query.a.$regex).to.exist();
        expect(query.b.$in).to.exist();
        expect(query.b.$in.length).to.equal(2);
        expect(query.b.$in[0]).to.be.an.instanceof(RegExp);
        expect(query.b.$in[1]).to.be.an.instanceof(RegExp);
        done();
    });
});

