# Zoho Catalyst IC2 Device Connector

## Configuring in Catalyst
- ic2DataJob function is setup as a cron function
- ic2DeviceHistory function is setup as an Advanced I/O Function

## Configuring IC2
- you'll need the API documentation found here: https://incontrol2.peplink.com/api/ic2-api-doc

## Zoho API Scopes
- you'll need credentials for ZohoCRM.modules.ALL,ZohoCRM.coql.READ

## Zoho Configuration
- in your CRM, you'll need all the fields that are being synced from IC2 in an "Assets" module. In particular you'll need IC2_Id and IC2_Group_Id to get the detailed"Device History" from IC2

You'll also need the following deluge script.
- Trigger: Whenever an Asset is updated
- Filter: All Assets

### Deluge Script
```
void automation.IC2_Update_Asset_History(Int assetId)
{
CLIENT_ID = "your-client-id";
CLIENT_SECRET = "your-client-secret";
REDIRECT_URL = "your-redirect-url";
asset = zoho.crm.getRecordById("Assets",assetId);
ic2Id = asset.get("IC2_Id");
ic2GroupId = asset.get("IC2_Group_Id");
//Generate IC2 Access Token
apiIcTwoParamsMapOne = Map();
apiIcTwoParamsMapOne.put("client_id",CLIENT_ID);
apiIcTwoParamsMapOne.put("client_secret",CLIENT_SECRET);
apiIcTwoParamsMapOne.put("grant_type","client_credentials");
apiIcTwoParamsMapOne.put("redirect_uri",REDIRECT_URL);
apiIcTwoHeadersMapOne = Map();
apiIcTwoHeadersMapOne.put("Content_Type","application/x-www-form-urlencoded");
accessIcTwoTokenApiResponse = invokeurl
[
	url :"https://api.ic.peplink.com/api/oauth2/token"
	type :POST
	parameters:apiIcTwoParamsMapOne
	headers:apiIcTwoHeadersMapOne
];
accessToken = accessIcTwoTokenApiResponse.get("access_token");
icTwoParamsMapOne = Map();
icTwoParamsMapOne.put("access_token",accessToken);
icTwoApiResponseTwo = invokeurl
[
	url :"https://api.ic.peplink.com/rest/o/Gk6AHw/g/" + ic2GroupId + "/d/" + ic2Id + "/online_history"
	type :GET
	parameters:icTwoParamsMapOne
];
historyData = icTwoApiResponseTwo.get("data");
ic2DeviceHistoryRecs = zoho.crm.searchRecords("IC2_Device_History","(Asset:equals:" + assetId + ")");
if(ic2DeviceHistoryRecs != null)
{
	offlineTimeList = List();
	for each  ic2DeviceHistoryRec in ic2DeviceHistoryRecs
	{
		offlineTimeOldVal = ic2DeviceHistoryRec.get("offline_time");
		offlineTimeNewVal = offlineTimeOldVal.subText(0,19);
		offlineTimeList.add(offlineTimeNewVal);
	}
}
for each  historyItem in historyData
{
	onlineTime = historyItem.get("online_time");
	offlineTime = historyItem.get("offline_time");
	duration = historyItem.get("duration");
	durationInSeconds = historyItem.get("duration_in_second");
	historyItemMap = Map();
	historyItemMap.put("Name","History Tracking");
	historyItemMap.put("online_time",onlineTime);
	historyItemMap.put("offline_time",offlineTime);
	historyItemMap.put("Offline_Time_Text",offlineTime.toString());
	historyItemMap.put("duration",duration);
	historyItemMap.put("duration_in_second",durationInSeconds);
	historyItemMap.put("Asset",assetId);
	if(offlineTimeList != null)
	{
		offlineTimeExists = offlineTimeList.contains(offlineTime);
		info offlineTimeExists;
		if(offlineTimeExists)
		{
			info "Nothing will happen here";
		}
		else if(offlineTime != null)
		{
			ic2DeviceHistoryCreatedRec = zoho.crm.createRecord("IC2_Device_History",historyItemMap);
			info ic2DeviceHistoryCreatedRec;
		}
	}
}
}
```