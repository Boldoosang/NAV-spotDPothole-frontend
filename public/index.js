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
                alert("Session has expired!")
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
        window.location = "/"
    }
}

async function identifyUser(){
    let user = await sendRequest(SERVER + "/identify", "GET")

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

async function identifyUserContext(){
    let user = await identifyUser();

    let userStateArea = document.querySelector("#userContextGroup");

    if("email" in user){
        userStateArea.innerHTML = `<h6 class="text-center">Logged in as <span class="text-primary">${user.firstName} ${user.lastName}</span></h3>
                                    <hr class="my-0">
                                    <a class="list-group-item list-group-item-action list-group-item-light p-3 pr-5 relative-bottom" onclick="logout()"><i class="bi bi-box-arrow-left" style="font-size:1.5rem;color:black"></i>        Logout</a>`
    } else {
        userStateArea.innerHTML = `<hr class="my-0">
        <a class="list-group-item list-group-item-action list-group-item-light p-3 pr-5 relative-bottom" data-bs-toggle="modal" data-bs-target="#loginModal"><i class="bi bi-person-circle" style="font-size:1.5rem;color:black"></i>        Login/Register</a>`
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

async function onClickLeaderboard(){
    alert("Test");
}

function calculateNetVotes(report){
    tally = 0
    for(vote of report.votes){
        if(vote.upvote)
            tally++
        else
            tally--
    }
    return tally;
}

function determineTextColor(netVotes){
    if(netVotes < 0){
        return "text-danger"
    } else if(netVotes > 0){
        return "text-success"
    } else {
        return "text-dark";
    }
}

async function determineUpVoteButtonColor(report){
    let user = await identifyUser();

    for(vote of report.votes){
        if(vote.upvote){
            if(vote.userID == user.userID){
                return "btn-success"
            }
        }
    }

    return "btn-secondary"
}

async function determineDownVoteButtonColor(report){
    let user = await identifyUser();

    for(vote of report.votes){
        if(!vote.upvote){
            if(vote.userID == user.userID){
                return "btn-danger"
            }
        }
    }

    return "btn-secondary"
}

async function loadReports(potholeID){
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    console.log(potholeReports)
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
                netVotes = calculateNetVotes(report);
                upvoteButtonColor = await determineUpVoteButtonColor(report, "upvote")
                downvoteButtonColor = await determineDownVoteButtonColor(report, "downvote")
                let color = determineTextColor(netVotes);
                

                allReportsAccordions += 
                `<div class="accordion-item">
                    <h2 class="accordion-header" id="heading-${report.reportID}">
                    <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${report.reportID}">
                         <div><span class="font-monospace ${color}" id="accordionNetVotes-${report.reportID}">${(netVotes <= 0 ? "" : "+")}<span>${netVotes}</span></span> | Report (${report.dateReported}) - ${report.reportedBy}</div>
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
                            <hr class="mb-2 mt-3">
                            <div id="votingArea" class="text-center">
                                <strong>Votes</strong><br>

                                <div class="my-3">
                                    <span id="castedDownvote-${report.reportID}">
                                        <button  type="button" class="btn ${downvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${report.reportID}, false)">
                                            <i class="bi bi-arrow-down"></i>
                                        </button>
                                    </span>
                                    <strong class="px-3" id="netVotes-${report.reportID}">${netVotes}</strong>
                                    <span id="castedUpvote-${report.reportID}">
                                        <button type="button" class="btn ${upvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${report.reportID}, true)">
                                            <i class="bi bi-arrow-up"></i>
                                        </button>
                                    </span>
                                </div>
                                <span id="voteOutcomeMessage-${report.reportID}"></span>
                            </div>
                            <hr class="my-3">
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

async function loadLeaderboardData(){

}

async function voteOnReport(event, potholeID, reportID, isUpvote){
    let voteData = {
        "upvote" : isUpvote,
    }

    let netVotesCounter = document.querySelector(`#netVotes-${reportID}`)
    let accordionVotesCounter = document.querySelector(`#accordionNetVotes-${reportID}`)

    let upvoteButton = document.querySelector(`#castedUpvote-${reportID}`)
    let downvoteButton = document.querySelector(`#castedDownvote-${reportID}`)
    
    let result = await sendRequest(SERVER + `/api/vote/pothole/${potholeID}/report/${reportID}/vote`, "POST", voteData);
    let messageArea = document.querySelector(`#voteOutcomeMessage-${reportID}`)

    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<b class="text-danger text-center">Please login to vote!</b>`
    } else {
        messageArea.innerHTML = `<b class="text-success text-center">${result["message"]}</b>`

        try {
            let updatedReport = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "GET");
            
            newNetVotes = calculateNetVotes(updatedReport)
            let color = determineTextColor(newNetVotes)

            let updatedDownvoteButtonColor = await determineDownVoteButtonColor(updatedReport)
            let updatedUpvoteButtonColor = await determineUpVoteButtonColor(updatedReport)


            netVotesCounter.innerHTML = newNetVotes
            accordionVotesCounter.innerHTML = `<span class="font-monospace ${color}">${(newNetVotes <= 0 ? "" : "+")}<span id="accordionNetVotes-${updatedReport.reportID}">${newNetVotes}</span></span>`
            upvoteButton.innerHTML = `<button id="castedUpvote-${updatedReport.reportID}" type="button" class="btn ${updatedUpvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, true)">
                                        <i class="bi bi-arrow-up"></i>
                                    </button>`
            downvoteButton.innerHTML = `<button id="castedDownvote-${updatedReport.reportID}" type="button" class="btn ${updatedDownvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, false)">
                                            <i class="bi bi-arrow-down"></i>
                                        </button>`
        } catch(e){
            console.log(e)
        }
    }
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

function main(){
    identifyUserContext()
}


window.addEventListener('DOMContentLoaded', main);