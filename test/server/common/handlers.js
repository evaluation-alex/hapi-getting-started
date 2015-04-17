'use strict';
let relativeToServer = './../../../server/';
let CreateHandler = require(relativeToServer + 'common/handlers/create');
let FindHandler = require(relativeToServer + 'common/handlers/find');
let FindOneHandler = require(relativeToServer + 'common/handlers/find-one');
let insertAndAudit = require(relativeToServer + 'common/mixins/insert');
let Promise = require('bluebird');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let expect = Code.expect;
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
        let Model = {
            newObject: (request, by) => {
                expect(request).to.exist();
                expect(by).to.equal('test');
                return Promise.reject(new Error('test'));
            }
        };
        let handler = new CreateHandler(Model, undefined, undefined);
        handler(request, reply);
        done();
    });
    it('find handler should log and boom errors when it encounters exceptions', (done) => {
        let Model = {
            pagedFind: (query, fields, sort, limit, page) => {
                expect(query).to.exist();
                expect(fields).to.not.exist();
                expect(sort).to.not.exist();
                expect(limit).to.not.exist();
                expect(page).to.not.exist();
                return Promise.reject(new Error('test'));
            }
        };
        let request = {
            query: {}
        };
        let queryBuilder = (request) => {
            expect(request).to.exist();
            return {
                organisation: '*'
            };
        };
        let reply = (args) => {
            expect(args).to.be.an.instanceof(Error);
        };
        let handler = new FindHandler(Model, queryBuilder, undefined);
        handler(request, reply);
        done();
    });
    it('findOne handler should log and boom exceptions when it encounters exceptions', (done) => {
        let Model = {
            collection: 'test'
        };
        let request = {
            pre: {
                test: 'something'
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
        let findOneCb = (obj) => {
            expect(obj).to.equal('test');
            return Promise.reject(new Error('test'));
        };
        let handler = new FindOneHandler(Model, findOneCb);
        handler(request, reply);
        done();
    });
    it('insertAndAudit should return a not created error when _insert fails', (done) => {
        let obj = {
            insert: (doc) => {
                expect(doc).to.exist();
                return Promise.resolve(undefined);
            },
            collection: 'test'
        };
        insertAndAudit(obj, '_id', 'create');
        obj.insertAndAudit({test: 'error'})
            .catch((err) => {
                expect(err).to.exist();
            });
        done();
    });
});

