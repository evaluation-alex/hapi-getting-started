'use strict';
var relativeToServer = './../../../server/';
//var expect = require('chai').expect;
var utils = require(relativeToServer + '/common/utils');
var Config = require(relativeToServer + '../config');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;
describe('Utils', function () {
    it('should log when errback called with', function (done) {
        var prev = Config.logger;
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
        var prev = Config.logger;
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

