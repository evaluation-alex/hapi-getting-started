'use strict';
let relativeToServer = './../../../server/';
let CreateHandler = require(relativeToServer + 'common/handlers/create');
let FindHandler = require(relativeToServer + 'common/handlers/find');
let FindOneHandler = require(relativeToServer + 'common/handlers/find-one');
let InsertAndAudit = require(relativeToServer + 'common/mixins/insert');
let Promise = require('bluebird');
let _ = require('lodash');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let expect = Code.expect;
describe('Handlers and Mixins', function () {
    it('create handler should log and boom errors when it encounters exceptions', function (done) {
        let reply = function reply (args) {
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
            newObject: function (request, by) {
                expect(request).to.exist();
                expect(by).to.equal('test');
                return Promise.reject(new Error('test'));
            }
        };
        let handler = new CreateHandler(Model, undefined, undefined);
        handler(request, reply);
        done();
    });
    it('find handler should log and boom errors when it encounters exceptions', function (done) {
        let Model = {
            pagedFind: function (query, fields, sort, limit, page) {
                expect(query).to.exist();
                expect(fields).to.not.exist();
                expect(sort).to.not.exist();
                expect(limit).to.not.exist();
                expect(page).to.not.exist();
                return Promise.reject(new Error('test'));
            }
        };
        let queryBuilder = function (request) {
            expect(request).to.exist();
            return {
                organisation: '*'
            };
        };
        let request = {
            query: {}
        };
        let reply = function reply (args) {
            expect(args).to.be.an.instanceof(Error);
        };
        let handler = new FindHandler(Model, queryBuilder, undefined);
        handler(request, reply);
        done();
    });
    it('findOne handler should log and boom exceptions when it encounters exceptions', function (done) {
        let Model = {
            collection: 'test'
        };
        let request = {
            pre: {
                test: 'something'
            }
        };
        let reply = function reply (args) {
            expect(args).to.be.an.instanceof(Error);
        };
        let findOneCb = function (obj) {
            expect(obj).to.equal('test');
            return Promise.reject(new Error('test'));
        };
        let handler = new FindOneHandler(Model, findOneCb);
        handler(request, reply);
        done();
    });
    it('insertAndAudit should return a not created error when _insert fails', function (done) {
        let obj = {
            insert: function (doc) {
                expect(doc).to.exist();
                return Promise.resolve(undefined);
            },
            collection: 'test'
        };
        _.extend(obj, new InsertAndAudit('_id', 'create'));
        obj.insertAndAudit({test: 'error'})
            .catch(function (err) {
                expect(err).to.exist();
            });
        done();
    });
});

