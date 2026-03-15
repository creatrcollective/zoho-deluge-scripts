
organizationID = organization.get("organization_id");
testMode = false;
// Set to false to execute real FSM changes
createList = list();
updateList = list();
deleteList = list();
iterationList = {1,2,3,4,5,6,7,8,9,10};
// ======================
// GET INVENTORY ITEMS (paginated — max 10 pages x 200 = 2000 items)
// ======================
allInventoryItems = list();
inventoryDone = false;
for each  page in iterationList
{
	if(!inventoryDone)
	{
		inventoryResponse = invokeurl
		[
			url :"https://www.zohoapis.com/inventory/v1/items?organization_id=" + organizationID + "&status=active&per_page=200&page=" + page
			type :GET
			connection:"zohoinventory2"
		];
		pageItems = inventoryResponse.get("items");
		if(pageItems != null && pageItems.size() > 0)
		{
			allInventoryItems.addAll(pageItems);
			if(!inventoryResponse.get("page_context").get("has_more_page"))
			{
				inventoryDone = true;
			}
		}
		else
		{
			inventoryDone = true;
		}
	}
}
info "Total Inventory items fetched: " + allInventoryItems.size();
// ======================
// GET FSM GOODS (paginated — max 10 pages x 200 = 2000 items)
// ======================
allFsmItems = list();
fsmDone = false;
for each  fsmPage in iterationList
{
	if(!fsmDone)
	{
		fsmResponse = invokeurl
		[
			url :"https://fsm.zoho.com/fsm/v1/Service_And_Parts?page=" + fsmPage + "&per_page=200"
			type :GET
			connection:"fsm"
		];
		fsmPageItems = fsmResponse.get("data");
		if(fsmPageItems != null && fsmPageItems.size() > 0)
		{
			allFsmItems.addAll(fsmPageItems);
			if(!fsmResponse.get("info").get("more_records"))
			{
				fsmDone = true;
			}
		}
		else
		{
			fsmDone = true;
		}
	}
}
info "Total FSM items fetched: " + allFsmItems.size();
// ======================
// BUILD FSM LOOKUP MAP — SKU -> FSM record (Goods with SKU only)
// ======================
fsmBySkuMap = Map();
for each  fsmItem in allFsmItems
{
	if(fsmItem.get("Type") == "Goods")
	{
		fsmSku = fsmItem.get("SKU");
		if(fsmSku != null && fsmSku.toString().trim() != "")
		{
			fsmBySkuMap.put(fsmSku.toString().trim(),fsmItem);
		}
	}
}
// ======================
// BUILD INVENTORY SKU SET — for orphan detection
// ======================
inventorySkuSet = Map();
for each  invItem in allInventoryItems
{
	invSku = invItem.get("sku").toString().trim();
	if(invSku != "")
	{
		inventorySkuSet.put(invSku,true);
	}
}
// ======================
// MAIN LOOP — determine CREATE vs UPDATE
// Skip any Inventory item that has no SKU
// ======================
for each  invItem in allInventoryItems
{
	invSku = invItem.get("sku").toString().trim();
	// FILTER: skip items without a SKU (combos, test items, service lines, etc.)
	if(invSku == "")
	{
		continue;
	}
	invName = invItem.get("name").toString().trim();
	invDesc = invItem.get("description").toString().trim();
	invRate = invItem.get("rate");
	invUnit = "Each";
	// Normalize unit — "1" and "0" mean unitless in Inventory, map to null for FSM
	fsmUnit = invUnit;
	if(invUnit == "1" || invUnit == "0" || invUnit == "")
	{
		fsmUnit = null;
	}
	fsmPayload = Map();
	fsmPayload.put("Name",invName);
	fsmPayload.put("SKU",invSku);
	fsmPayload.put("Description",invDesc);
	fsmPayload.put("Unit_Price",invRate);
	fsmPayload.put("Unit",fsmUnit);
	fsmPayload.put("Type","Goods");
	fsmPayload.put("Work_Type",null);
	fsmPayload.put("Tax",{"Taxable":false,"Tax_Name":null,"Tax_Id":null,"Tax_Exemption_Id":null,"Tax_Exemption_Code":null});
	if(fsmBySkuMap.containsKey(invSku))
	{
		// --- POTENTIAL UPDATE ---
		existingFsm = fsmBySkuMap.get(invSku);
		fsmId = existingFsm.get("id").toString();
		existingName = existingFsm.get("Name").toString().trim();
		existingDesc = existingFsm.get("Description").toString().trim();
		existingPrice = existingFsm.get("Unit_Price");
		existingUnit = existingFsm.get("Unit");
		// Normalize nulls for comparison
		if(existingDesc == null)
		{
			existingDesc = "";
		}
		if(invDesc == null)
		{
			invDesc = "";
		}
		if(existingUnit == null)
		{
			existingUnit = "";
		}
		if(fsmUnit == null)
		{
			fsmUnit = "";
		}
		needsUpdate = false;
		changedFields = list();
		if(existingName != invName)
		{
			needsUpdate = true;
			changedFields.add("Name: '" + existingName + "' -> '" + invName + "'");
		}
		if(existingDesc.trim() != invDesc.trim())
		{
			needsUpdate = true;
			changedFields.add("Description changed");
		}
		if(existingPrice != invRate)
		{
			needsUpdate = true;
			changedFields.add("Unit_Price: " + existingPrice + " -> " + invRate);
		}
		if(existingUnit.toString().trim() != fsmUnit.toString().trim())
		{
			needsUpdate = true;
			changedFields.add("Unit: '" + existingUnit + "' -> '" + fsmUnit + "'");
		}
		if(needsUpdate)
		{
			fsmPayload.put("id",fsmId);
			updateList.add(fsmPayload);
			info "[UPDATE QUEUED] " + invName + " (SKU: " + invSku + ") | Changes: " + changedFields.toString();
		}
	}
	else
	{
		// --- CREATE ---
		createList.add(fsmPayload);
		info "[CREATE QUEUED] " + invName + " (SKU: " + invSku + ")";
	}
}
// ======================
// ORPHAN DETECTION
// FSM Goods with a SKU not in Inventory -> deleteList
// FSM Goods with no SKU are left alone (manually created, pre-existing)
// ======================
for each  fsmItem in allFsmItems
{
	if(fsmItem.get("Type") == "Goods")
	{
		fsmSku = fsmItem.get("SKU");
		if(fsmSku != null && fsmSku.toString().trim() != "")
		{
			if(!inventorySkuSet.containsKey(fsmSku.toString().trim()))
			{
				deleteList.add(fsmItem);
				info "[DELETE FLAGGED] " + fsmItem.get("Name") + " (SKU: " + fsmSku + ")";
			}
		}
	}
}
info "--- Sync plan ---";
info "Test Mode   : " + testMode;
info "Create : " + createList.size();
info "Update : " + updateList.size();
info "Delete : " + deleteList.size();
// ======================
// EXECUTE CREATES
// ======================
if(createList.size() > 0)
{
	if(testMode)
	{
		info "[TEST MODE] Would CREATE " + createList.size() + " item(s):";
		for each  item in createList
		{
			info "  -> " + item.get("Name") + " (SKU: " + item.get("SKU") + ") | Price: " + item.get("Unit_Price") + " | Unit: " + item.get("Unit");
		}
	}
	else
	{
		batchSize = 100;
		batchIterList = {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20};
		batchIndex = 0;
		for each  batchCount in batchIterList
		{
			startIndex = (batchCount - 1) * batchSize;
			if(startIndex < createList.size())
			{
				endIndex = min(startIndex + batchSize,createList.size()) - 1;
				batch = createList.subList(startIndex,endIndex + 1);
				createParams = {"data":batch};
				createResponse = invokeurl
				[
					url :"https://fsm.zoho.com/fsm/v1/Service_And_Parts"
					type :POST
					parameters:createParams.toString()
					connection:"fsm"
				];
				info "CREATE batch [" + startIndex + " - " + endIndex + "]: " + createResponse;
			}
		}
	}
}
// ======================
// EXECUTE UPDATES
// ======================
if(updateList.size() > 0)
{
	if(testMode)
	{
		info "[TEST MODE] Would UPDATE " + updateList.size() + " item(s):";
		for each  item in updateList
		{
			info "  -> " + item.get("Name") + " (SKU: " + item.get("SKU") + ") | Price: " + item.get("Unit_Price") + " | Unit: " + item.get("Unit");
		}
	}
	else
	{
		for each  updateItem in updateList
		{
			fsmId = updateItem.get("id").toString();
			updateParams = {"data":{updateItem}};
			updateResponse = invokeurl
			[
				url :"https://fsm.zoho.com/fsm/v1/Service_And_Parts/" + fsmId
				type :PUT
				parameters:updateParams.toString()
				connection:"fsm"
			];
			info "UPDATE " + updateItem.get("Name") + " (" + fsmId + "): " + updateResponse;
		}
	}
}
// ======================
// EXECUTE DELETES
// ======================
if(deleteList.size() > 0)
{
	if(testMode)
	{
		info "[TEST MODE] Would DELETE " + deleteList.size() + " item(s):";
		for each  item in deleteList
		{
			info "  -> " + item.get("Name") + " (SKU: " + item.get("SKU") + ") | FSM ID: " + item.get("id");
		}
	}
	else
	{
		// Uncomment when ready to enable live deletes
		//
		for each  deleteItem in deleteList
		{
			fsmId = deleteItem.get("id").toString();
			deleteResponse = invokeurl
			[
				url :"https://fsm.zoho.com/fsm/v1/Service_And_Parts/" + fsmId
				type :DELETE
				connection:"fsm"
			];
			info "DELETE " + deleteItem.get("Name") + " (" + fsmId + "): " + deleteResponse;
		}
	}
}
info "--- Sync complete ---";
info "Test Mode : " + testMode;
info "Created: " + createList.size() + " | Updated: " + updateList.size() + " | Flagged for delete: " + deleteList.size();
