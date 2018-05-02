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
                'time': $substringAfter(time[0],'T') ~> $substringBefore('.'), 
                'price': regularFare.fares.publishedFare & ' ' & $curr
            }^(price)
    )`);

// Read arguments
program
    .arguments('<from> <to> <date> [time]')
    .action(action)
    .parse(process.argv);


function action(from, to, date,time) {
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

    let filterTime;
    if (typeof time === 'undefined') {
        console.log('Checking flights from %s to %s on date %s', from, to, date)
    } else {
        console.log('Checking flights from %s to %s on date %s @ %s', from, to, date, time)    
    }

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
            // jclrz(extract_fares(res.body))
            results = jsonata_filter.evaluate(res.body);
            if (typeof time !== 'undefined') {
                results = results.filter(
                    val => 
                    Date.parse(`01/01/1970 ${val.time}`) >= Date.parse(`01/01/1970 ${time}`))
            }
            jclrz(results);
        });

}

function extract_fares(res) {
    let results = {
        'currency': res['currency']
    }

    let trip = res['trips'][0]
    trip_info = {
        'origin': trip['originName'],
        'destiantion': trip['destinationName'],
    }

    results = {...results, ...trip_info}

    return results;
}
