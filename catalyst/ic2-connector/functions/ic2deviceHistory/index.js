"use strict"

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');
require('dotenv').config();
const {  
    getZohoAccessToken, 
    searchZohoRecords, 
    getZohoRecordById,
	zohoCoqlSearch,
	createZohoRecord,
	updateZohoRecord
} = require('./zoho-helper.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    //console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw body:', req.body);
    next();
});

app.post('/updateHistory', async (req, res) => {
    try {
		const catalystApp = catalyst.initialize(req);
		const sn = req.body.Serial_Number;
		const updateMap = req.body;
		console.log(`Serial: ${sn} - Data: ${JSON.stringify(updateMap)}`);
		// Search for existing record
		const zohoToken = await getZohoAccessToken(catalystApp);
		const queryString = `(Serial_Number:equals:${sn})`;
		const searchResponse = await searchZohoRecords(zohoToken, 'Vendors', queryString);
		//console.log(searchResponse);

		let crmId;

		if (searchResponse.data) {
			// Update existing record
			crmId = searchResponse.data[0].id;
			updateMap.id = crmId;
			console.log(`Found existing record ${crmId}, updating... ${JSON.stringify(updateMap)}`);
			await updateZohoRecord(zohoToken, 'Vendors', updateMap);
		} else {
			// Create new record
			console.log(`No existing record found, creating... ${JSON.stringify(updateMap)}`);
			const createResponse = await createZohoRecord(zohoToken, 'Vendors', updateMap);
			crmId = createResponse.data[0].details.id; // Adjust based on your createZohoRecord response structure
		}

		res.send({ 'sn': sn, 'jsonData': updateMap });
	}
	catch(e) {
		//console.log(req);
		console.log(e);
		res.send({"error" : e});
	}
});

app.all("/", (req,res) => {

	res.status(200).send("I am Live and Ready.");

});

module.exports = app;
