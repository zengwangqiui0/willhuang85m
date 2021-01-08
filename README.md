skipper-gridfs
==============

## Installation

```
$ npm install skipper-gridfs --save
```

==============

## Usage

First instantiate a blob adapter (`blobAdapter`):

```js
var blobAdapter = require('skipper-gridfs')();
```

Build a receiver (`receiving`):

```js
var receiving = blobAdapter.receive();
```

Then stream file(s) from a particular field (`req.file('foo')`):

```js
req.file('foo').upload(receiving, function (err, filesUploaded) {
// ...
});
```

========================================

## Options

All options may be passed either into the blob adapter's factory method:

```js
var blobAdapter = require('skipper-gridfs')({
// These options will be applied unless overridden.
});
```

Or directly into a receiver:

```js
var receiving = blobAdapter.receive({
// Options will be applied only to this particular receiver.
});
```


| Option    | Type       | Details |
|-----------|:----------:|---------|
| `dbname`     | ((string)) | Your Mongodb database (_required_) |
| `host`     | ((string)) | Your Mongodb host address", e.g. `"localhost"` (_required_) |
| `port`     | ((string)) | Your Mongodb ip address, e.g. `"27017"` (_required_) |
| `dirname`  | ((string)) | Metadata associated with the Gridstore to emulate directory structure in MongoDb. Defaults to `"/"`
| `saveAs()`  | ((function)) | An optional function that can be used to define the logic for naming files. For example: <br/> `function (file) {return Math.random()+file.name;} });` <br/> By default, the filename of the uploaded file is used, including the extension (e.g. `"Screen Shot 2014-05-06 at 4.44.02 PM.jpg"`.  If a file already exists at `dirname` with the same name, it will be overridden. |
| `maxBytes` | ((integer)) | Max total number of bytes permitted for a given upload, calculated by summing the size of all files in the upstream; e.g. if you created an upstream that watches the "avatar" field (`req.file('avatar')`), and a given request sends 15 file fields with the name "avatar", `maxBytes` will check the total number of bytes in all of the 15 files.  If maxBytes is exceeded, the already-written files will be left untouched, but unfinshed file uploads will be garbage-collected (not yet implemented), and not-yet-started uploads will be cancelled. |

========================================

## Advanced Usage

#### `upstream.pipe(receiving)`

As an alternative to the `upload()` method, you can pipe an incoming **upstream** returned from `req.file()` (a Readable stream of Readable binary streams) directly to the **receiver** (a Writable stream for Upstreams.)

```js
req.file('foo').pipe(receiving);
```

There is no performance benefit to using `.pipe()` instead of `.upload()`-- they both use streams2.  The `.pipe()` method is available merely as a matter of flexibility/chainability.  Be aware that `.upload()` handles the `error` and `finish` events for you; if you choose to use `.pipe()`, you will of course need to listen for these events manually:

```js
req.file('foo')
.on('error', function onError() { ... })
.on('finish', function onSuccess() { ... })
.pipe(receiving)
```

========================================