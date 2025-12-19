'use strict';

const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
	const email = req.query.email;
	
	if (!email) {
		return res.status(400).send('Email parameter is required');
	}
	
	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return res.status(400).send('Invalid email format');
	}
	const formattedUrl = 'https://sandbox.zohoapis.com/crm/v7/functions/weathernotificationoptout/actions/execute?auth_type=apikey&zapikey=xxxxxxxxx0000xxxxxxx&emailId='+email;
	// Here you would typically render an unsubscribe confirmation page
	axios
  	.get(formattedUrl)
  	.then(function (response) {
    	console.log(response.data.details.output);
		console.log(typeof response.data.details.output)
		const success = JSON.parse(response.data.details.output).unsubscribe_success;
		if(success) {
			res.send(`The following email will be removed from our list: ${email}`);
		} else {
			res.send('something went wrong. Please contact Sentriforce or try again later.');
		}
		
  	});
	
});

module.exports = app;