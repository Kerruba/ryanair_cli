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

	//TODO: This is not taking into account the country at all
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

		let obj = {
			country: country,
			city: city,
			airport: airport.airport,
			airportCode: airport.code
		}

        // if (!prev[country]) prev[country] = {};
        // if (!prev[country][city]) prev[country][city] = [];
		// prev[country][city].push(airport);
		prev.push(obj);
        return prev;
    }, []);
}

function getAirportDetails(airport, aggregates) {

	let details = {};
	details.country = aggregates.countries
		.filter(_country => _country.code === airport.countryCode)
		.map(_country => _country.name)[0];

	details.city = aggregates.cities
		.filter(_city => _city.code === airport.cityCode)
		.map(_city => _city.name)[0];

	details.airport = airport.name;
	details.airportCode = airport.iataCode;
	details.routes = airport.routes;
	return details;

}


function matchObject(obj1, obj2, options = {}) {

	let excluded = options.hasOwnProperty('excluded') ? new Set(options.excluded) : new Set();
	let included = options.hasOwnProperty('included') ? new Set(options.included) : new Set();

	if (included.size == 0) {
		included = new Set(Object.getOwnPropertyNames(obj1));
		Object.getOwnPropertyNames(obj2).forEach(el => included.add(el));
	}

	for(let key of included) {
		if (!excluded.has(key)) {
			if (! (obj1.hasOwnProperty(key) &&
				   obj2.hasOwnProperty(key) &&
				   obj1[key] === obj2[key]) ) {
					   return false;
				   }
		}
	}

	return true;	
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
            let origin;
            let destination;

            if (opt.hasOwnProperty('from')) {
                let [fromType, fromValue] = [
                    opt.from['type'],
                    opt.from['value'],
                ];
				origin = { 
					type: fromType,
					values: []
				}

				// Extract airports based on from Type field
				let _airports = [];
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

                        _airports = results.airports.filter(val =>
                            utilities.strEqualIgnoreCase(val[field], fromValue)
                        );
                        if (
                            typeof _airports !== 'undefined' &&
                            _airports.length == 0
                        ) {
                            logger.error(
                                `No ${fromType} origin found with name ${fromValue}`
                            );
                            process.exit(1);
                        }
                        break;
                    case 'city':
                        _airports = results.airports.filter(val =>
                            strEIC(val.cityCode, fromValue)
                        );
                        if ( typeof _airports !== 'undefined' && _airports.length == 0) {
                            logger.error(
                                `No ${fromType} destination found with name ${fromValue}`
                            );
                            process.exit(1);
						}
						break;
                    default:
                        throw new Error(
                            `${fromType} is not recognized as a possible origin type`
                        );
				}

				for(let air of _airports) {
					origin.values.push(getAirportDetails(air, results));
				}
            }

            if (opt.hasOwnProperty('to')) {
                let [toType, toValue] = [
                    opt.to['type'],
                    opt.to['value'],
                ];
                destination = { 
					type: toType,
					values: []
				};

				let _airports = [];

                switch (toType) {
					case 'country':
						logger.warn(
							'Look for routes from a country is not an available feature at the moment'
						);
						process.exit(1);	

					case 'airport':
                        let field = /^[A-Z]{3}$/.test(toValue)
                            ? 'iataCode'
                            : 'name';

                        _airports = results.airports.filter(val =>
                            utilities.strEqualIgnoreCase(val[field], toValue)
                        );
                        if ( typeof _airports && _airports.length == 0) {
                            logger.error(
                                `No ${toType} destination found with name ${toValue}`
                            );
                            process.exit(1);
                        }
						break;
                    case 'city':
                        _airports = results.airports.filter(val =>
                            strEIC(val.cityCode, toValue)
                        );
                        if ( typeof _airports !== 'undefined' && _airports.length == 0) {
                            logger.error(
                                `No ${toType} destination found with name ${toValue}`
                            );
                            process.exit(1);
                        }
                        break;
					default:
						throw new Error(
							`${toType} is not recognized as a possible origin type`
						);
				}

				for(let air of _airports) {
					destination.values.push(getAirportDetails(air, results));
				}
            }


			if (typeof origin === 'undefined' && typeof destination === 'undefined') {
                throw new Error('Something went wrong while processing origin and destination options!');
			} 


			let allRoutes = [];

			if (typeof origin !== 'undefined' &&
				origin.values.length >= 1) {

                for (let org of origin.values) {
					let baseRoutes = extractRoutes( org, origin.type, results)
					let expandedRoutes = baseRoutes.map(r => {
						let elem = {};
						elem.origin = org;
						elem.destination = r;
						delete elem.origin.routes;
						return elem;
					});
					allRoutes = allRoutes.concat(expandedRoutes);
                }
			}
			
			if (typeof destination !== 'undefined' && 
				destination.values.length >= 1) {
				
				if (allRoutes.length > 0) {
					let _tempFilteredRoutes = [];
					for (let dest of destination.values) {
						let _filtered = allRoutes.filter(r => {
							return matchObject(r.destination, dest, {
								excluded: ['routes']
							})
						});				
						_tempFilteredRoutes = _tempFilteredRoutes.concat(_filtered);
					}
					allRoutes = _tempFilteredRoutes;
				} else {

					let _destination_routes = []
					for (let dest of destination.values) {
						let baseRoutes = extractRoutes( dest, destination.type, results)
						let expandedRoutes = baseRoutes.map(r => {
							let elem = {};
							elem.origin = r;
							elem.destination = dest;
							delete elem.destination.routes;
							return elem;
						});
						_destination_routes = _destination_routes.concat(expandedRoutes);
					}

					allRoutes = _destination_routes
				}
				jclrz(allRoutes);
			}
        })

        .catch(genericErrorHandler);
}

module.exports = {
    fares,
    routes,
};
