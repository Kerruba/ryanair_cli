let jsonata = require('jsonata');

const JSONATA_FIELD_EXTRACTOR = `
	$flights[].
	{
		"date": $substringBefore(time[0], "T"),
		"departure": $substringAfter(time[0],"T") ~> $substringBefore("."), 
		"arrival": $substringAfter(time[1],"T") ~> $substringBefore("."), 
		"price": regularFare.fares.publishedFare,
		"currency": $curr,
		"duration": duration
	}
`;

const JSONATA_FILTER = jsonata(
	`(
		$curr := currency; 
        $flights := trips.dates.flights;
        $flights ? ${JSONATA_FIELD_EXTRACTOR} : []
         
	)`
);



const comparisonMethods = {
	"<=": function(x, y) { return x <= y; },
	">=": function(x, y) { return x >= y; },
	">": function(x, y) { return x > y; },
	"<": function(x, y) { return x < y; },
	"=": function(x, y) { return x === y; },
	"==": function(x, y) { return x === y; },
	"!=": function(x, y) { return x !== y; }
};

const sortMethods = {
	"date": function(x,y) { return new Date(x.date) - new Date(y.date); },
	"price": function(x,y) { return parseFloat(x.price) - parseFloat(y.price); }
}

/**
 * Compare two strings ignoring case
 * 
 * @param {String} str1 
 * @param {String} str2 
 */
function strEqualIgnoreCase(str1, str2) {
	return str1.toUpperCase() === str2.toUpperCase();
}


/**
 * Extract time filter object from a string
 * 
 * @param {String} str 
 * @returns {Object}
 */
function timeFilter(str) {
	const time_filter_regex = /^((?:>=|<=|>|<|==|!=))(\d{2}:\d{2}(?::\d{2})?)$/;
	if (time_filter_regex.test(str)) {
		let parts = time_filter_regex.exec(str);
		return {
			"method": parts[1],
			"time": parts[2]
		}
	} else {
		throw new Error("Provided filter doesn\'t match the pattern")
	}
}

/**
 * Extract price filter object from a string
 * 
 * @param {String} str 
 * @returns {Object}
 */
function priceFilter(str) {
	const price_regex = /^((?:>=|<=|>|<|==|!=))(\d+(?:[\.,]\d+)?)$/
	if (price_regex.test(str)) {
		let parts = price_regex.exec(str);
		return {
			"method": parts[1],
			"price": parseFloat(parts[2])
		}
	} else {
		throw new Error("Provided filter doesn\'t match the pattern");
	}

}

function routeFilter(str) {
	const routeRegex = /^(country|city|airport):([a-zA-Z ]+)$/
	if (routeRegex.test(str)) {
		let parts = routeRegex.exec(str);
		return {
			'type': parts[1],
			'value': parts[2]
		}
	} else {
		throw new Error('Provided filter doesn\'t match the pattern');
	}
}


/**
 * Filter object list using a time object
 * 
 * @param {List} results 
 * @param {String} property property to filter (arrival|departure)
 * @param {Object} time_obj time object
 * @returns {List}
 */
 function filterByTimeObj(results, property, time_obj) {
	return results.filter(val => {
		let date_to_filter = Date.parse(`01/01/1970 ${val[property]}`)
		let date_reference = Date.parse(`01/01/1970 ${time_obj.time}`)
		return comparisonMethods[time_obj.method](date_to_filter, date_reference)
	})
}

/**
 * Filter the list using a price object
 * 
 * @param {List} results 
 * @param {Object} price_obj price object
 */
function filterByPriceObj(results, price_obj) {
	return results.filter(val => {
		let price_to_check = val.price;
		let price_reference = price_obj.price;
		return comparisonMethods[price_obj.method](price_to_check, price_reference)
	})
}


/**
 * Sort list on the specified field using the specified direction
 * 
 * @param {Array} obj 
 * @param {String} field field to use for sorting purposes (price|date)
 * @param {String} direction direction to sort (asc|desc)
 * @returns {Array} the sorted results
 */
 function sort(obj, field, direction) {
	let sortedResults = Object.assign([],obj);
	if (sortedResults.length > 1) {
		sortedResults = obj.sort(sortMethods[field]);
		if (strEqualIgnoreCase(direction, "desc")) {
			sortedResults = sortedResults.reverse()
		}
	}
	return sortedResults;
}

/**
 * Extract flights details from the provided Object 
 * 
 * @param {Object} resBody 
 * @returns {List} list of results
 */
function extractFlights(resBody) {
	return JSONATA_FILTER.evaluate(resBody);
}

/**
 * Compare two object and check for equality
 * 
 * @param {object} obj1 
 * @param {object} obj2 
 * @param {object} options contains the options to use with the method
 * 
 * Compare two objects using all properties or specific properties defined 
 * in the options. 
 * In particular, the option can have an 'excluded' and an 'included' property,
 * each with an array of fields that need to be included or excluded in the comparison.
 * Specifically speaking for the included properties, the comparison is done only on 
 * the provided properties
 */

function matchObject(obj1, obj2, options = {}) {
    let excluded = options.hasOwnProperty('excluded')
        ? new Set(options.excluded)
        : new Set();
    let included = options.hasOwnProperty('included')
        ? new Set(options.included)
        : new Set();

    if (included.size == 0) {
        included = new Set(Object.getOwnPropertyNames(obj1));
        Object.getOwnPropertyNames(obj2).forEach(el => included.add(el));
    }

    for (let key of included) {
        if (!excluded.has(key)) {
            if (
                !(
                    obj1.hasOwnProperty(key) &&
                    obj2.hasOwnProperty(key) &&
                    obj1[key] === obj2[key]
                )
            ) {
                return false;
            }
        }
    }

    return true;
}

module.exports = {
	timeFilter,
	priceFilter,
	sort,
	filterByPriceObj, 
	filterByTimeObj, 
	extractFlights,
	strEqualIgnoreCase,
	routeFilter,
	matchObject

}
