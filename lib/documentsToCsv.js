var csv = require('ya-csv');

function documentsToCsv(handlerName, writer, documents) {
    var csvWriter = new csv.CsvWriter(writer);
    var headerRow = null;

    documents = (documents || []);

    var firstDoc = (documents.length > 0 ? documents[0] : {});
    var firstDocRows = (firstDoc[handlerName] || []);

    if (firstDocRows.length > 0) {
        headerRow = getHeaderRow(firstDocRows[0]);
        csvWriter.writeRecord(headerRow);
    }

    documents.forEach(function (doc) {
        var rows = documentToRows(handlerName, doc, headerRow);

        rows.forEach(function (row) {
            csvWriter.writeRecord(row);
        });
    });

    writer.end();
}

function documentToRows(handlerName, doc, headerRow) {
    var rows = [];

    (doc[handlerName] || []).forEach(function (entryObject) {
        var row = objectToRow(entryObject);

        row.unshift(doc._id);

        rows.push(row);
    });

    return rows;
}

function getHeaderRow(entryObject) {
    // pull out the object keys for use as the header row
    return ['id'].concat(Object.keys(entryObject));
}

function objectToRow(entryObject) {
    var row = [];

    Object.keys(entryObject).forEach(function (prop) {
        row.push(entryObject[prop]);
    });

    return row;
}

module.exports = function (handlerName) {
    var api = {};

    api.writeToStream = documentsToCsv.bind(null, handlerName)

    return api;
};
