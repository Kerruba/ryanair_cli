let jsonata = require('jsonata');

function substringBefore(str, splitPoint) {
	let splitIndex = str.indexOf(splitPoint);
	if (splitIndex === -1) {
		return str;
	}
	return str.substring(0, splitIndex);
}

function substringAfter(str, splitPoint) {
	let splitIndex = str.indexOf(splitPoint);
	if (splitIndex === -1) {
		return str;
	}
	return str.substring(splitIndex + 1, str.length);
}

exports.jsonataFilter = jsonata(
	`(
		$curr := currency; 
		trips.dates.flights[].
			{
				"date": $substringBefore(time[0], "T"),
				"departure": $substringAfter(time[0],"T") ~> $substringBefore("."), 
				"arrival": $substringAfter(time[1],"T") ~> $substringBefore("."), 
				"price": regularFare.fares.publishedFare,
				"currency": $curr,
				"duration": duration
			}^(price)
	)`);


exports.comparisonMethods = {
	"<=": function(x, y) { return x <= y; },
	">=": function(x, y) { return x >= y; },
	">": function(x, y) { return x > y; },
	"<": function(x, y) { return x < y; },
	"=": function(x, y) { return x === y; },
	"==": function(x, y) { return x === y; },
	"!=": function(x, y) { return x !== y; }
};

exports.sortMethods = {
	"date": function(x,y) { return new Date(x.date) - new Date(y.date); },
	"price": function(x,y) { return parseFloat(x.price) - parseFloat(y.price); }
}

exports.timeFilter = function(str) {
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

exports.priceFilter = function(str) {
	const price_regex = /^((?:>=|<=|>|<|==|!=))(\d+(?:[\.,]\d+)?)$/
	if (price_regex.test(str)) {
		let parts = price_regex.exec(str);
		return {
			"method": parts[1],
			"price": parseFloat(parts[2])
		}
	} else {
		throw new Error("Provided filter doesn\"t match the pattern")
	}

}

/**
 * 
 * @param {List} results 
 * @param {String} property 
 * @param {TimeObj} time_obj 
 */
exports.filterByTimeObj = function(results, property, time_obj) {
	return results.filter(val => {
		let date_to_filter = Date.parse(`01/01/1970 ${val[property]}`)
		let date_reference = Date.parse(`01/01/1970 ${time_obj.time}`)
		return exports.comparison_methods[time_obj.method](date_to_filter, date_reference)
	})
}

exports.filterByPriceObj = function(results, price_obj) {
	return results.filter(val => {
		let price_to_check = val.price;
		let price_reference = price_obj.price;
		return exports.comparison_methods[price_obj.method](price_to_check, price_reference)
	})
}

exports.strEqualIgnoreCase = function(str1, str2) {
	return str1.toUpperCase() === str2.toUpperCase();
}

exports.sort = function (obj, field, direction) {
	let sortedResults = Object.assign({},obj);
	if (sortedResults.length > 1) {
		sortedResults = obj.sort(sort_methods[field]);
		if (strEqualIgnoreCase(direction, "desc")) {
			sortedResults = sortedResults.reverse()
		}
	}
	return sortedResults;
}

exports.jsonataExtractFlights = function(resBody) {
    return exports.jsonataFilter.evaluate(resBody);
}

exports.extractFlights = function(resBody) {
	let currency = resBody["currency"];
	let items = [];
	for(let trip of resBody.trips) {
		for(let date of trip.dates) {
			for(let flight of date.flights) {
				for(let price of flight.regularFare.fares) {
					items.push({
						"date": substringBefore(flight.time[0],"T"),
						"departure": substringBefore(substringAfter(flight.time[0], "T"), "."),
						"arrival": substringBefore(substringAfter(flight.time[1],"T"), "."),
						"duration": flight.duration,
						"price": price.publishedFare,
						"currency": currency,
					});

				}
			}
		}
	}
	return items;
	// return resBody['trips'][0]['dates'][0]['flights'];
}
