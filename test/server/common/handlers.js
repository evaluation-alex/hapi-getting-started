'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let Model = require('./../../../build/common/dao');
let createHandler = require('./../../../build/common/handlers').buildCreateHandler;
let findHandler = require('./../../../build/common/handlers').buildFindHandler;
let findOneHandler = require('./../../../build/common/handlers').buildFindOneHandler;
let Bluebird = require('bluebird');
let expect = require('chai').expect;
describe('Handlers and Mixins', () => {
    it('create handler should log and boom errors when it encounters exceptions', (done) => {
        let reply = (args) => {
            expect(args).to.be.an.instanceof(Error);
        };
        let request = {
            auth: {
                credentials: {
                    user: {
                        email: 'test'
                    }
                }
            }
        };
        let Mdel = {
            newObject: (rquest, by) => {
                expect(rquest).to.exist;
                expect(by).to.equal('test');
                return Bluebird.reject(new Error('test'));
            }
        };
        let handler = createHandler(Mdel, undefined, undefined);
        handler(request, reply);
        done();
    });
    it('find handler should log and boom errors when it encounters exceptions', (done) => {
        let Mdel = {
            pagedFind: (query, fields, sort, limit, page) => {
                expect(query).to.exist;
                expect(fields).to.not.exist;
                expect(sort).to.not.exist;
                expect(limit).to.not.exist;
                expect(page).to.not.exist;
                return Bluebird.reject(new Error('test'));
            }
        };
        let request = {
            query: {}
        };
        let queryBuilder = (rquest) => {
            expect(rquest).to.exist;
            return {
                organisation: '*'
            };
        };
        let reply = (args) => {
            expect(args).to.be.an.instanceof(Error);
        };
        let handler = findHandler(Mdel, queryBuilder, undefined);
        handler(request, reply);
        done();
    });
    it('findOne handler should log and boom exceptions when it encounters exceptions', (done) => {
        let Mdel = {
            collection: 'test'
        };
        let request = {
            pre: {
                test: {
                    populate: (user) => {
                        return Bluebird.reject(new Error(user));
                    }
                }
            },
            auth: {
                credentials: {
                    user: {
                        email: 'test'
                    }
                }
            }
        };
        let reply = (args) => {
            expect(args).to.be.an.instanceof(Error);
        };
        let handler = findOneHandler(Mdel);
        handler(request, reply);
        done();
    });
    it('Model should return already created connection', (done) => {
        expect(Model.connect('app', {})).to.exist;
        done();
    });
});

