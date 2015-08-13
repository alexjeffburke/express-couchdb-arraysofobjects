var documentsToCsv = require('../lib/documentsToCsv');
var expect = require('unexpected');
var stream = require('stream');

function assertDocuments(documents, callback) {
    callback = callback || function () {};
    var dest = new stream.Writable();
    var rawChunks = [];

    dest._write = function (chunk, encoding, callback) {
        rawChunks.push(chunk);

        callback();
    };

    dest.end = function () {
        callback(null, Buffer.concat(rawChunks).toString());
    };

    documentsToCsv('somename').writeToStream(dest, documents);
}

describe('documentToCsv', function () {
    expect.addAssertion('to have output lines', function (expect, subject, expectedRows) {
        this.errorMode = 'bubble';

        subject = Array.isArray(subject) ? subject : [subject];

        function localAssertDocuments(cb) {
            assertDocuments(subject, cb);
        }

        return expect(localAssertDocuments, 'to call the callback without error').spread(function (output) {
            // make output string into array of rows
            var rows = output.split('\r\n').map(function (line) { return line.split(','); });
            // remove trailing row
            rows.pop();

            expect(rows, 'to have length', expectedRows.length);

            // quote expected string values
            expectedRows = expectedRows.map(function (row) {
                return row.map(function (value) { return (typeof value === 'string') ? '"' + value +'"' : value; });
            });

            expect(rows, 'to equal', expectedRows);
        });
    });

    it('should not error with no documents present', function () {
        expect(function () {
            assertDocuments([]);
        }, 'not to throw');
    });

    it('should return empty output if no documents were present', function () {
        expect([], 'to have output lines', []);
    });

    it('should return no rows when the document has no content', function () {
        expect({}, 'to have output lines', []);
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

        return expect(doc, 'to have output lines', [
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

        return expect(doc, 'to have output lines', [
            ['id', 'data'],
            ['id', 'row1'],
            ['id', 'row2'],
            ['id', 'row3']
        ]);
    });
});
