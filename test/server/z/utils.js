'use strict';
let tu = require('./../testutils');
describe('Model', () => {
    it('should disconnect when the server stops', (done) => {
        tu.setupServer()
        .then((res) => {
                let server = res.server;
                server.start(() => server.stop());
                done();
            });
    });
});

