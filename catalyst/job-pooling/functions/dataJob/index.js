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

const catalystWebhookUrl = ''; //YOUR URL HERE
const catalystJobPoolName = 'testwebhook';
const DELAY_BETWEEN_REQUESTS = 200; // ms between API calls
let updateMap = {};

module.exports = async (jobRequest, context) => {
	console.log('Hello from index.js. Starting now...');

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

		try {
			//TRY CATALYST JOB POOL
			// create webhook job
			console.log('trying job pool');
			const jobScheduling = catalystApp.jobScheduling(); // get job scheduling instance
			const webhookJob = await jobScheduling.JOB.submitJob({
			job_name: 'testjob', // set a name for the job
			jobpool_name: catalystJobPoolName, // set the name of the Webhook jobpool where the job should be submitted
			target_type: 'Webhook', // set the target type as Webhook for webhook jobs
			request_method: 'POST', // set the webhook request's method
			url: catalystWebhookUrl, // set the webhook request's url
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


			await delay(DELAY_BETWEEN_REQUESTS);
	  //    }
		}
	function delay(ms) {
	  return new Promise(resolve => setTimeout(resolve, ms));
	}
};
