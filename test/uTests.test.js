const SERVER = "https://spotdpothole.herokuapp.com/"
const PICONG_SERVER = "https://project-caigual.herokuapp.com/publicAPI/info/electoraldistrict"
const ELECTION_YEAR = "10"
const DRIVER_REPORT_URL = SERVER + "/api/reports/driver"
const STANDARD_REPORT_URL = SERVER + "/api/reports/standard"

const fetch = require('node-fetch');

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

// returns data pertaining to a councillor that is referenced by their constituencyID and their electionYear, through a sendRequest
async function getCouncillorData(electionYear, constituencyID){
    let url = `${PICONG_SERVER}?year=${electionYear}&district=${constituencyID}`
    let councillorData = await sendRequest(url, "GET")
    return councillorData;
}

// test to determine whether the request for councillor data through the use of getCouncillorData returns the right data based on parameters passed
test('Test Get Councillor Data', async () => {
    let result = await getCouncillorData(ELECTION_YEAR,'CNE');

    expect(result).toStrictEqual([{
        "code":"CNE","name":"Rishad Vyash Seecheran","pronouns":"he/him","address":"Lot 54 Dyette Estate, Southern Main Road (Upstairs Indar's Fast Foods), Cunupia","email":"caronie@ttparliament.org","phone":"693-1560"
    }]);
});

// test to determine whether a sendRequest with method parameter GET returns a success, "status": "Awesome!"
test ('Test sendRequest with get' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testGet', 'GET')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

// test to determine whether a sendRequest with method parameter POST returns a success, "status": "Awesome!"
test ('Test sendRequest with POST' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testPost', 'POST')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

// test to determing whether the getReports function returns the right information on a pothole from the database
test('Function getReports produces report data on a pothole', async () => {
    console.log(await getReports(1));
    expect(getReports(1).toBeNull);
});