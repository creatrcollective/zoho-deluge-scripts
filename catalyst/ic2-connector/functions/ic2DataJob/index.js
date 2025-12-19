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

module.exports = async (jobRequest, context) => {
	console.log('Hello from index.js');

	// function input: { job_details: { job_meta_details: { params: { key: 'value' } } } }

	/**
	 * JOB REQUEST FUNCTIONALITIES
	 */

	//const projectDetails = jobRequest.getProjectDetails(); // to get the current project details
	//const jobDetails = jobRequest.getJobDetails(); // to get the current job details
	//const jobMetaDetails = jobRequest.getJobMetaDetails(); // to get the current job's meta details
	//const jobpoolDetails = jobRequest.getJobpoolDetails(); // to get the current function job pool's details
	//const getJobCapacityAttributes = jobRequest.getJobCapacityAttributes(); // to get the current jobs capacity
	//const allJobParams = jobRequest.getAllJobParams(); // to get all the parameters supplied to the job function
	//const jobParam = jobRequest.getJobParam('key'); // to get the value of a particular parameter supplied to the job function

    const catalystApp = catalyst.initialize(context);
	

	//MAPPING VARIABLE
	const icTwoFieldNameMap = {"id" : "IC2_Id", "group_id" : "IC2_Group_Id", "sn":"Serial_Number", "name" : "Vendor_Name", "product_code":"Product_Code","hardware_version":"Hardware_Revision","tags":"Tag(s)","uptime":"Uptime","onlineStatus":"Online","first_appear":"First_Appeared","expiry_date":"Subscription_Expiry_Date","wtp_ip":"IP_Address","interfaces.sims.imsi":"IMSI","interfaces.sims.iccid":"ICCID","imei":"IMEI","carrier_name":"Carrier","carrier_settings":"Carrier_Settings","apn":"APN","username":"Username","password":"Password","radio_bands.radio_bands":"Band","radio_bands.channel":"Channel","last_online":"last_online","offline_at":"offline_at"};
	  try {
		// Get IC2 token
		const tokenUrl = 'https://api.ic.peplink.com/api/oauth2/token';
		const tokenOptions = {
		  headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		  }
		};
		const tokenPayload = {
		  client_id: process.env.IC2_CLIENT,
		  client_secret: process.env.IC2_SECRET,
		  grant_type: 'client_credentials',
		  redirect_uri: 'https://zoho.com'
		};

		console.log('Obtaining IC2 token...');
		const tokenResponse = await axios.post(tokenUrl, tokenPayload, tokenOptions);
		const accessToken = tokenResponse.data.access_token;
		console.log(`Obtained IC2 token: ${accessToken}`);

		// Get IC2 device data
		console.log('Fetching IC2 device data. This could take several minutes...');
		const ic2Url = `https://api.ic.peplink.com/rest/o/Gk6AHw/d/basic?access_token=${accessToken}`;
		const ic2Response = await axios.get(ic2Url);

		if (ic2Response.data.resp_code !== 'SUCCESS') {
		  throw new Error(`IC2 API error: ${ic2Response.data.resp_code}`);
		}

		const assetList = ic2Response.data.data;
		console.log(`Retrieved ${assetList.length} assets from IC2`);

		if (assetList.length === 0) {
			console.log('no records');
			context.closeWithSuccess();
		  //return res.json({ message: 'No assets found', processed: 0 });
		}

		// Get Zoho token
		const zohoToken = await getZohoAccessToken(catalystApp);
		console.log(`Got Zoho token: ${zohoToken}`);

		// Process assets sequentially
		const results = await processAssetsSequentially(assetList);

		context.closeWithSuccess();
		//res.json({
		//  message: 'Processing complete',
		//  total: assetList.length,
		//  processed: results.processed,
		//  created: results.created,
		//  errors: results.errors
		//});

	  } catch (e) { 
		 console.error('Error in /update:', e);  // Log the full error object
	  console.error('Error message:', e.message);
	  console.error('Error response:', e.response?.data);
	  //res.status(500).json({ error: e.message || 'Unknown error' });
		  context.closeWithFailure();
	  }

	async function processAssetsSequentially(assetList) {
	  const ic2FieldNames = Object.keys(icTwoFieldNameMap);
	  const results = {
		processed: 0,
		created: 0,
		errors: 0
	  };

		const DELAY_BETWEEN_REQUESTS = 200; // ms between API calls

	  for (let i = 0; i < assetList.length; i++) {
		const asset = assetList[i];
		  console.log(asset);
		const sn = asset.sn;

		console.log(`Processing ${i + 1}/${assetList.length}: ${sn}`);

		// Build update map from IC2 fields
		const updateMap = {};
		for (const fieldName of ic2FieldNames) {
		  const responseData = asset[fieldName];
		  if (responseData !== undefined) {
			const crmFieldName = icTwoFieldNameMap[fieldName];
			if(crmFieldName == "Uptime" || crmFieldName == "IC2_Id" || crmFieldName == "IC2_Group_Id") {
				updateMap[crmFieldName] = String(responseData);
			}
			else {
				  updateMap[crmFieldName] = responseData;
			}
		  }
		}

		try {
			//TRY CATALYST JOB POOL
			// create webhook job
			console.log('trying job pool');
			const jobScheduling = catalystApp.jobScheduling(); // get job scheduling instance
			const webhookJob = await jobScheduling.JOB.submitJob({
			job_name: 'testjob', // set a name for the job
			jobpool_name: 'testwebhook', // set the name of the Webhook jobpool where the job should be submitted
			target_type: 'Webhook', // set the target type as Webhook for webhook jobs
			request_method: 'POST', // set the webhook request's method
			url: 'https://ic2connector-848081271.development.catalystserverless.com/server/ic2deviceHistory/updateHistory', // set the webhook request's url
			//params: {
			//arg1: 'test',
			//arg2: 'job'
			//}, // set the webhook request's query params (optional)
			headers: {
			'Content-Type': 'application/json'
			}, // set the webhook request's headers (optional)
			request_body: JSON.stringify(updateMap), // set the webhook request's body (optional)
			job_config: {
			number_of_retries: 2, // set the number of retries
			retry_interval: 2 * 60 // set the retry  interval
			} // set job config - job retries => 2 retries in 15 mins (optional)
			});
		  await delay(DELAY_BETWEEN_REQUESTS);


		} catch (e) {
			console.log(e);
		  results.errors++;

			await delay(DELAY_BETWEEN_REQUESTS);
	  //    }
		}
	  }

	  return results;
	}

	function delay(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}
};
