var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
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
    var that = this;
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

        var additionalData = getDataFromDocument(handlerName, doc);

        (doc[handlerName] || []).forEach(function (entryObject) {
            entryObject = _.extend({ id: doc._id }, additionalData, entryObject);

            that.emit('rowObject', entryObject);

            dataStream.push(entryObject);
        });
    };

    var firstDoc = (documents.length > 0 ? documents[0] : {});
    var firstDocRows = (firstDoc[handlerName] || []);

    if (firstDocRows.length > 0) {
        // generate header row from the first entry row
        headerRow = getHeaderRow(handlerName, firstDoc, firstDocRows[0]);

        this.emit('headerRow', headerRow);

        xlsxWriter = createXlsxWriter(headerRow, firstDocRows[0], dataStream);
        xlsxWriter.pipe(writer);
    } else {
        writer.end();
    }
}

function getDataFromDocument(handlerName, doc) {
    return _.omit(doc, ['_id', '_rev', handlerName]);
}

function getHeaderRow(handlerName, firstDoc, firstEntry) {
    // pull out additional header keys in the base object
    var additionalHeaders = Object.keys(getDataFromDocument(handlerName, firstDoc));

    // pull out the object keys for use as the header row
    var entryHeaders = Object.keys(firstEntry);

    var headerRow = ['id'].concat(additionalHeaders, entryHeaders);

    return headerRow;
}

module.exports = function (handlerName) {
    var api = new EventEmitter();

    api.writeToStream = documentsToXlsx.bind(api, handlerName);

    return api;
};
