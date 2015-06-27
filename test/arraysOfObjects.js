var arraysOfObjects = require('../lib/arraysOfObjects');
var expect = require('unexpected')
        .clone()
        .installPlugin(require('unexpected-express'));
var mockCouch = require('mock-couch');

function extend(target, source) {
    Object.keys(source).forEach(function (prop) {
        target[prop] = source[prop];
    });
}

describe('express-couchdb-arraysofobjects', function () {
    var testPort = 15984;

    function createHandler(options) {
        options.databasePort = testPort;

        return arraysOfObjects(options);
    }

    expect.addAssertion('with couchdb mocked out', function (expect, subject, databases) {
        var couchServer;
        var that = this;

        function cleanUp() {
            couchServer.close();
        }

        return expect.promise(function (run) {
            couchServer = mockCouch.createServer();

            Object.keys(databases).forEach(function (databaseName) {
                couchServer.addDB(databaseName, databases[databaseName].docs);
            });

            couchServer.listen(testPort, run);
        }).then(function () {
            return expect.promise(function () {
                return that.shift(subject, 1);
            }).caught(cleanUp).then(cleanUp);
        });
    });

    describe('handler', function () {
        it('should throw if no handler name was specified', function () {
            expect(function () {
                arraysOfObjects({});
            }, 'to throw');
        });

        it('should throw if no database name was specified', function () {
            expect(function () {
                arraysOfObjects({
                    databaseName: 'db'
                });
            }, 'to throw');
        });
    });

    describe('database requests', function () {
        it('should return a 404 not found error for an unknown database', function () {
            return expect(createHandler({
                handlerName: 'unknown',
                databaseName: 'baddatabase'
            }), 'with couchdb mocked out', {}, 'to yield exchange', {
                request: {
                    url: '/'
                },
                response: {
                    statusCode: 404
                }
            });
        });

        it('should return an empty documents list matching the handler name on empty database', function () {
            return expect(createHandler({
                handlerName: 'somename',
                databaseName: 'emptydatabase'
            }), 'with couchdb mocked out', {
                emptydatabase: {
                    docs: []
                }
            }, 'to yield exchange', {
                request: {
                    url: '/'
                },
                response: {
                    statusCode: 200,
                    body: {
                        somename: []
                    }
                }
            });
        });

        it('should return all documents in a populated database', function () {
            var documents = [
                {
                    _id: 'a@example.com',
                    _rev: '1-a'
                },
                {
                    _id: 'b@example.com',
                    _rev: '2-b'
                },
                {
                    _id: 'c@example.com'
                }
            ];

            return expect(createHandler({
                handlerName: 'somename',
                databaseName: 'basicdatabase'
            }), 'with couchdb mocked out', {
                basicdatabase: {
                    docs: documents
                }
            }, 'to yield exchange', {
                request: {
                    url: '/'
                },
                response: {
                    statusCode: 200,
                    body: {
                        somename: documents
                    }
                }
            });
        });
    });

    describe('document requests', function () {
        it('should return a 404 not found error for an unknown document', function () {
            return expect(createHandler({
                handlerName: 'baddocument',
                databaseName: 'emptydatabase'
            }), 'with couchdb mocked out', {
                emptydatabase: {
                    docs: []
                }
            }, 'to yield exchange', {
                request: {
                    url: '/nosuch@client.com'
                },
                response: {
                    statusCode: 404,
                    body: {
                        error: 'NotFound'
                    }
                }
            });
        });

        it('should return an empty documents list for a client present but without any content', function () {
            var documents = [
                {
                    _id: 'empty@client.com',
                    _rev: '1-a'
                }
            ];

            return expect(createHandler({
                handlerName: 'somename',
                databaseName: 'emptydatabase'
            }), 'with couchdb mocked out', {
                emptydatabase: {
                    docs: documents
                }
            }, 'to yield exchange', {
                request: {
                    url: '/empty@client.com'
                },
                response: {
                    statusCode: 200,
                    body: {
                        somename: []
                    }
                }
            });
        });

        it('should return the entries for a particular document', function () {
            var checkClient = {
                _id: 'check@client.com',
                infostuff: []
            };
            var documents = [
                {
                    _id: 'a@example.com'
                },
                {
                    _id: 'b@example.com'
                },
                checkClient
            ];

            return expect(createHandler({
                handlerName: 'infostuff',
                databaseName: 'infodatabase'
            }), 'with couchdb mocked out', {
                infodatabase: {
                    docs: documents
                }
            }, 'to yield exchange', {
                request: {
                    url: '/' + checkClient._id
                },
                response: {
                    statusCode: 200,
                    body: checkClient
                }
            });
        });

        it('should store the document on POST', function () {
            var writeDocument = {
                _id: 'write@client.com',
                somename: [
                    {
                        foo: 'bar'
                    }
                ]
            };

            return expect(createHandler({
                handlerName: 'posthandler',
                databaseName: 'writedatabase'
            }), 'with couchdb mocked out', {
                writedatabase: {
                    docs: []
                }
            }, 'to yield exchange', {
                request: {
                    url: '/' + writeDocument._id,
                    method: 'POST',
                    body: writeDocument
                },
                response: {
                    statusCode: 200,
                    body: {
                        id: writeDocument._id,
                        rev: expect.it('to be truthy')
                    }
                }
            });
        });

        it('should return a 409 conflict error where the revision number does not match', function () {
            var conflictDocument = {
                _id: 'conflict@client.com',
                _rev: '1-a',
                somename: [
                    {
                        title: 'some note'
                    }
                ]
            };

            return expect(createHandler({
                handlerName: 'conflicthandler',
                databaseName: 'conflictdatabase'
            }), 'with couchdb mocked out', {
                conflictdatabase: {
                    docs: [conflictDocument]
                }
            }, 'to yield exchange', {
                request: {
                    url: '/' + conflictDocument._id,
                    method: 'POST',
                    // change the revision we send
                    data: extend(conflictDocument, { _rev: '1-b' })
                },
                response: {
                    statusCode: 409
                }
            });
        });
    });
});