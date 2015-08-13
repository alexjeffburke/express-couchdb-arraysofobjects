var _ = require('underscore');
var csv = require('ya-csv');

function documentsToCsv(handlerName, writer, documents) {
    var csvWriter = new csv.CsvWriter(writer);
    var headerRow = null;

    documents = (!!documents ? documents.slice(0) : []);

    var firstDoc = (documents.length > 0 ? documents[0] : {});
    var firstDocRows = (firstDoc[handlerName] || []);

    if (firstDocRows.length > 0) {
        headerRow = getHeaderRow(handlerName, firstDoc, firstDocRows[0]);
        csvWriter.writeRecord(headerRow);
    }

    function _nextDocument() {
        var doc = documents.shift();

        if (!doc) {
            return writer.end();
        }

        var rows = documentToRows(handlerName, doc, headerRow);

        rows.forEach(function (row) {
            csvWriter.writeRecord(row);
        });

        nextDocument();
    }

    var nextDocument = setImmediate.bind(null, _nextDocument);

    nextDocument();
}

function documentToRows(handlerName, doc, headerRow) {
    var rows = [];
    var additionalValues = _.values(getDataFromDocument(handlerName, doc));
    var baseValues = [doc._id].concat(additionalValues);

    (doc[handlerName] || []).forEach(function (entryObject) {
        var row = baseValues.concat(_.values(entryObject));

        rows.push(row);
    });

    return rows;
}

function getDataFromDocument(handlerName, doc) {
    return _.omit(doc, ['_id', '_rev', handlerName]);
}

function getHeaderRow(handlerName, firstDoc, firstEntry) {
    // pull out additional header keys in the base object
    var additionalHeaders = Object.keys(getDataFromDocument(handlerName, firstDoc));

    // pull out the object keys for use as the header row
    var entryHeaders = Object.keys(firstEntry);

    return ['id'].concat(additionalHeaders, entryHeaders);
}

module.exports = function (handlerName) {
    var api = {};

    api.writeToStream = documentsToCsv.bind(null, handlerName)

    return api;
};
