var csv = require('ya-csv');

function documentsToCsv(writer, handlerName, documents) {
    var csvWriter = new csv.CsvWriter(writer);

    (documents || []).forEach(function (doc) {
        var rows = documentToRows(handlerName, doc);

        rows.forEach(function (row) {
            csvWriter.writeRecord(row);
        });
    });
}

function documentToRows(handlerName, doc) {
    var rows = [];

    (doc[handlerName] || []).forEach(function (entryObject) {
        var row = objectToRow(entryObject);

        row.unshift(doc._id);

        rows.push(row);
    });

    return rows;
}

function objectToRow(entryObject) {
    var row = [];

    Object.keys(entryObject).forEach(function (prop) {
        row.push(entryObject[prop]);
    });

    return row;
}

module.exports = documentsToCsv;
