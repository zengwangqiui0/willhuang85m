const WritableStream = require('stream').Writable;
const Transform = require('stream').Transform;
const mongodb = require('mongodb');
const path = require('path');
const mime = require('mime');
const _ = require('lodash');


const client = (uri, mongoOptions, fn) => {
    const opts = Object.assign({ useNewUrlParser: true }, mongoOptions);
    mongodb.MongoClient.connect(uri, opts, fn);
}

const bucket = (db, bucketOptions) => {
    const opts = Object.assign({}, bucketOptions);
    return new mongodb.GridFSBucket(db, opts);
}

module.exports = function SkipperGridFS(globalOptions) {
    const options = globalOptions || {};

    _.defaults(options, {
        uri: 'mongodb://localhost:27017/mydatabase'
    });

    const adapter = {};
    adapter.rm = (fd, cb) => {
        const errorHandler = (err, client) => {
            if (client) client.close();
            if (cb) cb(err);
        }

        client(options.uri, options.mongoOptions, (err, client) => {
            if (err) {
                errorHandler(err, client);
            }

            bucket(client.db(), options.bucketOptions).delete(fd._id, errorHandler);
            if (cb) cb();
        });
    }

    adapter.ls = (dirpath, cb) => {
        const errorHandler = (err, client) => {
            if (client) client.close();
            if (cb) cb(err);
        }

        const __transform__ = Transform();
        __transform__._transform = (chunk, encoding, callback) => {
            return callback(null, chunk);
        };

        client(options.uri, options.mongoOptions, (err, client) => {
            if (err) {
                errorHandler(err, client);
            }

            const cursor = bucket(client.db(), options.bucketOptions).find({ 'metadata.dirname': dirpath })
            if (cb) {
                cursor.toArray((err, documents) => {
                    if (err) {
                        errorHandler(err, client);
                    }
                    client.close();
                    cb(null, documents);
                });
            } else {
                cursor.pipe(__transform__);
            }
        });

        if (!cb) {
            return __transform__;
        }
    }

    adapter.read = (fd, cb) => {
        const __transform__ = Transform();
        __transform__._transform = (chunk, encoding, callback) => {
            return callback(null, chunk);
        };

        __transform__.once('error', (error, client) => {
            if (client) client.close();
            if (cb) cb(error);
        });

        __transform__.once('done', (client) => {
            if (client) client.close();
        });

        client(options.uri, options.mongoOptions, (err, client) => {
            if (err) {
                __transform__.emit('error', error, client);
            }

            const downloadStream = bucket(client.db(), options.bucketOptions).openDownloadStream(fd._id);
            downloadStream.once('end', () => {
                __transform__.emit('done', client);
            });

            downloadStream.pipe(__transform__);
        });

        return __transform__;
    }

    adapter.receive = (opts) => {
        const receiver__ = WritableStream({ objectMode: true });

        receiver__.once('done', (client, done) => {
            if (client) client.close();
            if (done) done();
        });

        receiver__.once('error', (error, client, done) => {
            if (client) client.close();
            if (done) done(error);
        });

        receiver__.write = (__newFile, encoding, done) => {
            client(options.uri, options.mongoOptions, (error, client) => {
                if (error) {
                    receiver__.emit('error', error, client, done);
                }

                const fd = __newFile.fd;
                const filename = __newFile.filename;

                const outs__ = bucket(client.db(), options.bucketOptions).openUploadStreamWithId(fd, filename, {
                    metadata: {
                        filename: filename,
                        fd: fd,
                        dirname: __newFile.dirname || path.dirname(fd)
                    },
                    contentType: mime.getType(fd)
                });

                __newFile.once('close', () => {
                    receiver__.emit('done', client, done);
                });
                __newFile.once('error', (error) => {
                    receiver__.emit('error', error, client, done);
                });
                outs__.once('finish', () => {
                    receiver__.emit('done', client, done);
                });
                outs__.once('error', (error) => {
                    receiver__.emit('error', error, client, done);
                });

                __newFile.pipe(outs__);
            });
        }
        return receiver__;
    }
    return adapter;
};

