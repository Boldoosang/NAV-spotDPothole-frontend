const SERVER = "https://spotdpothole.herokuapp.com/"
const PICONG_SERVER = "https://project-caigual.herokuapp.com/publicAPI/info/electoraldistrict"
const ELECTION_YEAR = "2020"
const DRIVER_REPORT_URL = SERVER + "/api/reports/driver"
const STANDARD_REPORT_URL = SERVER + "/api/reports/standard"

const fetch = require('node-fetch');

async function getReports(potholeID){
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    return potholeReports;
}

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

async function getCouncillorData(electionYear, constituencyID){
    let url = `${PICONG_SERVER}?year=${electionYear}&district=${constituencyID}`
    let councillorData = await sendRequest(url, "GET")
    return councillorData;
}

test('Test Get Councillor Data', async () => {
    //console.log(await getCouncillorData(2020,''));
    let result = await getCouncillorData(2020,'CNE');

    expect(result).toStrictEqual([{
        "code":"CNE","name":"Rishad Vyash Seecheran","pronouns":"he/him","address":"Lot 54 Dyette Estate, Southern Main Road (Upstairs Indar's Fast Foods), Cunupia","email":"caronie@ttparliament.org","phone":"693-1560"
    }]);
});

test ('Test sendRequest with get' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testGet', 'GET')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

test ('Test sendRequest with POST' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testPost', 'POST')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

test('Function getReports produces report data on a pothole', async () => {
    console.log(await getReports(1));
    expect(getReports(1).toBeNull);
});