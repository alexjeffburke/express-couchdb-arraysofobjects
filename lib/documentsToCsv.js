var csv = require('ya-csv');

function documentsToCsv(writer, handlerName, documents) {
    var csvWriter = new csv.CsvWriter(writer);

    (documents || []).forEach(function (doc) {
        var entries = doc[handlerName];

        entries.forEach(function (entryObject) {
            var row = objectToRow(entryObject);

            row.unshift(doc._id);

            csvWriter.writeRecord(row);
        });
    });
}

function objectToRow(entryObject) {
    var row = [];

    Object.keys(entryObject).forEach(function (prop) {
        row.push(entryObject[prop]);
    });

    return row;
}

module.exports = documentsToCsv;
