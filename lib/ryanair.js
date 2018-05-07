#!/usr/bin/env node --harmony
// var co = require("co");
var jsonata = require("jsonata");
var jclrz = require("json-colorz");
// var prompt = require("co-prompt");
var program = require("commander");
var request = require("superagent");

const base_url = "https://desktopapps.ryanair.com/v4/it-it/availability";

const jsonata_filter = jsonata(
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

// const jsn_flight_filter = jsonata(
// 	`{
// 		"currency": currency,
// 		"flights": trips.dates.flights
// 	}`
// )

// const jsn_flight_extractor = jsonata(
// 	`{
// 		"date": $substringBefore(time[0], "T"),
// 		"departure": $substringAfter(time[0],"T") ~> $substringBefore("."), 
// 		"arrival": $substringAfter(time[1],"T") ~> $substringBefore("."), 
// 		"price": regularFare.fares.publishedFare,
// 		"duration": duration
// 	}^(price)
// 	`
// )

const comparison_methods = {
	"<=": function(x, y) { return x <= y; },
	">=": function(x, y) { return x >= y; },
	">": function(x, y) { return x > y; },
	"<": function(x, y) { return x < y; },
	"=": function(x, y) { return x === y; },
	"==": function(x, y) { return x === y; },
	"!=": function(x, y) { return x !== y; }
};

const sort_methods = {
	"date": function(x,y) { return new Date(x.date) - new Date(y.date); },
	"price": function(x,y) { return parseFloat(x.price) - parseFloat(y.price); }
};

// Read arguments
program
	.option("-a, --arrival <filter>", "Filter flights arrival time. Accepts format [<=>]{time}",  timeFilter)
	.option("-d, --departure <filter>", "Filter flight departure time. Accepts format [<=>]{time}", timeFilter)
	.option("-p, --price <filter>", "Filter flight price. Accepts format [<=>]{price}", priceFilter)
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

	if (opt.flexdays) {
		params = Object.assign({}, params, { "FlexDaysOut" : opt.flexdays})
	}


	request
		.get(base_url)
		.query(params)
		.set("Accept", "application/json")
		.end((err, res) => {
			if (err) {
				if (typeof res.body.message === "string") {
					console.error("An error occurred while retrieving the reusults: ", res.body.message)
				} else {
					console.error("An error occurred while retrieving dates", err);
				}
				process.exit(1);
			}

			let results = jsonata_filter.evaluate(res.body);
			// let results = jsn_flight_filter(res.body);

			if (typeof results === 'undefined' || results.length == 0) {
				console.warn("Sorry! Looks like there's no result available for the provided options!")
				process.exit(0);
			}
			

			results = sort(results, opt.sort, opt.order);

			if (opt.departure) {
				results = filter_by_time_obj(results, "departure", opt.departure);
			}

			if (opt.arrival) {
				results = filter_by_time_obj(results, "arrival", opt.arrival);
			}

			if (opt.price) {
				results = filter_by_price_obj(results, opt.price);
			}

			jclrz(results);
		});

}

function timeFilter(str) {
	const time_filter_regex = /([>=<]{1,2})(\d{2}:\d{2}(?::\d{2})?)/;
	if (time_filter_regex.test(str)) {
		let parts = time_filter_regex.exec(str);
		return {
			"method": parts[1],
			"time": parts[2]
		}
	} else {
		throw new Error("Provided filter doesn\"t match the pattern")
	}
}

function priceFilter(str) {
	const price_regex = /([>=<]{1,2})(\d+(?:[\.,]\d+)?)/
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
function filter_by_time_obj(results, property, time_obj) {
	return results.filter(val => {
		let date_to_filter = Date.parse(`01/01/1970 ${val[property]}`)
		let date_reference = Date.parse(`01/01/1970 ${time_obj.time}`)
		return comparison_methods[time_obj.method](date_to_filter, date_reference)
	})
}

function filter_by_price_obj(results, price_obj) {
	return results.filter(val => {
		let price_to_check = val.price;
		let price_reference = price_obj.price;
		return comparison_methods[price_obj.method](price_to_check, price_reference)
	})
}

function strEqualIgnoreCase(str1, str2) {
	return str1.toUpperCase() === str2.toUpperCase();
}

function sort(obj, field, direction) {
	let sortedResults = Object.assign({},obj);
	if (sortedResults.length > 1) {
		sortedResults = obj.sort(sort_methods[field]);
		if (strEqualIgnoreCase(direction, "desc")) {
			sortedResults = sortedResults.reverse()
		}
	}
	return sortedResults;
}
