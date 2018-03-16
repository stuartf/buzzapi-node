const expect = require('chai').expect;
const nock = require('nock');

const BuzzApi = require('../index');
const response = require('./response');

const buzzapisync = new BuzzApi({'apiUser': '', 'apiPassword': '', 'sync': true});
const buzzapi = new BuzzApi({'apiUser': '', 'apiPassword': ''});

const defaultBody = {'api_operation': 'read', 'api_pull_response_to': ['ABC123'], 'api_app_ticket': 'XYZ789', 'api_receive_timeout': 5000, 'api_client_request_handle': /.*/};
const api = nock('https://api.gatech.edu');

beforeEach(() => {
    nock.cleanAll();
});

describe('Sync tests', () => {

    it('Gets a resource in a single request', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.sync);
        return buzzapisync.post('test', 'test', {}).then(response => {
            expect(typeof response).to.equal('object');
            expect(response.success);
        });
    });

    it('Handles buzzapi errors', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.syncError);
        return buzzapisync.post('test', 'test', {}).catch(err => {
            expect(typeof err.buzzApiBody).to.equal('object');
            expect(err.buzzApiErrorInfo.success).to.equal(false);
        });
    });

    it('Handles http errors', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(404, 'Not Found');
        return buzzapisync.post('test', 'test', {}).catch(err => {
            expect(err.buzzApiBody).to.equal('Not Found');
            return expect(err.buzzApiErrorInfo).to.be.empty;
        });
    });

    it('Handles errors with no body set', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(400);
        return buzzapisync.post('test', 'test', {}).catch(err => {
            expect(err.message).to.equal('BuzzApi error');
            return expect(err.buzzApiBody).to.be.empty;
        });
    });

    it('Responds via callback if provided', done => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.sync);
        buzzapisync.post('test', 'test', (err, response) => {
            expect(typeof response).to.equal('object');
            expect(response.success);
            done();
        });
    });

    it('Sends errors via callback if provided', done => {
        api.post('/apiv3/test/test', () => {return true;}).reply(404, 'Not Found');
        buzzapisync.post('test', 'test', (err, response) => {
            /*jshint expr: true*/ expect(response).to.be.null;
            expect(err.buzzApiBody).to.equal('Not Found');
            done();
        });
    });

    it('Does not lose requests when opening more than the queuing limit of 20', () => {
        let reqs = api.post('/apiv3/test/test', () => {return true;}).times(25).socketDelay(200).reply(200, response.sync);
        let check = response => {
            expect(typeof response).to.equal('object');
            expect(response.success);
        };
        for (let i=0; i < 25; i++) {
            buzzapisync.post('test', 'test', {}).then(check);
        }
        expect(reqs.isDone());
    });
});

describe('Async tests', () => {

    it('Makes a second request to get async messages', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        var aReq = api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncSuccess);
        return buzzapi.post('test', 'test', {}).then(response => {
            expect(typeof response).to.equal('object');
            expect(response.success);
            expect(aReq.isDone());
        });
    });

    it('Tries again if async result not ready', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        var nrReq = api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncNotReady);
        api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncSuccess);
        return buzzapi.post('test', 'test', {}).then(response => {
            expect(typeof response).to.equal('object');
            expect(response.success);
            expect(nrReq.isDone());
        });
    }).timeout(6000);

    it('Handles buzzapi errors', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncError);
        return buzzapi.post('test', 'test', {}).catch(err => {
            expect(typeof err.buzzApiBody).to.equal('object');
            expect(err.buzzApiErrorInfo.success).to.equal(false);
        });
    });

    it('Handles buzzapi errors at top level of response', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.syncError);
        return buzzapi.post('test', 'test', {}).catch(err => {
            expect(typeof err.buzzApiBody).to.equal('object');
            expect(err.buzzApiErrorInfo.success).to.equal(false);
        });
    });

    it('Handles http errors', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(404, 'Not Found');
        return buzzapi.post('test', 'test', {}).catch(err => {
            expect(err.buzzApiBody).to.equal('Not Found');
        });
    });

    it('Responds via callback if provided', done => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncSuccess);
        buzzapi.post('test', 'test', (err, response) => {
            expect(typeof response).to.equal('object');
            expect(response.success);
            done();
        });
    });

    it('Responds via callback if provided', done => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(404, 'Not Found');
        buzzapi.post('test', 'test', (err, response) => {
            /*jshint expr: true*/ expect(response).to.be.null;
            expect(err.buzzApiBody).to.equal('Not Found');
            done();
        });
    });

    it('Handles errors with no body set', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(400);
        return buzzapi.post('test', 'test', {}).catch(err => {
            expect(err.message).to.equal('BuzzApi error');
            return expect(err.buzzApiBody).to.be.empty;
        });
    });

    it('Gives up retrying a request after reaching the timeout', () => {
        api.post('/apiv3/test/test', () => {return true;}).reply(200, response.async);
        api.post('/apiv3/api.my_messages', defaultBody).reply(200, response.asyncNotReady);
        let defaultTimeout = buzzapi.options.api_receive_timeout;
        buzzapi.options.api_receive_timeout = 1;
        return buzzapi.post('test', 'test', {}).catch(err => {
            buzzapi.options.api_receive_timeout = defaultTimeout;
            expect(err.message).to.equal('Request timed out for: ABC123');
        });
    }).timeout(6000);
});
