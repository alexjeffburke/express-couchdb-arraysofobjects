var csv = require('ya-csv');

function documentsToCsv(handlerName, writer, documents) {
    var csvWriter = new csv.CsvWriter(writer);

    (documents || []).forEach(function (doc) {
        var rows = documentToRows(handlerName, doc);

        rows.forEach(function (row) {
            csvWriter.writeRecord(row);
        });
    });

    writer.end();
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

module.exports = function (handlerName) {
    var api = {};

    api.writeToStream = documentsToCsv.bind(null, handlerName)

    return api;
};
