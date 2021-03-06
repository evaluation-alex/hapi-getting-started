'use strict';
let utils = require('./../../../build/server/common/utils');
let Config = require('./../../../build/server/config');
let expect = require('chai').expect;
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
                expect(true).to.be.false;
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
        expect(utils.lookupParamsOrPayloadOrQuery({}, 'f')).to.be.undefined;
        expect(utils.lookupParamsOrPayloadOrQuery({
            params: {
                f: 'inparams'
            }
        }, 'f')).to.equal('inparams');
        expect(utils.lookupParamsOrPayloadOrQuery({
            params: {
                g: 'inparams'
            }
        }, 'f')).to.be.undefined;
        expect(utils.lookupParamsOrPayloadOrQuery({
            payload: {
                f: 'inpayload'
            }
        }, 'f')).to.equal('inpayload');
        expect(utils.lookupParamsOrPayloadOrQuery({
            payload: {
                g: 'inpayload'
            }
        }, 'f')).to.be.undefined;
        expect(utils.lookupParamsOrPayloadOrQuery({
            query: {
                f: 'inquery'
            }
        }, 'f')).to.equal('inquery');
        expect(utils.lookupParamsOrPayloadOrQuery({
            query: {
                g: 'inquery'
            }
        }, 'f')).to.be.undefined;
        done();
    });
    it('should give undefined / blank when unauthorized', (done) => {
        expect(utils.org({auth: {}})).to.equal('');
        expect(utils.user({auth: {}})).to.be.undefined;
        done();
    });
    it('should give the query built with in when passed an array', (done) => {
        let fields = [['a', 'a'], ['b', 'b']];
        let request = {
            payload: {
                a: 'a1',
                b: ['b1', 'b2'],
                id: ['54c894fe1d1d4ab4032ed94e', '54c894fe1d1d4ab4032ed94e'],
                $or: {
                    a: 'a2',
                    b: ['b3', 'b4'],
                    id: ['54c894fe1d1d4ab4032ed94e', '54c894fe1d1d4ab4032ed94e']
                }
            }
        };
        let query = utils.buildQuery(request, {forPartial: fields});
        expect(query.a.$regex).to.exist;
        expect(query.b.$in).to.exist;
        expect(query.b.$in.length).to.equal(2);
        expect(query.b.$in[0]).to.be.an.instanceof(RegExp);
        expect(query.b.$in[1]).to.be.an.instanceof(RegExp);
        expect(query.$or[0].a.$regex).to.exist;
        expect(query.$or[1].b.$in).to.exist;
        expect(query.$or[1].b.$in.length).to.equal(2);
        expect(query.$or[1].b.$in[0]).to.be.an.instanceof(RegExp);
        expect(query.$or[1].b.$in[1]).to.be.an.instanceof(RegExp);
        let query2 = utils.buildQuery(request, {forExact: fields});
        expect(query2.a).to.exist;
        expect(query2.$or[0].a).to.exist;
        expect(query2.$or[1].b.$in).to.exist;
        expect(query2.$or[1].b.$in.length).to.equal(2);
        let query3 = utils.buildQuery(request, {forID: [['id', 'id']]});
        expect(query3.id).to.exist;
        expect(query3.id.$in).to.exist;
        expect(query3.id.$in.length).to.equal(2);
        expect(query3.$or[0].id).to.exist;
        expect(query3.$or[0].id.$in).to.exist;
        expect(query3.$or[0].id.$in.length).to.equal(2);
        done();
    });
    it('should form the proper object for optsToDoc', (done) => {
        expect(utils.optsToDoc('')).to.not.exist;
        expect(utils.optsToDoc(null)).to.not.exist;
        expect(utils.optsToDoc(undefined)).to.not.exist;
        expect(utils.optsToDoc('-updatedOn', 1, -1)).to.deep.equal({updatedOn: -1});
        expect(utils.optsToDoc('updatedOn')).to.deep.equal({updatedOn: 1});
        expect(utils.optsToDoc('a b -c', 1, 0)).to.deep.equal({a: 1, b: 1, c: 0});
        done();
    });
    it('should log and boom error', (done) => {
        expect(utils.logAndBoom(new Error('testing logAndBoom')));
        done();
    });
});
