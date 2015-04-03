'use strict';
let relativeToServer = './../../../server/';
//let expect = require('chai').expect;
let utils = require(relativeToServer + '/common/utils');
let Config = require(relativeToServer + '../config');
let Code = require('code');   // assertion library
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let expect = Code.expect;
describe('Utils', function () {
    it('should log when errback called with', function (done) {
        let prev = Config.logger;
        Config.logger = {
            error: function (args) {
                expect(args.error).to.be.an.instanceof(Error);
            }
        };
        utils.errback(new Error('testing'));
        Config.logger = prev;
        done();
    });
    it('should do nothing when no error passed', function (done) {
        let prev = Config.logger;
        Config.logger = {
            error: function () {
                expect(true).to.be.false();
            }
        };
        utils.errback(undefined);
        Config.logger = prev;
        done();
    });
    it('should return the proper ip address from the request', function (done) {
        expect(utils.ip({info: {remoteAddress: '127.0.0.1'}})).to.equal('127.0.0.1');
        done();
    });
    it('should lookup params first, then payload, then query', function (done) {
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
});

