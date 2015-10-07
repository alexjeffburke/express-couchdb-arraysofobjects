var BeanBag = require('BeanBag');
var bodyParser = require('body-parser');
var documentsToCsv = require('./documentsToCsv');
var documentsToXlsx = require('./documentsToXlsx');
var express = require('express');
var httpErrors = require('httperrors');

function documentsFromRows(rows) {
    return rows.map(function (row) {
        return {
            _id: row.id,
            _rev: row.rev
        };
    });
}

function rowsToDeleted(rows) {
    return rows.map(function (row) {
        return {
            _id: row.id,
            _rev: row.value.rev,
            _deleted: true
        };
    });
}

function rowsToDocuments(rows) {
    return rows.map(function (row) {
        return row.doc;
    });
}

module.exports = function (config) {
    config = config || {};
    var app = express();
    var handlerName = config.handlerName;

    if (!handlerName) {
        throw new Error('No handler name specified.');
    }

    if (!config.databaseName) {
        throw new Error('No database name specified.');
    }

    config.databaseHost = config.databaseHost || 'http://localhost';
    config.databasePort = config.databasePort || 5984;

    // connect to CouchDB
    var couchdb = new BeanBag({
        url: config.databaseHost + ':' + config.databasePort + '/' + config.databaseName
    });

    app.use(bodyParser.json());

    app.get('/', function (req, res) {
        couchdb.request({
            path: '_all_docs',
            query: {
                include_docs: true
            }
        }, function (err, result, body) {
            if (err) {
                return res.status(err.statusCode).send({
                    error: err.name
                });
            }

            var format = req.query.format;
            var result = {};
            result[handlerName] = rowsToDocuments(body.rows || []);

            if (format === 'csv') {
                res.setHeader('Content-disposition', 'attachment; filename=' + handlerName + '.csv');

                return documentsToCsv(handlerName).writeToStream(res, result[handlerName]);
            } else if (format === 'xlsx') {
                res.setHeader('Content-disposition', 'attachment; filename=' + handlerName + '.xlsx');

                return documentsToXlsx(handlerName).writeToStream(res, result[handlerName]);
            }

            res.status(200).send(result);
        });
    });

    function bulkSend(documents, res) {
        function success() {
            res.status(200).send({});
        }

        if (documents.length === 0) {
            success();
        }

        couchdb.request({
            path: '_bulk_docs',
            method: 'POST',
            body: {
                docs: documents
            }
        }, function (deleteErr, result, body) {
            err = deleteErr;

            if (err) {
                return res.status(err.statusCode).send({
                    error: err.name
                });
            }

            var rowsWithConflicts = body.filter(function (entry) {
                return !!entry.error;
            });

            if (rowsWithConflicts.length > 0) {
                err = httpErrors[409]();

                return res.status(err.statusCode).send({
                    error: err.name,
                    rejected: documentsFromRows(rowsWithConflicts)
                });
            }

            success();
        });
    }

    app.post('/_clear', function (req, res) {
        var body = req.body || {};
        var confirmation = body.confirmation;
        var err;

        if (typeof(confirmation) !== 'boolean' || !confirmation) {
            err = httpErrors[412]();

            return res.status(err.statusCode).send({
                error: err.name
            });
        }

        couchdb.request({
            path: '_all_docs'
        }, function (loadErr, result, body) {
            err = loadErr;

            if (err) {
                return res.status(err.statusCode).send({
                    error: err.name
                });
            }

            var documents = body.rows ? rowsToDeleted(body.rows) : [];

            bulkSend(documents, res);
        });
    });

    app.get('/:docId', function (req, res) {
        var docId = req.params.docId;
        var query = req.query || {};

        couchdb.request({
            path: docId
        }, function (err, result, body) {
            if (err) {
                return res.status(err.statusCode).send({
                    error: err.name
                });
            }

            var format = req.query.format;

            if (!body[handlerName]) {
                body[handlerName] = [];
            }

            if (format === 'csv') {
                res.setHeader('Content-disposition', 'attachment; filename=' + handlerName + '.csv');

                return documentsToCsv(handlerName).writeToStream(res, [body]);
            } else if (format === 'xlsx') {
                res.setHeader('Content-disposition', 'attachment; filename=' + handlerName + '.xlsx');

                return documentsToXlsx(handlerName).writeToStream(res, [body]);
            }

            res.status(200).send(body);
        });
    });

    app.post('/:docId', function (req, res) {
        var docId = req.params.docId;

        couchdb.request({
            method: 'PUT',
            path: docId,
            body: req.body
        }, function (err, result) {
            if (err) {
                return res.status(err.statusCode).send({
                    error: err.name
                });
            }

            res.status(200).send(result.body);
        });
    });

    return app;
};
