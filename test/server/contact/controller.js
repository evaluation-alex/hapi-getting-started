'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Config = require(relativeTo + 'config');
var tu = require('./../testutils');
var Fs = require('fs');
//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Contact', function () {
    var server;
    beforeEach(function (done) {
        server = tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    it('returns an error when send email fails', function (done) {
        Fs.renameSync('./server/contact/contact.hbs.md', './server/contact/contact2.hbs.md');
        var request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(500);
                Fs.renameSync('./server/contact/contact2.hbs.md', './server/contact/contact.hbs.md');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns success after sending an email', function (done) {
        var request = {
            method: 'POST',
            url: '/contact',
            payload: {
                name: 'Toast Man',
                email: 'mr@toast.show',
                message: 'I love you man.'
            }
        };
        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(200);
                done();
            } catch(err) {
                done(err);
            }
        });
    });
});
