#!/usr/bin/env node --harmony
var co = require('co');
var prompt = require('co-prompt');
var program = require('commander');
var request = require('superagent');

const base_url = 'https://desktopapps.ryanair.com/v4/it-it/availability';

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
            process.stdout.write(JSON.stringify(res.body, null, 4));
        })

}
