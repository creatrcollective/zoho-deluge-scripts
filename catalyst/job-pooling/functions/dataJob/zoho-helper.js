const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const catalyst = require('zcatalyst-sdk-node');

// constants
let tokenFilePath = '';

// get a Zoho auth token
async function getZohoAccessToken(catalystApp) {
    //see if there's already a token in the datastore
    return new Promise((resolve, reject) => {
        console.log(`Zoho Refresh Token: ${process.env.ZOHO_REFRESHTOKEN}`);
        const accessTokenURL = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${process.env.ZOHO_REFRESHTOKEN}&client_id=${process.env.ZOHO_CLIENT}&client_secret=${process.env.ZOHO_SECRET}&grant_type=refresh_token`;
        try {
            //console.log('checking whats in the cache already');
            let cache = catalystApp.cache(); 
            let segment = cache.segment('19750000000168636');
            let cachePromise = segment.getValue('token'); 
            cachePromise.then((entity) => {
                let getToken;
                if(entity != null) {
                    console.log('cached token found - using that instead');
                    resolve(entity);
                } else {
                    console.log(`trying URL: ${accessTokenURL}`);
                    axios.post(accessTokenURL, {}, { headers: { 'Content-Type': 'application/json' } })
                    .then(postResponse => {

                    if(postResponse.data.error) {
                        reject('something went wrong');
                        console.log(postResponse);
                    }
                    else {
                        const accessToken = postResponse.data.access_token;
                        segment.put('token', accessToken ,1)
                        .then((insertCachePromise) => {
                            resolve(accessToken);
                        })
                        .catch((e) => {
                            console.log(e);
                        });
                    }
                    })
                    .catch((err) => {
                        reject('zoho token fail: ' + err);
                    });
                }
               
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function zohoCoqlSearch(queryString, accessToken) {
    return new Promise((resolve, reject) => {
        const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` };
        const url = `https://www.zohoapis.com/crm/v8/coql`; 
        const postBody = { select_query : queryString };
        try {
            axios.post(url,  postBody,{ headers: authHeaders})
            .then(response => {
                resolve(response.data);
            })
            .catch((e) => {
                console.log(e);
            });
        } 
        catch(e) {
            
        } 
    })
}

async function searchZohoRecords(accessToken, searchModule, searchString) {
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` };
    const url = `https://www.zohoapis.com/crm/v8/${searchModule}/search?criteria=${searchString}`;
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            headers: authHeaders
        });
        if(response.data != undefined) {
            console.log(`searchResponse ok`);
            return response.data;
        }
        else {
            console.log(response);
            throw new Error(response);
        }
    } catch (err) {
        return err;
    }
}

async function updateZohoRecord(accessToken, moduleName, recordMap) {
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` };
    const url = `https://www.zohoapis.com/crm/v8/${moduleName}`;
    try {
        const response = await axios({
            method: 'PUT',
            url: url,
            headers: authHeaders,
            data: {data: [recordMap]}
        });
        //console.log(response.data)
        if(response.data) {
            //console.log(response.data.data[0]);
            if(response.data.data[0].status == 'success') {
                console.log('update ok');
                return 'success';
            }
            else {
                throw new Error(response.data);
            }
        }
        else {
            throw new Error(response);
        }
    } catch (err) {
        return err;
    }
}

async function createZohoRecord(accessToken, moduleName, recordMap) {
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` };
    const url = `https://www.zohoapis.com/crm/v8/${moduleName}`;
    try {
        console.log('trying create record');
        const response = await axios({
            method: 'POST',
            url: url,
            headers: authHeaders,
            data: {data : [recordMap]}
        });
        //console.log(response);
        return response.data;
    } catch (err) {
        throw err;
    }
}

async function getZohoRecordById(accessToken, moduleName, recordId) {
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Zoho-oauthtoken ${accessToken}` };
    const url = `https://www.zohoapis.com/crm/v8/${moduleName}/${recordId}`;
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            headers: authHeaders
        });
        return response.data.data[0];
    } catch (err) {
        return err;
    }
}

module.exports = {
    zohoCoqlSearch,
    getZohoAccessToken,
    searchZohoRecords,
    getZohoRecordById,
    updateZohoRecord,
    createZohoRecord
};