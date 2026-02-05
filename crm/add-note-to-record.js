try 
{
	// ============================
	// LOG A NOTE TO THE RECORD
	// ============================
	recordId = liId;
	moduleName = "Line_Items";
	noteContent = noteMessage;
	// LOG NOTE
	noteUrl = "https://www.zohoapis.com/crm/v8/" + moduleName + "/" + recordId + "/Notes";
	updateParams = Map();
	noteParams = Map();
	parentId = Map();
	parentId.put("module",{"api_name":moduleName});
	parentId.put("id",recordId);
	noteParams.put("Parent_Id",parentId);
	noteParams.put("Note_Content",noteContent.toString());
	updateParams.put("data",{noteParams});
	postNotes = invokeurl
	[
		url :noteUrl
		type :POST
		parameters:updateParams.toString()
		connection:"zcrm"
	];
	info postNotes;
}
catch (e)
{
    //ERROR BLOCK
	info e;
}