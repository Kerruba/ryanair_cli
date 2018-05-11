var request = require("superagent");

/**
 * Promisify a requrest 
 * @param {String} url 
 * @param {Object} params params to pass to the request
 */
function makeRequest(url, params) {

	return new Promise((resolve, reject) =>{
		request
			.get(url)
			.query(params)
			.set("Accept", "application/json")
			.end((err, res) => {
				if (err) {
					reject(err, res);
				}
				resolve(res);
			});
	});

}

/**
 * Check flights availability using ryanair app
 * @param {*} params 
 */
function availability(params) {
	
	const url = params.hasOwnProperty('apikey') ? 
		"https://apigateway.ryanair.com/pub/v1/reservations/Availability" :
		"https://desktopapps.ryanair.com/v4/it-it/availability";

	return makeRequest(url, params);

}

function aggregates(params) {

	const url = params.hasOwnProperty('apikey') ?
		"" :
		"https://api.ryanair.com/aggregate/4/common?embedded=airports,countries,cities,regions,nearbyAirports,defaultAirport&market=en-gb"

	
	return makeRequest(url, params);
}

module.exports = {
	availability,
	aggregates
}
