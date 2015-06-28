var documentsToXlsx = require('../lib/documentsToXlsx');
var expect = require('unexpected');
var stream = require('stream');

function assertDocuments(documents, callback) {
    callback = callback || function () {};
    var dest = new stream.Writable({ objectMode: true });
    var rowObjects = [];

    dest._write = function (chunk) {
        rowObjects.push(chunk);
    };

    dest.end = function () {
        callback(null, rowObjects);
    };

    documentsToXlsx('somename').writeToStream(dest, documents);
}

describe('documentToXlsx', function () {
    expect.addAssertion('to have output rows', function (expect, subject, expectedRows) {
        this.errorMode = 'bubble';

        subject = Array.isArray(subject) ? subject : [subject];

        function localAssertDocuments(cb) {
            assertDocuments(subject, cb);
        }

        return expect(localAssertDocuments, 'to call the callback without error').spread(function (rowObjects) {
            var rows = rowObjects.map(function (o) {
                return Object.keys(o).map(function (prop) {
                    return rowObjects[prop];
                });
            });

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
            somename: [
                {
                    a: 'foo',
                    b: 'bar'
                }
            ]
        };

        expect(doc, 'to have output rows', [
            ['myId', 'foo', 'bar']
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

        expect(doc, 'to have output rows', [
            ['id', 'row1'],
            ['id', 'row2'],
            ['id', 'row3']
        ]);
    });
});
