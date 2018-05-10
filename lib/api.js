var apiKey = process.env.RYANAIR_APIKEY
var request = require("superagent");



/**
 * Check flights availability using ryanair app
 * @param {*} params 
 */
function checkAvailability(params) {
	
	const baseUrl = params.hasOwnProperty('apikey') ? 
		"https://apigateway.ryanair.com/pub/v1/reservations/Availability" :
		"https://desktopapps.ryanair.com/v4/it-it/availability";


	return new Promise((resolve, reject) =>{
		request
			.get(baseUrl)
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

module.exports = {
	checkAvailability
}
