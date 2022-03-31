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

//7. test to determine if getUserPotholes returns all of the current user's potholes.
test('Test getUserPotholes returns no potholes for a non-logged in user', async() =>{
    let result = await getUserPotholes();
    expect(result).toBeNull;
})

//8. test to determine if sendRequest with register returns the right results with incorrect data
test('Test sendReport with incorrect information is unsuccessfull', async() =>{
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

//9. test whether the sending a report request returns the right result
test('Test sendRequest with POST returns the correct status', async() =>{
    var data = {
		"longitude": 10.631949,
		"latitude":  -61.353160,
		"images": [],
        "description":null,
	};
    let result =  await sendRequest(STANDARD_REPORT_URL, "POST", data);
    expect(result).toHaveProperty("msg");
})

//10. tests the getIndividualReport function 
test('Test getIndividualReport() returns correct result for potholeID of 1', async() =>{
    let result = await getIndividualReport(1);
    expect(result).toBeNull();
})

//let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "DELETE");

