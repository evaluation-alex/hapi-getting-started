'use strict';
var Hapi = require('hapi');
var Config = require('./../../../config').config({argv: []});
var MailerPlugin = require('./../../../server/mailer');
var ContactPlugin = require('./../../../server/api/contact');
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
        var plugins = [ MailerPlugin, ContactPlugin ];
        server = new Hapi.Server();
        server.connection({ port: Config.port.web });
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it.skip('returns an error when send email fails', function (done) {
        Fs.renameSync('./server/emails/contact.hbs.md', './server/emails/contact2.hbs.md');
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
            expect(response.statusCode).to.equal(500);
            Fs.renameSync('./server/emails/contact2.hbs.md', './server/emails/contact.hbs.md');
            done();
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
            expect(response.statusCode).to.equal(200);
            done();
        });
    });
});
