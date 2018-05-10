#!/usr/bin/env node --harmony
// var co = require("co");
// var prompt = require("co-prompt");
var utilities = require('./utilities.js')
var jclrz = require("json-colorz");
var program = require("commander");
var api = require('./api.js');
var apiKey = process.env.RYANAIR_APIKEY;
// var request = require("superagent");



// Read arguments
program
	.option("-a, --arrival <filter>", "Filter flights arrival time. Accepts format [<=>]{time}",  utilities.timeFilter)
	.option("-d, --departure <filter>", "Filter flight departure time. Accepts format [<=>]{time}", utilities.timeFilter)
	.option("-p, --price <filter>", "Filter flight price. Accepts format [<=>]{price}", utilities.priceFilter)
	.option("-f, --flexdays <days>", "Define flexibily days for flight search", parseInt)
	.option("-o, --output <path>", "Append the results to a file")
	.option("--sort [method]", "Sort results (date|price)", /^(date|price)/, "date")
	.option("--order [order]", "Sorting order (asc|desc)", /^(asc|desc)/, "asc")
	// .option("-p, --price <filter>", "Filter flights price. Accepts format "[<=>{price}]"", priceFilter)
	.arguments("<from> <to> <date>")
	.action(action)
	.parse(process.argv);


function action(from, to, date, opt) {
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


	api.checkAvailability(params)
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
