const apiKey = process.env.RYANAIR_APIKEY;
const utilities = require('./utilities');
const strEIC = utilities.strEqualIgnoreCase;
const jclrz = require('json-colorz');
const api = require('./api.js');
const winston = require('winston');

const logger = winston.createLogger({
    transports: [new winston.transports.Console()],
});

function genericErrorHandler(err, res) {
    if (typeof res !== 'undefined' && typeof res.body.message === 'string') {
        logger.error(
            'An error occurred while retrieving the reusults: ',
            res.body.message
        );
    } else {
        logger.error('An error occurred while retrieving dates', err);
    }
    process.exit(1);
}

function extractRoutes(airport, type = 'airport', aggregates) {
	let destAirports = airport.routes.filter(route => route.startsWith(type));
	let field = type === 'airport' ? 'iataCode' : 'cityCode';

    return destAirports.reduce((prev, curr) => {
        let [, val] = curr.split(':');

        let _dest = aggregates.airports.filter(air => strEIC(air[field],val))[0];
        let city = aggregates.cities
            .filter(_city => _city.code === _dest.cityCode)
            .map(_city => _city.name)[0];

        let country = aggregates.countries
            .filter(_country => _country.code === _dest.countryCode)
            .map(_country => _country.name)[0];

        let airport = {
            airport: _dest.name,
            code: _dest.iataCode,
        };

        if (!prev[country]) prev[country] = {};

        if (!prev[country][city]) prev[country][city] = [];

        prev[country][city].push(airport);
        return prev;
    }, {});
}

/**
 * Return the flights available on a one way jurney between 2 airport
 * @param {String} from The departure airport
 * @param {String} to The arrival airport
 * @param {String} date The date of depature (format yyyy-mm-dd)
 * @param {Object} opt Optional parameters
 */
function fares(from, to, date, opt) {
    if (typeof from === 'undefined') {
        logger.error('no from has been provided!');
        process.exit(1);
    }

    if (typeof to === 'undefined') {
        logger.error('no to has been provided!');
        process.exit(1);
    }
    if (typeof date === 'undefined') {
        logger.error('no date has been provided!');
        process.exit(1);
    }

    if (typeof opt.flexdays !== 'undefined') {
        if (opt.flexdays > 6 || opt.flexdays < 0) {
            logger.error('flexdays option should be a number between 0 and 6');
            process.exit(1);
        }
    }

    let params = {
        DateOut: date,
        Destination: to,
        Origin: from,
        ToUs: 'AGREED',
        // "IncludeConnectingFlights: true
        // "TEEN": 0,
        // "exists": true,
        // "promoCode: ""
    };

    if (apiKey) {
        params = Object.assign({}, params, { apikey: apiKey });
    }

    if (opt.flexdays) {
        params = Object.assign({}, params, { FlexDaysOut: opt.flexdays });
    }

    api
        .availability(params)
        .then(res => {
            let results = utilities.extractFlights(res.body);

            if (typeof results === 'undefined' || results.length == 0) {
                logger.warn(
                    "Sorry! Looks like there's no result available for the provided options!"
                );
                process.exit(0);
            }

            results = utilities.sort(results, opt.sort, opt.order);

            if (opt.departure) {
                results = utilities.filterByTimeObj(
                    results,
                    'departure',
                    opt.departure
                );
            }

            if (opt.arrival) {
                results = utilities.filterByTimeObj(
                    results,
                    'arrival',
                    opt.arrival
                );
            }

            if (opt.price) {
                results = utilities.filterByPriceObj(results, opt.price);
            }

            jclrz(results);
        })
        .catch(genericErrorHandler);
}

/**
 * Get destinations from a specific aiport
 * @param {String} from the starting airport
 * @param {Object} opt set of options
 */
function routes(opt) {
    if (!opt.hasOwnProperty('from') && !opt.hasOwnProperty('to')) {
        logger.error(
            'At least one option between --from and --to need to be provided'
        );
        process.exit(1);
    }

    let params = {
        // "embedded": ["airports","countries","cities","regions","nearbyAirports"],
        // "embedded": ["airports"],
        market: opt.hasOwnProperty('market') ? opt.market : 'en-gb',
    };
    api
        .aggregates(params)
        .then(res => {
            let results = res.body;
            let origin = null;
            let dest = null;

            if (opt.hasOwnProperty('from')) {
                let [fromType, fromValue] = [
                    opt.from['type'],
                    opt.from['value'],
                ];
                origin = { type: fromType };
                switch (fromType) {
                    case 'country':
                        logger.warn(
                            'Look for routes from a country is not an available feature at the moment'
                        );
                        process.exit(1);

                    case 'airport':
                        let field = /^[A-Z]{3}$/.test(fromValue)
                            ? 'iataCode'
                            : 'name';

                        origin.values = results.airports.filter(val =>
                            utilities.strEqualIgnoreCase(val[field], fromValue)
                        );
                        if (
                            typeof origin !== 'undefined' &&
                            origin.length == 0
                        ) {
                            logger.error(
                                `No ${fromType} found with name ${fromValue}`
                            );
                            process.exit(1);
                        }
                        break;
                    case 'city':
                        origin.values = results.airports.filter(val =>
                            strEIC(val.cityCode, fromValue)
                        );
                        break;
                    default:
                        throw new Error(
                            `${fromType} is not recognized as a possible origin type`
                        );
                }
            }

            if (opt.hasOwnProperty('to')) {
                switch (opt.from['type']) {
                    case 'country':
                    case 'airport':
                    case 'city':
                    default:
                        break;
                }
            }

            if (typeof origin !== 'undefined' && origin.values.length >= 1) {
                let allRoutes = {};
                for (let org of origin.values) {
                    allRoutes[org.name] = extractRoutes(
                        org,
                        origin.type,
                        results
                    );
                }
                jclrz(allRoutes);
            } else if (typeof dest !== 'undefined' && dest.values.length >= 1) {
            } else {
                // TODO: Need a better error description. Does it ever happens?
                throw new Error('Something went wrong!');
            }
        })

        .catch(genericErrorHandler);
}

module.exports = {
    fares,
    routes,
};
