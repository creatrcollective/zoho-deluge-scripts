//THIS IS A DELUGE FUNCTION
//INSTALLED IN CRM OR WHEREVER YOU'RE SENDING EMAIL NOTIFICATIONS
//SETUP THIS FUNCTION AS REST API-CALLABLE
//LINK TO CATALYST FUNCTION IN index.js
//CONTACTS MODULE SHOULD HAVE A CUSTOM [BOOLEAN] FIELD CALLED "Email_Notification_Opt_Out"

success = false;
logMessage = Map();
selectQuery = "SELECT id FROM Contacts WHERE Email='" + emailId + "'";
//info selectQuery;
queryParams = {"select_query":selectQuery};
contactResponse = invokeurl
[
	url :"https://www.zohoapis.com/crm/v8/coql"
	type :POST
	parameters:queryParams.toString()
	connection:"crm"
];
//info contactResponse;
try 
{
	contactId = contactResponse.get("data").get(0).get("id");
	logMessage.put("contact_id",contactId);
	//UPDATE CONTACT RECORD TO SHOW OPT OUT
	updateParams = {"Email_Notification_Opt_Out":true};
	updateResponse = zoho.crm.updateRecord("Contacts",contactId,updateParams);
	updateTime = updateResponse.get("Modified_Time");
	return {"unsubscribe_success":true,"updated_time":updateTime.toString()};
}
catch (e)
{
	return {"unsubscribe_success":false,"emailId":emailId};
}
return logMessage;