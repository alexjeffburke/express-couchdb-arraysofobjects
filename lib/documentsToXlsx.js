var stream = require('stream');
var XlsxExport = require('xlsx-export');

function createXlsxWriter(headerRow, firstRow, dataStream) {
    var headers = [];
    var typeMap = {};

    headerRow.forEach(function (rowHeading) {
        var typeName = typeof firstRow[rowHeading];

        typeName = (typeName !== 'undefined' ? typeName : 'string');

        typeMap[rowHeading] = typeName;

        headers.push({
            caption: rowHeading
        });
    });

    return new XlsxExport({
        map: typeMap,
        headers: headers,
        stream: dataStream
    });
}

function documentsToXlsx(handlerName, writer, documents) {
    var dataStream = new stream.Readable({ objectMode: true });
    var headerRow = null;
    var xlsxWriter;

    documents = (documents ? documents.slice(0) : []);

    dataStream._read = function () {
        var doc = documents.shift();

        // end the stream if we have no more documents
        if (!doc) {
            return dataStream.push(null);
        }

        (doc[handlerName] || []).forEach(function (entryObject) {
            entryObject = extend({ id: doc._id }, entryObject);

            dataStream.push(entryObject);
        });
    };

    var firstDoc = (documents.length > 0 ? documents[0] : {});
    var firstDocRows = (firstDoc[handlerName] || []);

    if (firstDocRows.length > 0) {
        // generate header row from the first entry row
        headerRow = getHeaderRow(firstDocRows[0]);

        xlsxWriter = createXlsxWriter(headerRow, firstDocRows[0], dataStream);
        xlsxWriter.pipe(writer);
    } else {
        writer.end();
    }
}

function extend(target, source) {
    Object.keys(source).forEach(function (prop) {
        target[prop] = source[prop];
    });

    return target;
}

function getHeaderRow(entryObject) {
    // pull out the object keys for use as the header row
    return ['id'].concat(Object.keys(entryObject));
}

module.exports = function (handlerName) {
    var api = {};

    api.writeToStream = documentsToXlsx.bind(null, handlerName)

    return api;
};
