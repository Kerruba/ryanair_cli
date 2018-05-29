const request = require('superagent');
const cache = require('./cache');
const winston = require('winston');

const logger = winston.createLogger({
	transport: [
		new winston.transports.Console()
	]
})

/**
 * Promisify a requrest
 * @param {String} url
 * @param {Object} params params to pass to the request
 */
function makeRequest(url, params) {
    return new Promise((resolve, reject) => {
        request
            .get(url)
            .query(params)
            .set('Accept', 'application/json')
            .end((err, res) => {
                if (err) {
                    reject(err, res);
                }
                resolve(res);
            });
    });
}

/**
 * Check flights availability using ryanair app
 * @param {*} params
 */
function availability(params) {
    const url = params.hasOwnProperty('apikey')
        ? 'https://apigateway.ryanair.com/pub/v1/reservations/Availability'
        : 'https://desktopapps.ryanair.com/v4/it-it/availability';

    return makeRequest(url, params);
}

function aggregates(params) {
    const url = params.hasOwnProperty('apikey')
        ? ''
        : 'https://api.ryanair.com/aggregate/4/common';

    // Read in memory cache if available
    // if not available try to read file cache
    // if not available, do the request
    return cache
        .readCacheFromMemory('aggregates')
        .then(inMemoryCache => {
            return {
                body: inMemoryCache,
                cached: true,
            };
        })
        .catch(err => {
			logger.debug('No in-memory cached value for aggregates is available', {
				'error': err
			});
            return cache.readCacheFromFile('aggregates');
        })
        .then(fileCache => {
            cache.writeCacheInMemory('aggregates', fileCache);
            return {
                body: fileCache,
                cached: true,
            };
        })
        .catch(err => {
			logger.debug('No file cached value for aggregates is available', {
				'error': err
			});
            params = Object.assign({}, params, {
                embedded: [
                    'airports',
                    'countries',
                    'cities',
                    'regions',
                    'nearbyAirports',
                ],
            });
            return makeRequest(url, params);
        })
        .then(res => {
            if (!res.hasOwnProperty('cached')) {
                cache.writeCacheInMemory('aggregates', res.body);
                cache.writeCacheToFile('aggregates', res.body);
            }
            return res;
        });
}

module.exports = {
    availability,
    aggregates,
};
