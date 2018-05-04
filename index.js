#!/usr/bin/env node --harmony
// var co = require('co');
var jsonata = require('jsonata');
var jclrz = require('json-colorz');
// var prompt = require('co-prompt');
var program = require('commander');
var request = require('superagent');

const base_url = 'https://desktopapps.ryanair.com/v4/it-it/availability';
const jsonata_filter = jsonata(
    `(
        $curr := currency; 
        trips.dates.flights.
            {
                'date': $substringBefore(time[0], 'T'),
                'departure': $substringAfter(time[0],'T') ~> $substringBefore('.'), 
                'arrival': $substringAfter(time[1],'T') ~> $substringBefore('.'), 
                'price': regularFare.fares.publishedFare & ' ' & $curr,
                'duration': duration
            }^(price)
    )`);
const comparison_methods = {
    "<=": function(x, y) { return x <= y},
    ">=": function(x, y) { return x >= y},
    ">": function(x, y) { return x > y},
    "<": function(x, y) { return x < y},
    "=": function(x, y) { return x === y},
    "==": function(x, y) { return x === y},
    "!=": function(x, y) { return x !== y},
}

// Read arguments
program
    .option('-a, --arrival <filter>', 'Filter flights arrival time. Accepts format "[<=>]{time}',  timeFilter)
    .option('-d, --departure <filter>', 'Filter flight departure time. Accepts format "[<=>]{time}"', timeFilter)
    // .option('-p, --price <filter>', 'Filter flights price. Accepts format "[<=>{price}]"', priceFilter)
    .arguments('<from> <to> <date>')
    .action(action)
    .parse(process.argv);


function action(from, to, date, opt) {
    if (typeof from === 'undefined') {
        console.error('no from has been provided!')
        process.exit(1);
    }

    if (typeof to === 'undefined') {
        console.error('no to has been provided!')
        process.exit(1);
    }
    if (typeof date === 'undefined') {
        console.error('no date has been provided!')
        process.exit(1);
    }

    // let filterTime;
    // if (typeof time === 'undefined') {
    //     console.log('Checking flights from %s to %s on date %s', from, to, date)
    // } else {
    //     console.log('Checking flights from %s to %s on date %s @ %s', from, to, date, time)    
    // }

    let params = {
        'DateOut': date,
        'Destination': to,
        'Origin': from,
        'ToUs': 'AGREED'
        // 'FlexDaysOut': 4
        // 'IncludeConnectingFlights: true
        // 'TEEN': 0,
        // 'exists': true,
        // 'promoCode: ''
    }


    request
        .get(base_url)
        .query(params)
        .set('Accept', 'application/json')
        .end((err, res) => {
            if (err) {
                console.error('An error occurred while retrieving dates', err)
                process.exit(1)
            }

            let results = jsonata_filter.evaluate(res.body);

            if (opt.departure) {
                results = filter_by_time_obj(results, 'departure', opt.departure);
            }

            if (opt.arrival) {
                results = filter_by_time_obj(results, 'arrival', opt.arrival);
            }

            jclrz(results);
        });

}

function timeFilter(str) {
    const time_filter_regex = /([>=<]{1,2})(\d{2}:\d{2}(?::\d{2})?)/
    if (time_filter_regex.test(str)) {
        parts = time_filter_regex.exec(str);
        return {
            "method": parts[1],
            "time": parts[2]
        }
    } else {
        throw new Error('Provided filter doesn\'t match the pattern')
    }
}

function priceFilter(str) {
    const price_regex = /([>=<]{1,2})(\d{2}:\d{2}(?::\d{2})?)/
    if (time_filter_regex.test(str)) {
        parts = time_filter_regex.exec(str);
        return {
            "method": parts[1],
            "time": parts[2]
        }
    } else {
        throw new Error('Provided filter doesn\'t match the pattern')
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
        date_to_filter = Date.parse(`01/01/1970 ${val[property]}`)
        date_reference = Date.parse(`01/01/1970 ${time_obj.time}`)
        return comparison_methods[time_obj.method](date_to_filter, date_reference)
    })
}
