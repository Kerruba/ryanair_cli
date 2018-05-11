var apiKey = process.env.RYANAIR_APIKEY;
var utilities = require('./utilities')
var jclrz = require("json-colorz");
var api = require('./api.js');

/**
 * Return the flights available on a one way jurney between 2 airport
 * @param {String} from The departure airport
 * @param {String} to The arrival airport
 * @param {String} date The date of depature (format yyyy-mm-dd)
 * @param {Object} opt Optional parameters
 */
function fares(from, to, date, opt) {
	if (typeof from === "undefined") {
		console.error("no from has been provided!");
		process.exit(1);
	}

	if (typeof to === "undefined") {
		console.error("no to has been provided!");
		process.exit(1);
	}
	if (typeof date === "undefined") {
		console.error("no date has been provided!");
		process.exit(1);
	}

	if (typeof opt.flexdays !== "undefined") {
		if (opt.flexdays > 6 || opt.flexdays < 0) {
			console.error("flexdays option should be a number between 0 and 6");
			process.exit(1);
		}
	}


	let params = {
		"DateOut": date,
		"Destination": to,
		"Origin": from,
		"ToUs": "AGREED"
		// "IncludeConnectingFlights: true
		// "TEEN": 0,
		// "exists": true,
		// "promoCode: ""
	}

	if (apiKey) {
		params = Object.assign({}, params, { "apikey" : apiKey })
	}

	if (opt.flexdays) {
		params = Object.assign({}, params, { "FlexDaysOut" : opt.flexdays})
	}


	api.availability(params)
		.then((res) => {
			let results = utilities.extractFlights(res.body);

			if (typeof results === 'undefined' || results.length == 0) {
				console.warn("Sorry! Looks like there's no result available for the provided options!")
				process.exit(0);
			}
			

			results = utilities.sort(results, opt.sort, opt.order);

			if (opt.departure) {
				results = utilities.filterByTimeObj(results, "departure", opt.departure);
			}

			if (opt.arrival) {
				results = utilities.filterByTimeObj(results, "arrival", opt.arrival);
			}

			if (opt.price) {
				results = utilities.filterByPriceObj(results, opt.price);
			}

			jclrz(results);
		})
		.catch((err, res) => {
			if (typeof res !== "undefined" && 
				typeof res.body.message === "string") {
				console.error("An error occurred while retrieving the reusults: ", res.body.message)
			} else {
				console.error("An error occurred while retrieving dates", err);
			}
			process.exit(1);
		})
}

function destinations(from, opt) {
    return
}


module.exports = {
    fares,
    destinations
}
