const fs = require('fs');
const path = require('path');
const should = require('chai').should();
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

describe('Options', function() {
    describe('#timeFilters', function() {
        it('should convert >16:00 to timeFilter object', function() {
            let filterObject = utilities.timeFilter('>16:00');
            filterObject.should.be.deep.equal({'method': '>', 'time': '16:00'})
        })

       it('should generate an error for invalid time filter method', function() {
           (function() {
               utilities.timeFilter("><16:00");
           }).should.throw();
       })

       it('should generate an error for invalid time filter value', function() {
           (function() {
               utilities.timeFilter(">16.00");
           }).should.throw();
       })
    })

    describe("#priceFilters", function() {
        it('should convert >16.00 to timeFilter object', function() {
            let filterObject = utilities.priceFilter('==16.00');
            filterObject.should.be.deep.equal({'method': '==', 'price': 16})
        })

        it('should throw an error for invalid method compare method', function() {
            (function() {utilities.priceFilter('<>16.00') }).should.throw();
        })

        it('should throw an error for invalid price format', function() {
            (function() {utilities.priceFilter('==16..00') }).should.throw();
        })

    })

})

describe('Search', function() {

})

describe('Content', function() {
    var regularFlightsContent;
    var noFlightsContent;
    var flexFlightsContent;

    before(function(done) {
        readFile(flightsFile)
            .then((fileContent) => { regularFlightsContent = fileContent; })
            .then(() => { return readFile(noFlightsFile); })
            .then((fileContent) => { noFlightsContent = fileContent; })
            .then(() => { return readFile(flexFlightsFile)})
            .then(fileContent => { flexFlightsContent = fileContent})
            .then(() => done())
        }
    );
    
    describe("#contentExtract", function() {

        it('should return a list of 3 items when using test file', function() {
            utilities.extractFlights(regularFlightsContent).should.be.lengthOf(3);
        })

        it("should return an empty list when no flight is available", function() {
            utilities.extractFlights(noFlightsContent).should.be.lengthOf(0);
        })

        it("should return a list of 17 items when using test file with flex option", function() {
            utilities.extractFlights(flexFlightsContent).should.be.lengthOf(17);
        })

        it("should return an item with expected fields", function() {
            let expectedFields = ['date', 'departure', 'arrival', 'price', 'currency', 'duration'];
            let flights = utilities.extractFlights(regularFlightsContent)
            flights[0].should.have.deep.keys(expectedFields);
        })
        
        it("should return first flight date matching 2018-06-01", function() {
            let expectedDate = "2018-06-01";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.date.should.be.equal(expectedDate);
        })

        it("should return first flight departure matching 06:20:00", function() {
            let expectedDeparture = "06:20:00";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.departure.should.be.equal(expectedDeparture);
        })

        it("should return first flight arrival matching 09:20:00", function() {
            let expectedDeparture = "09:20:00";
            let checkingFlight = utilities.extractFlights(regularFlightsContent)[0];
            checkingFlight.arrival.should.be.equal(expectedDeparture);
        })
    })
})
