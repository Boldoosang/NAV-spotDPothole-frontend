//Facilitates the sending of a 'METHOD' request using the 'DATA', to the 'URL'.
async function sendRequest(url, method, data){
    //Attempts to send the request and return the response result.
    try {
        //Gets the access token for privileged routes.
        let access_token = window.localStorage.getItem("access_token");

        //Creates the request header for GET requests without a body.
        let request = {
            "method" : method,
            "headers" : {
                "Authorization" : `Bearer ${access_token}`
            }
        }

        //Creates the GET request with a body.
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

        //Carries out the requests and collects the results.
        let response = await fetch(url, request);
        let results = await response.json()

        //Removes the token and displays a message for expired access_tokens.
        if("msg" in results){
            if(results["msg"] == "Signature verification failed" || results["msg"] == "Token has expired"){
                window.localStorage.removeItem('access_token');
                alert("Session has expired!")
                window.location = "/"
                return;
            }
        }

        //Otherwise, return the parsed results.
        return results;
    } catch (e){
        //If unable to send the request, return an error.
        console.log(e)
        return {"error" : "An unexpected error has occurred!"};
    }
}

//Facilitates the logout of a user by removing their access token.
function logout(){
    //Attempts to retrieve the access token of the user.
    accessToken = window.localStorage.getItem("access_token");

    //If there was an access token to be retrieved, remove the token.
    if(accessToken){
        window.localStorage.removeItem('access_token');
        console.log("Succesfully logged out!")
    } else 
    //Otherwise, the user was not logged in.
        console.log("You were not logged in!")
    
    //Updates the user context elements and refreshes the page.
    identifyUserContext()
    window.location = `/`
}

//Facilitates the login of a user based on their login information.
async function login(event){
    //Prevents the reloading of the page/
    event.preventDefault();

    //Gets and extracts the form data from the login form. Then resets the form.
    let form = event.target;

    let loginDetails = {
        "email" : form.elements["InputEmail"].value,
        "password" : form.elements["InputPassword"].value
    }

    form.reset();

    //Sends the login request to the server and stores the result.
    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    let messageArea = document.querySelector("#userLoginMessage")

    //Prints the result of login to the outcome area.
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

//Identifies the current logged in user.
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

//Updates the user account actions based on whether the user is logged in.
async function identifyUserContext(){
    //Gets the user context.
    let user = await identifyUser();

    //Writes the appropriate menu options to the user context actions for login/register, or logout.
    let userStateArea = document.querySelector("#userContextGroup");
    if("email" in user){
        userStateArea.innerHTML = `<h6 class="text-center">Logged in as <span class="text-primary">${user.firstName} ${user.lastName}</span></h3>
                                    <hr class="my-0">
                                    <a class="list-group-item list-group-item-action list-group-item-light p-3 pr-5 relative-bottom" onclick="logout()"><i class="bi bi-box-arrow-left" style="font-size:1.5rem;color:black"></i>        Logout</a>`
    }
}

//Facilitates the registration of a user when the register form is submitted.
async function register(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let registrationDetails = {
        "email" : form.elements["regInputEmail"].value,
        "firstName" : form.elements["regInputFirstName"].value,
        "lastName" : form.elements["regInputLastName"].value,
        "password" : form.elements["regInputPassword"].value,
        "confirmPassword" : form.elements["regInputConfirm"].value,
        "agreeToS" : form.elements["regAgreeToS"].checked
    }

    form.reset();

    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    let messageArea = document.querySelector("#userRegisterMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<b class="text-success text-center">Registration successful!</b>`
    }

}

//Determines the net votes for a report.
function calculateNetVotes(report){
    //Sets the initial tally to 0.
    tally = 0
    //Iterates over the report and adds 1 to the tally for upvotes, and -1 to the tally for downvotes.
    for(vote of report.votes){
        if(vote.upvote)
            tally++
        else
            tally--
    }
    //Returns the tally.
    return tally;
}

//Determines the color to be used for the text based on the votes on a report.
function determineTextColor(netVotes){
    //If the votes are negative, return red(text-danger), if the votes are positive, return green(text-success), and for
    //a net votes of 0, return a black(text-dark).
    if(netVotes < 0){
        return "text-danger"
    } else if(netVotes > 0){
        return "text-success"
    } else {
        return "text-dark";
    }
}

//Determines the upvote button color of a report based on whether the user has upvoted previously on the report.
async function determineUpVoteButtonColor(report){
    //Gets the user context.
    let user = await identifyUser();

    //Iterates over all of the votes for a report, if there is a upvote from a user that matches the current user, the user has upvoted this already.
    //Return a green button(btn-success)
    for(vote of report.votes){
        if(vote.upvote){
            if(vote.userID == user.userID){
                return "btn-success"
            }
        }
    }

    //Otherwise, return a grey button(btn-secondary.)
    return "btn-secondary"
}

//Determines the downvote button color of a report based on whether the user has previously downvoted the report.
async function determineDownVoteButtonColor(report){
    //Gets the user context.
    let user = await identifyUser();

    //Iterates over all of the votes of a report. If there is a downvote from a user that matches the current user, the user has previously downvoted this report.
    //Return a red button(btn-danger)
    for(vote of report.votes){
        if(!vote.upvote){
            if(vote.userID == user.userID){
                return "btn-danger"
            }
        }
    }

    //Otherwise, return a grey button(btn-secondary)
    return "btn-secondary"
}

//Gets all of the reports for a given potholeID and return them.
async function getReports(potholeID){
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    return potholeReports;
}

//Loads the reports for a given pothole into the pothole information pane/canvas/slide-out menu.
async function loadReports(potholeID){
    //Gets all of the pothole reports.
    let potholeReports = await getReports(potholeID)

    //Gets the report container and initializes the reports to a blank string.
    let allReportsContainer = document.querySelector("#reportAccordion")
    allReportsContainer.innerHTML = "";

    //Attempts to load the reports into the pane.
    try {
        //Sorts the pothole by ID; most recent to least recent.
        potholeReports = potholeReports.sort((a, b) => {
            if (a.potholeID < b.potholeID)
                return 1;                
            else
                return -1;
        })

        //If there are reports for the pothole, populate the pane.
        if(potholeReports.length > 0){
            //Iterates over the reports and generates the accordion list for the potholes.
            for(report of potholeReports){
                allReportImages = ""
                //Determines if there are pothole images to be added. If not, display a message.
                if(report.reportedImages.length == 0){
                    allReportImages = `<div class="d-flex justify-content-center mt-3"><strong>No report images uploaded!</strong></div>`
                } else {
                //Otherwise, iterate over all of the images and add them to the image carousel for the report.
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

                //Calculates the votes for the report, button colors, and text colors.
                netVotes = calculateNetVotes(report);
                upvoteButtonColor = await determineUpVoteButtonColor(report, "upvote")
                downvoteButtonColor = await determineDownVoteButtonColor(report, "downvote")
                let color = determineTextColor(netVotes);
                

                //Creates and appends the accordion item containing the report information.
                allReportsContainer.innerHTML += 
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
            //Otherwise display to the user that there were no reports for the pothole.
            allReportsContainer = `<div class="d-flex justify-content-center my-3"><strong>No reports for this pothole!</strong></div>`
        }
    } catch(e){
        //If any error occurs, display that there were no reports for ht pothole.
        allReportsContainer = `<div class="d-flex justify-content-center my-3"><strong>No reports for this pothole!</strong></div>`
    }
}

//Loads the report page content into the report page based on the device that is being used.
async function loadReportPage(){
    let reportArea = document.querySelector("#reportContent");

    let user = await identifyUser();

    if("error" in user || "msg" in user){
        reportArea.innerHTML = `<div class="mt-5 text-center text-black">
                                        <h2>User is not logged in!</h2>
                                        <p>${user["error"]}</p>
                                    </div>`
    } else {
        //If a mobile device is not being used, display that their device is unsupported.
        //if(isMobileDevice()){
             //reportArea.innerHTML = `
             //<div class="text-center mt-5 text-center text-black">
             //   <h2>Unsupported Device!</h2>
             //   <p>Sorry, but you need to use a mobile device in order to make a report.</p>
             //</div>`
        //} else {
            reportArea.innerHTML = 
            `<div class="list-group p-3 d-flex flex-column justify-content-evenly align-items-middle" style="min-height: 75vh">
                <button data-bs-target="#standardReportModal" data-bs-toggle="modal" id="standard-button"  type="button" class="btn btn-dark py-5">Standard Report</button>                       
                <button data-bs-target="#driverReportModal" data-bs-toggle="modal" id="driver-button" type="button" class="btn btn-dark py-5">Driver Report</button>
            </div>`
        //}
    }
}

//Loads the report leaderboard data into the report leaderboard page.
async function loadReportLeaderboardData(){
    let leaderboard = document.querySelector("#reportLeaderboard")

    //Sets the headers of the leaderboard.
    leaderboard.innerHTML = `
    <tr>
        <th scope="col">RANK</th>
        <th scope="col">POTHOLE ID</th>
        <th scope="col">NUMBER OF REPORTS</th>
        <th scope="col">CONSTITUENCY</th>
    </tr>
    `
    //Retrieves the leaderboard data and stores it.
    let leaderboardData = await getReportLeaderboardData();
    
    //Iterates over the leaderboard data and appends rows containing the leaderboard information.
    let i = 1;
    for(pothole of leaderboardData){
        try {
        leaderboard.innerHTML += `
        <tr onclick="reportLeaderboardModal(${pothole.lat}, ${pothole.long}, ${pothole.potholeID})">
            <td>${i}</td>
            <td class="text-primary text-decoration-underline">Pothole #${pothole.potholeID}</td>
            <td>${pothole.numReports}</td>
            <td>${pothole.constituency}</td>
        </tr>
        `
        i++;
        } catch (e) {
            //A pothole will be null in the event that it does not fall within the borders of Trinidad and Tobago.
            //Although there is error protection at the frontend to prevent this, postman requests can still place potholes
            //slightly off of the coast of Trinidad and Tobago; but not much further.
            console.log("Pothole " + pothole.potholeID + " may not have a constituency if it is off map.");
        }
    }
}

//Loads the constituency pothole leaderboard data into the leaderboard page.
async function loadLeaderboardData(){
    let leaderboard = document.querySelector("#constLeaderboard")
    //Sets the headers of the leaderboard.
    leaderboard.innerHTML = `
    <tr>
        <th scope="col">RANK</th>
        <th scope="col">CONSTITUENCY</th>
        <th scope="col">NUMBER OF POTHOLES</th>
        <th scope="col">CONSTITUENCY LEADER</th>
    </tr>
    `
    //Gets the constituency pothole leaderboard and stores it.
    let leaderboardData = await getPotholesByConstituency();

    //Iterates over the leaderboard data and appends the rows containing the leaderboard information.
    let i = 1;
    for(constituency of leaderboardData){
        leaderboard.innerHTML += `
        <tr>
            <td>${i}</td>
            <td>${constituency.name}</td>
            <td>${constituency.count}</td>
            <td><button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#councillorInfoModal" onclick="displayCouncillorInfo(event, '${constituency.constitID}')">Councillor Info</a><td>
        </tr>
        `
        i++;
    }
}

//Displays a modal containing the councillor information whenver the button is clicked.
async function displayCouncillorInfo(event, constituencyID){
    //Gets the councillor data for the constituency.
    let councillorData = await getCouncillorData(ELECTION_YEAR, constituencyID)

    constituencyModalInfoBox = document.querySelector("#councillorInfoModal");

    //Attempts to add the councillor information to the modal.
    try {
        //Sets the modal body to contain the councillor information.
        councillorModalInfo.innerHTML = 
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
        //If the fields of the councillor data cannot be accessed, display that no constituency councillor information is available.
        councillorModalInfo.innerHTML = `<div class="d-flex justify-content-center my-3"><strong>No constituency information available!</strong></div>`
    }
}

//Facilitates a user vote on a report.
async function voteOnReport(event, potholeID, reportID, isUpvote){
    //Sets the voteData to reflect the user's vote type.
    let voteData = {
        "upvote" : isUpvote,
    }

    //Gets all of the relevant handles for buttons, counters, and mesage areas.
    let netVotesCounter = document.querySelector(`#netVotes-${reportID}`)
    let accordionVotesCounter = document.querySelector(`#accordionNetVotes-${reportID}`)

    let upvoteButton = document.querySelector(`#castedUpvote-${reportID}`)
    let downvoteButton = document.querySelector(`#castedDownvote-${reportID}`)
    
    let messageArea = document.querySelector(`#voteOutcomeMessage-${reportID}`)

    //Sends the vote request to the server for the pothole and reportID.
    let result = await sendRequest(SERVER + `/api/vote/pothole/${potholeID}/report/${reportID}/vote`, "POST", voteData);
    
    //If there was an error in voting, display the login error. (The only type of error possible)
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<b class="text-danger text-center">Please login to vote!</b>`
    } else {
        //Updates the message area to a success message and attempts to update the colors, text and counter.
        messageArea.innerHTML = `<b class="text-success text-center">${result["message"]}</b>`

        try {
            //Gets the updated vote report.
            let updatedReport = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "GET");
            
            //Recalculates the votes, text colors and button colors.
            newNetVotes = calculateNetVotes(updatedReport)
            let color = determineTextColor(newNetVotes)

            let updatedDownvoteButtonColor = await determineDownVoteButtonColor(updatedReport)
            let updatedUpvoteButtonColor = await determineUpVoteButtonColor(updatedReport)

            //Replaces the buttons, text, and counters for the updated report.
            netVotesCounter.innerHTML = newNetVotes
            accordionVotesCounter.innerHTML = `<span class="font-monospace ${color}">${(newNetVotes <= 0 ? "" : "+")}<span id="accordionNetVotes-${updatedReport.reportID}">${newNetVotes}</span></span>`
            upvoteButton.innerHTML = `<button id="castedUpvote-${updatedReport.reportID}" type="button" class="btn ${updatedUpvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, true)">
                                        <i class="bi bi-arrow-up"></i>
                                    </button>`
            downvoteButton.innerHTML = `<button id="castedDownvote-${updatedReport.reportID}" type="button" class="btn ${updatedDownvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, false)">
                                            <i class="bi bi-arrow-down"></i>
                                        </button>`
        } catch(e){
            //If any errors occur, print the errors.
            console.log(e)
        }
    }
}

//Gets the councillor data for the election year and constituency ID and returns it.
async function getCouncillorData(electionYear, constituencyID){
    let url = `${PICONG_SERVER}?year=${electionYear}&district=${constituencyID}`
    let councillorData = await sendRequest(url, "GET")
    return councillorData;
}

//Loads the councillor data for the constituency into the pothole information pane.
async function loadConstituencyData(constituencyID){
    //Gets the councillor data for the constituencyID and election year.
    let councillorData = await getCouncillorData(ELECTION_YEAR, constituencyID)

    let councillorInformationArea = document.querySelector("#councillorInformation")

    //Attempts to populate the councillor information area with the formatted information.
    try {
        councillorInformationArea.innerHTML = 
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
    //If there was an error formatting or accessing the data, display an error message saying that no constituency information is available.
        councillorInformationArea.innerHTML = `<div class="d-flex justify-content-center my-3"><strong>No constituency information available!</strong></div>`
    }
}

//https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
//Determines if the current device is a mobile device.
function isMobileDevice(){
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
}

//Displays the selected image after the user has chosen their upload.
function showImage(){
    //Gets the uploaded image file.
    const image = event.target.files[0];
    console.log(image)
    const displayImage = document.getElementById("pothole-img");
    try {
        //Displays the image as a preview.
        displayImage.src = URL.createObjectURL(image);
        displayImage.hidden = false;
    } catch(e){
        //For any error , hide the image and resets the source.
        displayImage.hidden = true;
        displayImage.src = "";
    }
}

//Removes the selected image as the upload image.
function removeImage(){
    const displayImage = document.getElementById("pothole-img");
    
    //Attempts to remove the image from the report page.
    try {
        var image = document.querySelector('#photoContainer');
        //Resets the file input field.
        image.innerHTML = `<input id="photo" class="form-control-file" type="file" accept="image/*" onchange="showImage()" hidden> `
        //Hides the preview and resets the source.
        displayImage.src = "";
        displayImage.value = "";
        displayImage.hidden = true;
        image.value = ""
    } catch(e){
        //If there are any errors in removing the image, log them.
        console.log(e)
    }
}

//Disables the back button to prevent issues on mobile.
function disableBackButton(){
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function() {
        window.history.go(1);
    };
}


//Used to display a toast with a message.
function displayToast(type, message) {
    //Creates the id for the notification using the date.
	var id= new Date() + '-' + "notification"
    //Creates a new div and sets the meassge content.
	var div = document.createElement('div');
	div.textContent = message;

    //Sets the attributes of the toast div.
	div.setAttribute('id', id)
	div.setAttribute('class', '');
  
    //Sets the color of the div based on the message type.
	if( type=='success'){
		div.setAttribute('class', "message success show");    
	} else {
		div.setAttribute('class', "message failed show");
	}
  
    //Adds the toast to the DOM.
  	document.getElementById('mainTabContent').appendChild(div);

	// After 4 seconds, remove the show class from DIV
	setTimeout(() => { 
		console.log(id)
		let element = document.getElementById(id);
		element.className = element.className.replace("show", "hide"); 
	}, 4000);
}

//Facilitates the submission of a driver report for processing at the backend.
async function postDriverReport() {
	//Builds the driver report; without images and description.
  	await buildReport(null, null, DRIVER_REPORT_URL);
}

//Generates the report using the photoURL, description, and endpoint URL.
async function buildReport(photoURL = null, description, url) {
	var latitude, longitude;
	
	//Checks to see if the device supports geolocation.
	if (navigator.geolocation) {
		//Gets the current geoposition of the device.
		navigator.geolocation.getCurrentPosition(async (position) => {
			//If the coordinates are successfully obtained, store them.
			latitude = position.coords.latitude;
			longitude = position.coords.longitude;
			
			//Sends the report to the endpoint and stores the results.
			let results = await sendReport(latitude, longitude, photoURL, description, url)

			//Prints the results of sending the report.
			try {
				if("msg" in results){
					displayToast("failed", "You must be logged in to report a pothole!")
				} else if("error" in results){
					displayToast("failed", results["error"])
				} else if("message" in results){
					displayToast("success", results["message"])
				}
			} catch (e) {
				displayToast("failed", e.message)
			}

		}, function(){
		//If the coordinates were not succesfully obtained, display an error.
			//If the latitude and longitude could not be obtained, display an error message.
			if(longitude == null || latitude == null){
				//Displays error message as a toast.
				displayToast("failed", "Unfortunately we couldn't find your coordinates!")
			}
		})
 	} else {
	//If the device does not support geolocation, display an error message.
		displayToast("failed", "unfortunately we couldn't find your coordinates!")
	}
}

//Sends a generated report to the endpoint URL.
async function sendReport(latitude, longitude, photoURL, description = null, url){
	

    var inMap = leafletPip.pointInLayer([longitude, latitude], map);

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
	if(photoURL != null){
		data["images"] = [photoURL];
	}
	
	//Attempts to send the request to the endpoint with the data, and returns the outcome.
	try {
		return await sendRequest(url, "POST", data)
	} catch (error) {
		console.log(`Error: ` + error)
		return error;
	}
}

//Bootstraps the application by adding the relevant listeners, toggles, and other initialization procedures.
function main(){
    //Determines the user context.
    identifyUserContext()
    //Disables the back button
    disableBackButton()
    //Adds a listener to the driver report button.
    document.getElementById('submit-driver-report').addEventListener('click', postDriverReport);

    //Gets the sidebar toggle and updates its state, locally on the device, whenever it is clicked.
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
}

//Once the DOM has loaded, bootstrap the application.
window.addEventListener('DOMContentLoaded', main);