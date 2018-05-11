const fs = require('fs');
const path = require('path');
const should = require('chai').should();
const assert = require('chai').assert;
const utilities = require('../lib/utilities.js');
const flightsFile = path.join(__dirname, "regular.json");
const noFlightsFile = path.join(__dirname, "noflights.json");
const flexFlightsFile = path.join(__dirname, "flexflights.json")

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf-8', (err, data) => {
            if (err) {
                reject(err)
            }
            resolve(JSON.parse(data));
        })
    })
}

describe('General', function () {
    describe('timeFilters', function () {
        it('should convert >16:00 to timeFilter object', function () {
            let filterObject = utilities.timeFilter('>16:00');
            filterObject.should.be.deep.equal({
                'method': '>',
                'time': '16:00'
            })
        })

        it('should generate an error for invalid time filter method', function () {
            (function () {
                utilities.timeFilter("><16:00");
            }).should.throw();
        })

        it('should generate an error for invalid time filter value', function () {
            (function () {
                utilities.timeFilter(">16.00");
            }).should.throw();
        })
    })

    describe("priceFilters", function () {
        it('should convert >16.00 to timeFilter object', function () {
            let filterObject = utilities.priceFilter('==16.00');
            filterObject.should.be.deep.equal({
                'method': '==',
                'price': 16
            })
        })

        it('should throw an error for invalid method compare method', function () {
            (function () {
                utilities.priceFilter('<>16.00')
            }).should.throw();
        })

        it('should throw an error for invalid price format', function () {
            (function () {
                utilities.priceFilter('==16..00')
            }).should.throw();
        })

    })

})

describe('Content required', function () {
    var regularFlightsContent;
    var noFlightsContent;
    var flexFlightsContent;

    before(function (done) {
        readFile(flightsFile)
            .then((fileContent) => {
                regularFlightsContent = fileContent;
            })
            .then(() => {
                return readFile(noFlightsFile);
            })
            .then((fileContent) => {
                noFlightsContent = fileContent;
            })
            .then(() => {
                return readFile(flexFlightsFile)
            })
            .then(fileContent => {
                flexFlightsContent = fileContent
            })
            .then(() => done())
    });

    describe('Search', function () {

        it('should return a flight with departure at 06:20 when filtering for flights leaving before 06:30', function() {
            let filteredFlights = utilities.filterByTimeObj(
                utilities.extractFlights(regularFlightsContent),
                'departure',
                { "method": "<=", "time": "06:30" }
            );
            filteredFlights.should.be.lengthOf(1)
            filteredFlights[0].should.include({"departure": "06:20:00"})
        })

        it('should return flights with price <= 50 when applying corresponding filter', function() {
            let filteredFlights = utilities.filterByPriceObj(
                utilities.extractFlights(regularFlightsContent),
                {"method": "<", "price": 50}
            );
            let allPrices = filteredFlights.map(flight => flight.price);
            allPrices.filter(f => f.price > 50).should.be.empty;
        })

        it('should return flights with arrival time >= 20:00 when applying the corresponding filter', function() {
            let filteredFlights = utilities.filterByTimeObj(
                utilities.extractFlights(regularFlightsContent), 
                'arrival', 
                {'method': '>', 'time': '20:00'}
            );
            filteredFlights.length.should.be.above(0);
            filteredFlights[0].arrival.should.be.equal('20:55:00');

        })

        it('should sort results by date asc', function() {
            let sortedFlights = utilities.sort(
                utilities.extractFlights(flexFlightsContent), 
                'date',
                'asc'
            )
            let flightDates = sortedFlights.map(flight => flight.date);
            for(let i=1, nDates = flightDates.length;
                    i < nDates;
                    i++) {

                assert(new Date(flightDates[i-1]) <= new Date(flightDates[i]));
            }

        })

        it('should sort results by price desc', function() {
            let sortedFlights = utilities.sort(
                utilities.extractFlights(flexFlightsContent), 
                'price',
                'desc'
            )
            let flightPrices = sortedFlights.map(flight => flight.price);
            for(let i=0, n = flightPrices.length;
                    i < n - 1 ;
                    i++) {

                assert(flightPrices[i] >= flightPrices[i+1], 'Price should be ordered in descending order');
            }

        })

    })

    describe('Extraction', function () {

        it('should return a list of 3 items when using test file', function () {
            utilities.extractFlights(regularFlightsContent).should.be.lengthOf(3);
        })

        it("should return an empty list when no flight is available", function () {
            utilities.extractFlights(noFlightsContent).should.be.lengthOf(0);
        })

        it("should return a list of 17 items when using test file with flex option", function () {
            utilities.extractFlights(flexFlightsContent).should.be.lengthOf(17);
        })

        it("should return an item with expected fields", function () {
            let expectedFields = ['date', 'departure', 'arrival', 'price', 'currency', 'duration'];
            let flights = utilities.extractFlights(regularFlightsContent)
            flights[0].should.have.deep.keys(expectedFields);
        })

        it("should return first flight date matching 2018-06-01", function () {
            let expectedDate = "2018-06-01";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.date.should.be.equal(expectedDate);
        })

        it("should return first flight departure matching 06:20:00", function () {
            let expectedDeparture = "06:20:00";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.departure.should.be.equal(expectedDeparture);
        })

        it("should return first flight arrival matching 09:20:00", function () {
            let expectedDeparture = "09:20:00";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.arrival.should.be.equal(expectedDeparture);
        })
    })

})
