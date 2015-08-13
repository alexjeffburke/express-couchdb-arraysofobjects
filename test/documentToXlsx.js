var documentsToXlsx = require('../lib/documentsToXlsx');
var expect = require('unexpected');
var stream = require('stream');

function assertDocuments(documents, callback) {
    callback = callback || function () {};
    var dest = new stream.Writable();
    var rows = [];

    dest._write = function (chunk, encoding, callback) {
        callback();
    };

    dest.end = function () {
        callback(null, rows);
    };

    documentsToXlsx('somename').on('headerRow', function (headerRow) {
        rows.push(headerRow);
    }).on('rowObject', function (rowObject) {
        // convert row object to a flat values list
        row = Object.keys(rowObject).map(function (prop) {
            return rowObject[prop];
        });

        rows.push(row);
    }).writeToStream(dest, documents);
}

describe('documentToXlsx', function () {
    expect.addAssertion('to have output rows', function (expect, subject, expectedRows) {
        this.errorMode = 'bubble';

        subject = Array.isArray(subject) ? subject : [subject];

        function localAssertDocuments(cb) {
            assertDocuments(subject, cb);
        }

        return expect(localAssertDocuments, 'to call the callback without error').spread(function (rows) {
            expect(rows, 'to have length', expectedRows.length);

            expect(rows, 'to equal', expectedRows);
        });
    });

    it('should not error with no documents present', function () {
        expect(function () {
            assertDocuments([]);
        }, 'not to throw');
    });

    it('should return empty output if no documents were present', function () {
        expect([], 'to have output rows', []);
    });

    it('should return no rows when the document has no content', function () {
        expect({}, 'to have output rows', []);
    });

    it('should return a row when there is content within the document', function () {
        var doc = {
            _id: 'myId',
            additionalColumn: 'included',
            somename: [
                {
                    a: 'foo',
                    b: 'bar'
                }
            ]
        };

        return expect(doc, 'to have output rows', [
            ['id', 'additionalColumn', 'a', 'b'],
            ['myId', 'included', 'foo', 'bar']
        ]);
    });

    it('should return multiple rows one for each content entry', function () {
        var doc = {
            _id: 'id',
            somename: [
                {
                    data: 'row1'
                },
                {
                    data: 'row2'
                },
                {
                    data: 'row3'
                }
            ]
        };

        return expect(doc, 'to have output rows', [
            ['id', 'data'],
            ['id', 'row1'],
            ['id', 'row2'],
            ['id', 'row3']
        ]);
    });
});
