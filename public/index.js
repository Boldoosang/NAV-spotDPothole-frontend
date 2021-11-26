let username
const SERVER = "https://spotdpothole.herokuapp.com"
const PICONG_SERVER = "https://project-caigual.herokuapp.com/publicAPI/info/electoraldistrict" //?year=2020&district=ari
const ELECTION_YEAR = "2020"

async function sendRequest(url, method, data){
    try {
        let access_token = window.localStorage.getItem("access_token");

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
                window.localStorage.removeItem('access_token');
                console.log("Session has expired!")
                window.location = "/"
                return;
            }
        }

        return results;
    } catch (e){
        console.log(e)
        return {"error" : "An unexpected error has occurred!"};
    }
}


function logout(){
    accessToken = window.localStorage.getItem("access_token");

    if(accessToken){
        window.localStorage.removeItem('access_token');
        console.log("Succesfully logged out!")
    } else 
        console.log("You were not logged in!")
    
    identifyUserContext()

    window.location = `/`
}

async function login(event){
    event.preventDefault();

    let form = event.target;

    let loginDetails = {
        "email" : form.elements["InputEmail"].value,
        "password" : form.elements["InputPassword"].value
    }

    form.reset();

    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    let messageArea = document.querySelector("#userLoginMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        window.localStorage.setItem("access_token", result["access_token"]);
        messageArea.innerHTML = `<b class="text-success text-center">Login successful!</b>`
        //window.location = "/"
    }
}


async function register(event){
    event.preventDefault();

    let form = event.target;

    console.log(form.elements["agreeToS"])

    let registrationDetails = {
        "email" : form.elements["regInputEmail"].value,
        "firstName" : form.elements["regInputFirstName"].value,
        "lastName" : form.elements["regInputLastName"].value,
        "password" : form.elements["regInputPassword"].value,
        "confirmPassword" : form.elements["regInputConfirm"].value,
        "agreeToS" : form.elements["regAgreeToS"].checked
    }

    console.log(registrationDetails)

    form.reset();

    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    let messageArea = document.querySelector("#userRegisterMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<b class="text-success text-center">Registration successful!</b>`
    }

}

window.addEventListener('DOMContentLoaded', event => {

    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
            document.body.classList.toggle('sb-sidenav-toggled');
        }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});


async function loadReports(potholeID){
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    console.log(potholeReports)
    let allReportsContainer = document.querySelector("#reportAccordion")

    let allReportsContainer = document.querySelector("#reportAccordion")
    let allReportsAccordions = ""

    try {
        potholeReports = potholeReports.sort((a, b) => {
            if (a.potholeID < b.potholeID)
                return 1;                
            else
                return -1;
        })

        if(potholeReports.length > 0){
            for(report of potholeReports){
                allReportImages = ""
                if(report.reportedImages.length == 0){
                    allReportImages = `<div class="d-flex justify-content-center mt-3"><strong>No report images uploaded!</strong></div>`
                } else {
                    let tag = "active"
                    let i = 0
                    for(reportImage of report.reportedImages){
                        if(i > 0)
                            tag = ""
                        allReportImages +=
                        `<div class="carousel-item ${tag}">
                            <img src="${reportImage.imageURL}" style="height: 200px; background-position: center center; object-fit: cover; background-repeat: no-repeat;" class="d-block w-100">
                        </div>`
                        i++;
                    }
                }
                console.log(report)
                allReportsAccordions += 
                `<div class="accordion-item">
                    <h2 class="accordion-header" id="heading-${report.reportID}">
                    <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${report.reportID}">
                        Report (${report.dateReported}) - ${report.reportedBy}
                    </button>
                    </h2>
                    <div id="collapse-${report.reportID}" class="accordion-collapse collapse" data-bs-parent="#reportAccordion">
                        <div class="accordion-body">
                            <strong>Report Images</strong>
                            <div id="carouselReport-${report.reportID}" class="carousel slide my-2" data-bs-ride="carousel">
                                <div id="reportImages-${report.reportID}" class="carousel-inner">
                                    ${allReportImages}
                                </div>
                                <button class="carousel-control-prev" type="button" data-bs-target="#carouselReport-${report.reportID}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#carouselReport-${report.reportID}" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                </button>
                            </div>
                            <br>
                            <strong>Report Description</br></strong>
                            ${report.description}
                        </div>
                    </div>
                </div>`
            }
        } else {
            allReportsAccordions = `<div class="d-flex justify-content-center my-3"><strong>No reports for this pothole!</strong></div>`
        }
    } catch(e){
        allReportsAccordions = `<div class="d-flex justify-content-center my-3"><strong>No reports for this pothole!</strong></div>`
    }

    allReportsContainer.innerHTML = allReportsAccordions
}


async function loadConstituencyData(constituencyID){
    let url = `${PICONG_SERVER}?year=${ELECTION_YEAR}&district=${constituencyID}`
    let councillorData = await sendRequest(url, "GET")

    let councillorInformationArea = document.querySelector("#councillorInformation")
    let councillorInformation = ""

    try {
        councillorInformation = 
        `
        <div class="text-center"><strong>COUNCILLOR INFORMATION<strong></div>
        <table class="table my-2 table-borderless">
            <tbody>
                <tr>
                    <th scope="row">Name</th>
                    <td>${councillorData[0].name}</td>
                </tr>
                <tr>
                    <th scope="row">Address</th>
                    <td>${councillorData[0].address}</td>
                </tr>
                <tr>
                    <th scope="row">Email</th>
                    <td scope="row">${councillorData[0].email}</td>
                </tr>
                <tr>
                    <th scope="row">Phone</th>
                    <td scope="row">${councillorData[0].phone}</td>
                </tr>
            </tbody>
        </table>
        `
    } catch(e){
        councillorInformation = `<div class="d-flex justify-content-center my-3"><strong>No constituency information available!</strong></div>`
    }

    councillorInformationArea.innerHTML = councillorInformation
}

