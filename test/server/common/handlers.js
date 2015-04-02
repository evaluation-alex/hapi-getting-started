'use strict';
var relativeToServer = './../../../server/';
//var expect = require('chai').expect;
var CreateHandler = require(relativeToServer + 'common/handlers/create');
var FindHandler = require(relativeToServer + 'common/handlers/find');
var FindOneHandler = require(relativeToServer + 'common/handlers/find-one');
var InsertAndAudit = require(relativeToServer + 'common/mixins/insert');
var Promise = require('bluebird');
var _ = require('lodash');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;
describe('Handlers and Mixins', function () {
    it('create handler should log and boom errors when it encounters exceptions', function (done) {
        var reply = function reply (args) {
            expect(args).to.be.an.instanceof(Error);
        };
        var request = {
            auth: {
                credentials: {
                    user: {
                        email: 'test'
                    }
                }
            }
        };
        var Model = {
            newObject: function (request, by) {
                expect(request).to.exist();
                expect(by).to.equal('test');
                return Promise.reject(new Error('test'));
            }
        };
        var handler = new CreateHandler(Model, undefined, undefined);
        handler(request, reply);
        done();
    });
    it('find handler should log and boom errors when it encounters exceptions', function (done) {
        var Model = {
            pagedFind: function (query, fields, sort, limit, page) {
                expect(query).to.exist();
                expect(fields).to.not.exist();
                expect(sort).to.not.exist();
                expect(limit).to.not.exist();
                expect(page).to.not.exist();
                return Promise.reject(new Error('test'));
            }
        };
        var queryBuilder = function (request) {
            expect(request).to.exist();
            return {
                organisation: '*'
            };
        };
        var request = {
            query: {}
        };
        var reply = function reply (args) {
            expect(args).to.be.an.instanceof(Error);
        };
        var handler = new FindHandler(Model, queryBuilder, undefined);
        handler(request, reply);
        done();
    });
    it('findOne handler should log and boom exceptions when it encounters exceptions', function (done) {
        var Model = {
            collection: 'test'
        };
        var request = {
            pre: {
                test: 'something'
            }
        };
        var reply = function reply (args) {
            expect(args).to.be.an.instanceof(Error);
        };
        var findOneCb = function (obj) {
            expect(obj).to.equal('test');
            return Promise.reject(new Error('test'));
        };
        var handler = new FindOneHandler(Model, findOneCb);
        handler(request, reply);
        done();
    });
    it('insertAndAudit should return a not created error when _insert fails', function (done) {
        var obj = {
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

