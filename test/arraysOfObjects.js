var arraysOfObjects = require('../lib/arraysOfObjects');
var BeanBag = require('beanbag');
var expect = require('unexpected')
        .clone()
        .installPlugin(require('unexpected-express'));
var mockCouch = require('mock-couch-alexjeffburke');

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

    var couchMock;

    function mockCleanUp() {
        couchMock.close();
        couchMock = null;
    }

    expect.addAssertion('with cleanup', function (expect, subject, assertFn) {
        var that = this;

        return expect.promise(function (run) {
            couchMock = mockCouch.createServer();

            couchMock.listen(testPort, run);
        }).then(function () {
            return expect.promise(function (resolve, reject) {
                return resolve(assertFn());
            }).finally(mockCleanUp);
        });
    });

    expect.addAssertion('using mocked out couchdb', function (expect, subject, databases) {
        var that = this;

        return expect.promise(function () {
            Object.keys(databases).forEach(function (databaseName) {
                couchMock.addDB(databaseName, databases[databaseName].docs);
            });
        }).then(function () {
            return that.shift(subject, 1);
        });
    });

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

        it('should allow bulk update', function () {
            var documents = [
                {
                    _id: 'a@example.com',
                    _rev: '1-b',
                    foo: 'bar'
                },
                {
                    _id: 'b@example.com',
                    _rev: '1-c',
                    baz: {}
                },
                {
                    _id: 'c@example.com'
                }
            ];

            var myHandler = createHandler({
                handlerName: 'bulkupdate',
                databaseName: 'bulkupdate'
            });

            return expect(myHandler, 'with cleanup', function () {
                return expect(myHandler, 'using mocked out couchdb', {
                    bulkupdate: {}
                }, 'to yield exchange', {
                    request: {
                        url: '/',
                        method: 'POST',
                        body: {
                            bulkupdate: documents
                        }
                    },
                    response: {
                        statusCode: 200
                    }
                }).then(function () {
                    // assert the same data is returned with a revision
                    var returnedDocuments = documents.map(function (doc) {
                        doc._rev = expect.it('not to be empty');

                        return doc;
                    });

                    return expect(myHandler, 'to yield exchange', {
                        request: {
                            url: '/'
                        },
                        response: {
                            statusCode: 200,
                            body: {
                                bulkupdate: returnedDocuments
                            }
                        }
                    });
                });
            });
        });

        it('should catch bulk update conflict', function () {
            var documents = [
                {
                    _id: 'a@example.com',
                    _rev: '1-a'
                },
                {
                    _id: 'b@example.com',
                    _rev: '2-b'
                }
            ];
            var failDocument = {
                _id: documents[1]._id
            };
            var submitDocuments = documents.slice(0);
            submitDocuments[1] = failDocument;

            return expect(createHandler, 'with cleanup', function () {
                return expect(createHandler({
                    handlerName: 'bulkupdateconflict',
                    databaseName: 'bulkupdateconflict'
                }), 'using mocked out couchdb', {
                    bulkupdateconflict: {
                        docs: documents
                    }
                }, 'to yield exchange', {
                    request: {
                        url: '/',
                        method: 'POST',
                        body: {
                            bulkupdateconflict: submitDocuments
                        }
                    },
                    response: {
                        statusCode: 409,
                        body: {
                            rejected: [{
                                _id: failDocument._id
                            }]
                        }
                    }
                });
            });
        });

        it('should fail to _clear without confirmation', function () {
            return expect(createHandler({
                handlerName: 'faildelete',
                databaseName: 'faildelete'
            }), 'to yield exchange', {
                request: {
                    url: '/_clear',
                    method: 'POST'
                },
                response: {
                    statusCode: 412
                }
            });
        });

        it('should empty the database on confirmed _clear', function () {
            var documents = [
                {
                    _id: 'a@example.com'
                },
                {
                    _id: 'b@example.com'
                },
                {
                    _id: 'c@example.com'
                }
            ];

            var myHandler = createHandler({
                handlerName: 'deletedhandler',
                databaseName: 'arraysofobjects'
            });

            return expect(myHandler, 'with cleanup', function () {
                return expect(myHandler, 'using mocked out couchdb', {
                    arraysofobjects: {
                        docs: documents
                    }
                }, 'to yield exchange', {
                    request: {
                        url: '/_clear',
                        method: 'POST',
                        body: {
                            confirmed: true
                        }
                    },
                    response: {
                        statusCode: 200
                    }
                }).then(function () {
                    return expect(myHandler, 'to yield exchange', {
                        request: {
                            url: '/'
                        },
                        response: {
                            statusCode: 200,
                            body: {
                                deletedhandler: []
                            }
                        }
                    });
                });
            });
        });

        it('should handled a conflicted _clear', function () {
            var conflictDocument = {
                _id: 'c@example.com'
            };
            var databaseName = 'arraysofobjects';
            var documents = [
                {
                    _id: 'a@example.com'
                },
                {
                    _id: 'b@example.com'
                },
                conflictDocument
            ];

            var myHandler = createHandler({
                handlerName: 'conflictedhandler',
                databaseName: databaseName
            });

            return expect(myHandler, 'with cleanup', function () {
                /*
                 * Simulate _clear losing a race to a document update.
                 *
                 * Arrange for the mutation of one of the documents which will cause the state of
                 * revisions in the database to be inconsistent with what was loaded as part of the
                 * _all_docs request in the _clear handler. When _bulk_docs is triggered this will
                 * cause a conflict and we assert the offending document is listed as rejected.
                 */
                couchMock.on('GET', function (eventData) {
                    var documentObject;

                    if (eventData.type === '_all_docs' && eventData.database === databaseName) {
                        documentObject = couchMock.databases[databaseName][conflictDocument._id];
                        // reset the revision
                        documentObject._rev = '2-b';
                        // record the new revision
                        conflictDocument._rev = documentObject._rev;
                    }
                });

                return expect(myHandler, 'using mocked out couchdb', {
                    arraysofobjects: {
                        docs: documents
                    }
                }, 'to yield exchange', {
                    request: {
                        url: '/_clear',
                        method: 'POST',
                        body: {
                            confirmed: true
                        }
                    },
                    response: {
                        statusCode: 409,
                        body: {
                            rejected: [{
                                _id: conflictDocument._id
                            }]
                        }
                    }
                }).then(function () {
                    return expect(myHandler, 'to yield exchange', {
                        request: {
                            url: '/'
                        },
                        response: {
                            statusCode: 200,
                            body: {
                                conflictedhandler: [conflictDocument]
                            }
                        }
                    });
                });
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
