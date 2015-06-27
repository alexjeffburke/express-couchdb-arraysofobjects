var documentsToCsv = require('../lib/documentsToCsv');
var expect = require('unexpected');
var streamBuffers = require('stream-buffers');

function assertDocuments(documents) {
    var b = new streamBuffers.WritableStreamBuffer();

    documentsToCsv(b, 'somename', documents);

    b.destroy();

    // if nothing was written return the empty string
    return (b.getContentsAsString('utf8') || '');
}

describe('documentToCsv', function () {
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
});
