const api = require("../api.js")
const apiKey = process.env.RYANAIR_APIKEY;
const utilities = require('../utilities.js');
const jclrz = require("json-colorz");
const winston = require("winston");

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

    api.availability(params)
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

module.exports = {
    fares
}
