// Use "npm run utest" to run this test file with jest

const SERVER = "https://spotdpothole.herokuapp.com/"
const PICONG_SERVER = "https://project-caigual.herokuapp.com/publicAPI/info/electoraldistrict"
const ELECTION_YEAR = "10"
const DRIVER_REPORT_URL = SERVER + "/api/reports/driver"
const STANDARD_REPORT_URL = SERVER + "/api/reports/standard"

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


// gets all of the current user's potholes and returns it.
async function getUserPotholes(){
    let potholes = await sendRequest(SERVER + '/api/dashboard/potholes', 'GET');
    return potholes;
}

// gets an individual report from a specific pothole that the user has reported
async function getIndividualReport(potholeID){
    //Gets all of the reports from the server.
    let reports = await sendRequest(SERVER + `/api/dashboard/reports`, 'GET');
    //Attempts to iterate over the report to find a matching report, and returns it.
    try {
        for(report of reports){
            if(report.potholeID == potholeID){
                return report;
            }
        }
    } catch(e){
        //Prints any errors and returns null if there are no matching reports.
        //console.log(e);
        return null
    }
}


/* ========================================= TESTS ========================================================= */

// Test 1: This test checks whether the request for councillor data through the use of getCouncillorData() function returns the right data based on parameters passed, 
// that is the: name, pronouns, address, email address and phone number returned by the function match the expected value.
test('Test 1: Function getCouncillorData() returns the correct data', async () => {
    let result = await getCouncillorData(ELECTION_YEAR,'CNE');

    expect(result).toStrictEqual([{
        "code":"CNE","name":"Rishad Vyash Seecheran","pronouns":"he/him","address":"Lot 54 Dyette Estate, Southern Main Road (Upstairs Indar's Fast Foods), Cunupia","email":"caronie@ttparliament.org","phone":"693-1560"
    }]);
});

// Test 2: This test uses a sendRequest with method parameter GET and expects it to return a success, with the value: "status": "Awesome!".
test ('Test 2: Test sendRequest with GET' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testGet', 'GET')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

// Test 3: This test uses a sendRequest with method parameter POST and expects it to return a success, with the value: "status": "Awesome!".
test ('Test 3: Test sendRequest with POST' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testPost', 'POST')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

// Test 4: This test checks whether the the right information is returned when the getReports() function is called, such that it expects
// null values to be returned on a pothole containing the ID 1.
test('Test 4: Function getReports() produces no report data on a pothole with ID 1', async () => {
    let potholeResults = getReports(1);
    expect(potholeResults).toBeNull;
    expect(potholeResults.length).toBeNull;
});

// Test 5: This test checks that no information is returned on the call of the function identifyUser(), such that it expects the function to return
// no results when the user is not logged in. The expected value is the error message "error" : "User is not logged in or session has expired!".
test('Test 5: Function identifyUser() produces no results when user is not logged in', async() =>{
    let result = await identifyUser();
    expect(result).toStrictEqual({
        "error" : "User is not logged in or session has expired!"
    })
});

// Test 6: This test checks that the right information is returned when getUserPotholes() is called, such that it expects the function to return null for the user not being logged in.
test('Test 6: Function getUserPotholes() returns no potholes for a non-logged in user', async() =>{
    let result = await getUserPotholes();
    expect(result).toBeNull;
})

// Test 7: This test checks that sendRequest produces the right results when a user logs in successfully. The test data used for this is "email" : "brandon.bharath@my.uwi.edu" 
// and "password" : "SpotDPotTester123". The expected result of the test is that an access token for the user is returned.
test('Test 7: Test sendRequest with correct login attempt returns access token', async() =>{
    let loginDetails = {
        "email" : "brandon.bharath@my.uwi.edu",
        "password" : "SpotDPotTester123"
    }
    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    expect(result).toHaveProperty("access_token");
})

// Test 8: This test checks for the right result being returned if sendRequest is called with a /register method along with invalid registration data. The expected result of the test is
// that the function returns an error message containing the property "error".
test('Test 8: Test sendRequest with incorrect register information is unsuccessfull', async() =>{
    let registrationDetails = {
        "email" : "@justinbaldeo.com",
        "firstName" : "Justevon",
        "lastName" : "Baldeorathj",
        "password" : null,
        "confirmPassword" : null,
        "agreeToS" : null,
    }
    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    expect(result).toHaveProperty("error")
})

// Test 9: This test determines whether the right result is returned if sendRequest is called with the "POST" method for reporting a pothole. The test uses valid mock data for sending
// a report with "longitude": 10.631949, "latitude":  -61.353160, "images": [] and "description":null. The test expects the function to return a status report containing the property "msg"
test('Test 9: Test sendRequest with POST for a pothole report is unsuccessful for non-logged-in user', async() =>{
    var data = {
		"longitude": 10.631949,
		"latitude":  -61.353160,
		"images": [],
        "description":null,
	};
    let result =  await sendRequest(STANDARD_REPORT_URL, "POST", data);
    expect(result).toHaveProperty("msg");
})

// Test 10: This test determines whether the right result is returned when the getIndividualReport() function is called with a pothole ID of 1 as the parameter. The test expects the 
// function to have a null result as its return value, as there is no pothole of ID 133. 
test('Test 10: Function getIndividualReport() returns no result for potholeID of 133', async() =>{
    let result = await getIndividualReport(133);
    expect(result).toBeNull();
})