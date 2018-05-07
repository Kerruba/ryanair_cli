let should = require('chai').should();
let utilities = require('../lib/utilities.js')

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
    
})
