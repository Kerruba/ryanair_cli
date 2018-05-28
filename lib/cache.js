let fs = require('fs');
let os = require('os')



var _cacheEntries = {
    'aggregates': {path: `${os.homedir()}/.cache/ryanair-cli/aggregates.json`, value: {}, expire: undefined}
}


class Cache {
    constructor(expiring) {
        this.expiring = expiring;
    }

    _validEntryName(entryName) {
        return _cacheEntries.hasOwnProperty(entryName);
    }

    _isCacheEntryEmpty(entryName) {
        let val = _cacheEntries[entryName].value;
        switch (typeof val) {
            case 'string':
                return val.length = 0;
            case 'object':
                return (val === null || Object.keys(val).length == 0);
            case 'array':
                return val.length = 0
            default:
                return false;
        }
    }

    writeCacheInMemory(cacheKey, cacheValue) {
        if (this._validEntryName(cacheKey)) {
            _cacheEntries[cacheKey].value = cacheValue;

        } else {
            throw new Error('Cache key is not supported');
        }
    }

    writeCacheToFile(cacheKey, cacheValue) {
        if (this._validEntryName(cacheKey)) {
            let filePath = _cacheEntries[cacheKey].path;
            fs.writeFile(filePath, JSON.stringify(cacheValue), 'utf-8', (err) => {
                if (err)  console.error(err); 
            });
        } else {
            throw new Error('Cache key not supported');
        }
    }

    /**
     * Simple function to verify if a cache file exists for the provided key
     * @param {String} cacheKey cache key to check
     */
    readCacheFromMemory(cacheKey) {

        return new Promise((resolve, reject) => {
            if (this._validEntryName(cacheKey) &&
                Object.keys(_cacheEntries[cacheKey].value).length !== 0) {
                resolve(_cacheEntries[cacheKey].value);
            } else {
                reject({});
            }
        })
    }

    /**
     * Simple function to read cache content from a file
     * @param {String} cacheKey cache key to check
     */
    readCacheFromFile(cacheKey) {
        return new Promise((resolve, reject) => {
            if (this._validEntryName(cacheKey)) {
                let filePath = _cacheEntries[cacheKey].path;
                fs.readFile(filePath, function(err, content) {
                    if (err) {
                        reject(err);
                    } else if (!content || content.length == 0) {
                        reject(new Error("Cache content is empty or undefined", content))
                    } else {
                        resolve(JSON.parse(content));
                    }
                });
            } else {
                reject(new Error('No cache entry exist for key ' + cacheKey));
            }
        });
    }

}

const cache = new Cache();
Object.freeze(cache);
module.exports = cache;
