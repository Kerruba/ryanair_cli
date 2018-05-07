var request = require("superagent");
const baseUrl = "https://desktopapps.ryanair.com/v4/it-it/availability";

exports.checkAvailability = function(params) {

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
