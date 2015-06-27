var documentsToCsv = require('../lib/documentsToCsv');
var expect = require('unexpected');
var streamBuffers = require('stream-buffers');

function assertDocuments(documents) {
    var b = new streamBuffers.WritableStreamBuffer();

    documentsToCsv('somename').writeToStream(b, documents);

    // if nothing was written return the empty string
    return (b.getContentsAsString('utf8') || '');
}

describe('documentToCsv', function () {
    expect.addAssertion('to have output lines', function (expect, subject, expectedRows) {
        this.errorMode = 'bubble';
        var output = assertDocuments([subject]);
        // make output string into array of rows
        var rows = output.split('\r\n').map(function (line) { return line.split(','); });
        // remove trailing row
        rows.pop();

        expect(rows, 'to have length', !!subject.somename ? subject.somename.length + 1 : 0);

        // quote expected string values
        expectedRows = expectedRows.map(function (row) {
            return row.map(function (value) { return (typeof value === 'string') ? '"' + value +'"' : value; });
        });

        expect(rows, 'to equal', expectedRows);
    });

    it('should not error with no documents present', function () {
        expect(function () {
            assertDocuments([]);
        }, 'not to throw');
    });

    it('should return empty output if no documents were present', function () {
        var output = assertDocuments([]);

        expect(output, 'to be empty');
    });

    it('should return output if documents were present', function () {
        var output = assertDocuments([{
            _id: 'myId',
            somename: [
                {
                    a: 'foo',
                    b: 'bar'
                }
            ]
        }]);

        expect(output, 'not to be empty');
    });

    it('should return no rows when the document has no content', function () {
        expect({}, 'to have output lines', []);
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

        expect(doc, 'to have output lines', [
            ['id', 'a', 'b'],
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

        expect(doc, 'to have output lines', [
            ['id', 'data'],
            ['id', 'row1'],
            ['id', 'row2'],
            ['id', 'row3']
        ]);
    });
});