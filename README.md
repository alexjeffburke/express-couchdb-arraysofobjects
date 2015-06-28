express-couchdb-arraysofobjects
===============================

This module implements an express handler that backs onto CouchDB for
documents of particular structure: namely, those that contain an array of
entries. The handler can be mounted with app.use() and provides endpoints for
interacting with these objects and the database.

The handler can be instantiated simply as follows:

```js
var arraysOfObjects = require('express-couchdb-arraysofobjects');
var express = require('express');

var app = express();
app.use('api', arraysOfObjects({
    databaseName: 'database',
    handlerName: 'somename'
}));

```

Documents
---------

Listed out, a document stored and retrieved by the handler looks as follows:

```json
{
    "_id": "myId",
    "somename": [
        {
            "entry": 123,
            "foo": "foo"
        },
        {
            "entry": 456,
            "foo": "baz"
        }
    ]
}
```

The *somename* property above contain object which make up the various entries
in our documents. The name matches the name of the handler which is also used
as the overall property name when returning multiple documents when querying a
database:

```json
{
    "somename": [
        {
            "id": "document1",
            "somename": [ ... ]
        },
        {
            "id": "document2",
            "somename": [ ... ]
        }
    ]
}
```

Endpoints
---------

The handler provides a number of endpoints to fetch all the objects, a single
object and update a single objects.

### GET /:db

Used to retrieve all documents in the database.

### GET /:db/:documentId

Used to retrieve the document with matching CouchDB _id from the database.

### POST /:db/:documentId

Use to update the document with a matching CouchDB _id from the database.

Error handling
--------------

CouchDB errors are returned by the handlers by setting a the HTTP status code
and returning a body with an error property whose name is the error.

For example, should a document update conflict a 409 HTTP status code is
returned while the body would be:

```json
{
    "error": "Conflict"
}
```

Generic functionality
---------------------

With objects in a standard format various other facilities are made available
by the endpoints.

### Formatting output

Supplying the optional `format` parameter query string to the GET endpoints
will cause the output to be generated and downloaded automatically as the
requested format. The following values are supported:

* `csv`  - output the data as comma separated text file
* `xlsx` - output the data as an Excel XLSX file
