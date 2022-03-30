const SERVER = "https://spotdpothole.herokuapp.com/"
const PICONG_SERVER = "https://project-caigual.herokuapp.com/publicAPI/info/electoraldistrict"
const ELECTION_YEAR = "10"
const DRIVER_REPORT_URL = SERVER + "/api/reports/driver"
const STANDARD_REPORT_URL = SERVER + "/api/reports/standard"

const leafletPip = require('leaflet-pip')
const fetch = require('node-fetch');

/* =========================== FUNCTIONS FOR TESTING ================================== */

// function that returns the pothole report from the database based on the parameter potholeID
async function getReports(potholeID){
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    return potholeReports;
}

  // function that performs an api request based on the method passed in the parameters
async function sendRequest(url, method, data){
    try {
        let access_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9";

        let request = {
            "method" : method,
            "headers" : {
                "Authorization" : `Bearer ${access_token}`
            }
        }

        if (data){
            request = {
                "method" : method,
                "headers" : {
                    "Authorization" : `Bearer ${access_token}`,
                    "Content-Type" : "application/json"
                }
            }
            request.body = JSON.stringify(data);
        }

        let response = await fetch(url, request);
        let results = await response.json()

        if("msg" in results){
            if(results["msg"] == "Signature verification failed" || results["msg"] == "Token has expired"){
                //window.localStorage.removeItem('access_token');
                //alert("Session has expired!")
                //window.location = "/"
                return;
            }
        }

        return results;
    } catch (e){
        console.log(e)
        return {"error" : "An unexpected error has occurred!"};
    }
}

// function identifies the current logged in user.
async function identifyUser(){
    //Sends a identify GET request to the server and stores the result.
    let user = await sendRequest(SERVER + "/identify", "GET")

    //If there is an email in the response, the user is logged in. Otherwise, the user is not logged in/session is expired.
    try {
        if("email" in user){
            return user;
        } else {
            return {"error" : "User is not logged in or session has expired!"}
        }
    } catch(e){
        return {"error" : "User is not logged in or session has expired!"}
    }
}

// returns data pertaining to a councillor that is referenced by their constituencyID and their electionYear, through a sendRequest
async function getCouncillorData(electionYear, constituencyID){
    let url = `${PICONG_SERVER}?year=${electionYear}&district=${constituencyID}`
    let councillorData = await sendRequest(url, "GET")
    return councillorData;
}

//Sends a generated report to the endpoint URL.
async function sendReport(latitude, longitude, photoB64, description = null, url){
    //Determines if the latitude and longitude resites within the map bounds.
    var inMap = leafletPip.pointInLayer([longitude, latitude], map);

    //If the location is not within the map, return an error message.
    if(inMap.length == 0)
        return {error: "You must be within the map to report a pothole!"}

    //Creates the data object containing the report information.
	var data = {
		"longitude": longitude,
		"latitude": latitude,
		"images": []
	};

    //Adds the description if there is a description.
	if(description != null){
		data["description"] = description
	}

    //Adds images if there are images.
	if(photoB64 != null){
		data["images"] = [photoB64];
	}

	//Attempts to send the request to the endpoint with the data, and returns the outcome.
	try {
        console.log(data)
		return await sendRequest(url, "POST", data)
	} catch (error) {
		return error;
	}
}

//Gets all of the current user's potholes and returns it.
async function getUserPotholes(){
    let potholes = await sendRequest(SERVER + '/api/dashboard/potholes', 'GET');
    return potholes;
}


/* ========================================= TESTS ========================================================= */

//1. test to determine whether the request for councillor data through the use of getCouncillorData returns the right data based on parameters passed
test('Test Get Councillor Data', async () => {
    let result = await getCouncillorData(ELECTION_YEAR,'CNE');

    expect(result).toStrictEqual([{
        "code":"CNE","name":"Rishad Vyash Seecheran","pronouns":"he/him","address":"Lot 54 Dyette Estate, Southern Main Road (Upstairs Indar's Fast Foods), Cunupia","email":"caronie@ttparliament.org","phone":"693-1560"
    }]);
});

//2. test to determine whether a sendRequest with method parameter GET returns a success, "status": "Awesome!"
test ('Test sendRequest with GET' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testGet', 'GET')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

//3. test to determine whether a sendRequest with method parameter POST returns a success, "status": "Awesome!"
test ('Test sendRequest with POST' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testPost', 'POST')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

//4. test to determing whether the getReports function returns the right information on a pothole that does not exist
test('Function getReports produces no report data on a pothole with ID 1', async () => {
    //console.log(await getReports(1));
    let potholeResults = getReports(1);
    expect(potholeResults).toBeNull;
    expect(potholeResults.length).toBeNull;
});

//5. test to see if identifyUser returns no results when a user is not logged in
test('Function identifyUser produces no results when user is not logged in', async() =>{
    let result = await identifyUser();
    expect(result).toStrictEqual({
        "error" : "User is not logged in or session has expired!"
    })
});

//6. test to determine if sendRequest produces the right results when a user logs in successfully
test('Test sendRequest with login attempt is successfull', async() =>{
    let loginDetails = {
        "email" : "brandon.bharath@my.uwi.edu",
        "password" : "SpotDPotTester123"
    }
    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    expect(result).toHaveProperty("access_token");
})

/*7. test to determine if sendReport returns the right results
test('Test sendReport with correct information is successfull', async() =>{
    let result = sendReport(10.631918, -61.353192,null,null,STANDARD_REPORT_URL);
    expect(result).toStrictEqual({"error" : "An unexpected error has occurred!"})
})*/

//8. test to determine if getUserPotholes returns all of the current user's potholes.
test('Test getUserPotholes returns no potholes for a non-logged in user', async() =>{
    let result = await getUserPotholes();
    expect(result).toBeNull;
})
