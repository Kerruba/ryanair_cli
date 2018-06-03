const _routes = require("./methods/routes_method");
const _fares = require("./methods/fares_method");

module.exports = {
    fares: _fares.fares,
    routes: _routes.routes
}
