// Imports firebase credentials for connecting to firebase storage app
const firebaseConfig = {
    apiKey: "AIzaSyAFJQVYCaIhUWHoEIAhllfXK6sZdq6zgws",
    authDomain: "spotdpoth.firebaseapp.com",
    projectId: "spotdpoth",
    storageBucket: "spotdpoth.appspot.com",
    messagingSenderId: "762264703594",
    appId: "1:762264703594:web:355f7105be2eeda5f33013"
};

var dashboardMap;
let dashboardMarkersLayer;
let dashboardMarkers = [];

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const channel = new BroadcastChannel('sw-messages');

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});


// Handles the submission of a standard pothole report for both image and non-image cases.
async function handleStandardReport() {
	//Get the single file input
	const file = document.querySelector('#photo').files[0];
    let currentUser = await identifyUser();

    let photoB64 = ""
	//If a valid file was uploaded, upload it to firebase.
	if (file != null) {
		//Determines if the file is not an image.
		console.log(file.type)
		if(!(['image/png', 'image/jpeg', 'image/gif', 'image/jpg'].includes(file.type))){
			alert("This file is not an image!")
			return;
		}

        photoB64 = await toBase64(file)
	} else {
		photoB64 = null;
	}

    let description = document.getElementById("descriptionText").value;
	await buildReport(photoB64, description, STANDARD_REPORT_URL)
}

// Handles the submission of a standard pothole report for both image and non-image cases.
async function handleAddImage(event, potholeID, reportID) {
    event.preventDefault();
	//Get the single file input
	const file = document.querySelector('#dashboardPhoto').files[0];

    //Get the upload progress text area.
	let uploadProgress = document.querySelector("#dashboardUploadProgress")
    let currentUser = await identifyUser();

	//If a valid file was uploaded, upload it to firebase.
	if (file != null && "email" in currentUser) {
		//Determines if the file is not an image.
		console.log(file.type)
		if(!(['image/png', 'image/jpeg', 'image/gif', 'image/jpg'].includes(file.type))){
			alert("This file is not an image!")
			return;
		}

        photoB64 = await toBase64(file)
		await addImageToReport(photoB64, potholeID, reportID)
	} else {
        uploadProgress.innerHTML = `<strong>No image selected!</strong>`
	}
}


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

        if(method == "POST"){
            console.log("This is a post request!")
            let form_data = {
                "form_data" : request
            }

            navigator.serviceWorker.ready.then(worker => {
                worker.active.postMessage(form_data)
            });

            //navigator.serviceWorker.controller.postMessage(form_data)  // <--- This line right here sends our data to sw.js
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

        if("error" in results){
            if(results["error"] == "User is banned."){
                window.localStorage.removeItem('access_token');
                alert("You have been banned!")
                window.location = "/"
                return;
            }
        }

        //Otherwise, return the parsed results.
        return results;
    } catch (e){
        console.log(e)
        //If unable to send the request, return an error.
        if(e instanceof TypeError && !window.navigator.onLine){
            return {"error" : "Please go online to use this feature!"};
        }
        
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
    let access_token = window.localStorage.getItem("access_token")

    //Writes the appropriate menu options to the user context actions for login/register, or logout.
    let userStateArea = document.querySelector("#userContextGroup");
    let userNameArea = document.querySelector("#userNameArea");
    let menuArea = document.querySelector("#profileArea");
    let reportButtonArea = document.querySelector("#driverReportButtonArea");
    if("email" in user && access_token){
        userStateArea.innerHTML = `<li><a class="" href="#" onclick="logout()"><i class='bi bi-box-arrow-left'></i> <span>Logout</span></a></li>`
                                    //` <h6 class="text-center "><a data-bs-toggle="modal" data-bs-target="#profileManagementModal" class="text-primary fw-bold text-decoration-underline"><i class="bi bi-person-lines-fill"></i> ${user.firstName} ${user.lastName}</a></h6>
                                  //  <hr class="my-0">
        userNameArea.innerHTML = `<h1 class="text-light">${user.firstName} ${user.lastName}</h1>`
        menuArea.innerHTML = `<li><a href="#profile" data-bs-toggle="modal" data-bs-target="#profileManagementModal"><i class="bi bi-person-fill"></i> <span>Profile</span></a></li>`
        reportButtonArea.innerHTML = `<i class="bi bi-plus d-xl-none" data-bs-toggle="modal" data-bs-target="#driverReportModal" id="driverReportButton"></i></button>`
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


    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    let messageArea = document.querySelector("#userRegisterMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">Registration successful!</b>
                                </div>`
    
    }

}

//Facilitates the registration of a user when the register form is submitted.
async function verifyEmail(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let token = form.elements["emailToken"].value;

    let verifyDetails = {
        "email" : form.elements["emailVerifyActual"].value,
    }

    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/confirm/" + token, "PUT", verifyDetails);
    let messageArea = document.querySelector("#verificationMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">${result["message"]}</b>
                                </div>`
    }

}


//Facilitates the registration of a user when the register form is submitted.
async function resendConfirmationEmail(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;

    let resendDetails = {
        "email" : form.elements["resendConfirmationEmailField"].value,
    }
    
    form.reset();

    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resendConfirmation", "POST", resendDetails);
    let messageArea = document.querySelector("#resendConfirmationMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">${result["message"]}</b>
                                </div>`
    }

}

//Facilitates the registration of a user when the register form is submitted.
async function resetPassword(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let token = form.elements["resetToken"].value;
    let resetDetails = {
        "email" : form.elements["emailResetToken"].value,
        "password" : form.elements["rPassword"].value,
        "confirmPassword" : form.elements["rConfirmPassword"].value,
    }

    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resetPassword/" + token, "POST", resetDetails);
    let messageArea = document.querySelector("#resetPasswordMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">${result["message"]}.</b>
                                </div>`
    }

}


//Facilitates the registration of a user when the register form is submitted.
async function sendResetPassword(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let resetDetails = {
        "email" : form.elements["resetPassword-email"].value,
    }

    form.reset();

    //Submits the registration request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resetPassword", "POST", resetDetails);
    let messageArea = document.querySelector("#sendResetPasswordMessage")

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">${result["message"]} Check your email and use the utility tab above to reset your password.</b>
                                </div>`
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

    let numberOfReportsContainer = document.querySelector('#numberOfReportsArea')
    numberOfReportsContainer.innerHTML = `${potholeReports.length} Report`;
    if(potholeReports.length > 1)
    numberOfReportsContainer.innerHTML +=`s`

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
                    allReportImages = `<div id="noImageContainer" class="d-flex justify-content-center"><span class="border border-1 border-white rounded-3 px-3 py-5"><strong >No report images uploaded!</strong><span></div>`
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
                
                var newDate = dateConvert(report.dateReported);
                //Creates and appends the accordion item containing the report information.
                allReportsContainer.innerHTML += 
                `<div class="accordion-item rounded-0">
                    <h2 class="accordion-header" id="heading-${report.reportID}">
                    <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${report.reportID}">
                         <div><span class="font-monospace ${color}" id="accordionNetVotes-${report.reportID}">${(netVotes <= 0 ? "" : "+")}<span>${netVotes}</span></span> | ${report.reportedBy} - (${newDate})  </div>
                    </button>
                    </h2>
                    <div id="collapse-${report.reportID}" class="accordion-collapse collapse" data-bs-parent="#reportAccordion">
                        <div class="accordion-body">
                            <div class="text-center">
                                <strong class="text-center">Images</strong>
                            </div>
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

                            <div class="text-center">
                                <strong>Description</br></strong>
                                ${report.description}
                            </div>

                            <hr class="my-3">
                            <div id="votingArea" class="text-center">
                                <strong>Votes</strong><br>

                                <div class="my-3">
                                    <span id="castedDownvote-${report.reportID}">
                                        <button  type="button" class="btn ${downvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${report.reportID}, false)">
                                            <i class="bi bi-arrow-down"></i>
                                        </button>
                                    </span>
                                    <strong class="px-3 ${color}" id="netVotes-${report.reportID}">${netVotes}</strong>
                                    <span id="castedUpvote-${report.reportID}">
                                        <button type="button" class="btn ${upvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${report.reportID}, true)">
                                            <i class="bi bi-arrow-up"></i>
                                        </button>
                                    </span>
                                </div>
                                <span id="voteOutcomeMessage-${report.reportID}"></span>
                            </div>
                            
                            
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
    let reportModal = document.querySelector("#standardReportModal");

    let user = await identifyUser();

    if("error" in user || "msg" in user){
        reportArea.innerHTML = `<div class="mt-5 text-center text-black">
                                        <h2>User is not logged in!</h2>
                                        <p>${user["error"]}</p>
                                    </div>`
        //reportModal.innerHTML = `<div class="modal-dialog">
        //                            <div class="modal-content">
        //                                <div class="modal-header justify-content-center">
        //                                    <h2>User is not logged in!</h2>
        //                                </div>
        //                                <div class="modal-body text-center">
        //                                    <p>${user["error"]}</p>
        //                                </div>
        //                               <div class="modal-footer"></div>
        //                            </div>
        //                        </div>`
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
                <button data-bs-target="#standardReportModal" data-bs-toggle="modal" id="standard-button" onclick="updateLocalCoords()" type="button" class="btn btn-primary py-5">Standard Report</button>                       
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
        if(!window.navigator.onLine){
            councillorModalInfo.innerHTML = `<div class="text-center"><b class="text-danger text-center">Please visit this page when online to save for offline use!</b><div>`
        } else {
            //If the fields of the councillor data cannot be accessed, display that no constituency councillor information is available.
            councillorModalInfo.innerHTML = `<div class="d-flex justify-content-center my-3"><strong>No constituency information available!</strong></div>`
        }
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
        if(!window.navigator.onLine && "error" in result){
            messageArea.innerHTML = `<b class="text-danger text-center">Vote will be synced once reconnected!</b>`
        } else {
            messageArea.innerHTML = `<b class="text-danger text-center">Please login to vote!</b>`
        }
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
        <div class="text-center text-white"><strong>COUNCILLOR INFORMATION</strong></div>
        <table class="table my-2 table-borderless text-white">
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
        if(!window.navigator.onLine){
            councillorInformationArea.innerHTML = `<div class="text-center"><b class="text-danger text-center">Please visit this page when online to save for offline use!</b><div>`
        } else {
            //If there was an error formatting or accessing the data, display an error message saying that no constituency information is available.
            councillorInformationArea.innerHTML = `<div class="d-flex justify-content-center my-3"><strong>No constituency information available!</strong></div>`
        }
    }
}

//https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
//Determines if the current device is a mobile device.
function isMobileDevice(){
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgentData.mobile||navigator.vendor||window.opera);
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
	var id = Date.now() + ' - ' + "notification_" + (Math.random() + 1).toString(36).substring(5);
    //Creates a new div and sets the meassge content.
	var div = document.createElement('div');
	div.textContent = message;

    //Sets the attributes of the toast div.
	div.setAttribute('id', id)
	div.setAttribute('class', '');
  
    //Sets the color of the div based on the message type.
	if( type=='success'){
		div.setAttribute('class', "message success show");    
	} else if (type=='sync'){
        div.setAttribute('class', "message sync show");  
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
	}, 3000);
}

//Facilitates the submission of a driver report for processing at the backend.
async function postDriverReport() {
	//Builds the driver report; without images and description.
  	await buildReport(null, null, DRIVER_REPORT_URL);
}

async function updateLocalCoords(){
    var latitude, longitude;

    let coordTextArea = document.querySelector("#coordinatesText");
	
	//Checks to see if the device supports geolocation.
	if (navigator.geolocation) {
		//Gets the current geoposition of the device.
		navigator.geolocation.getCurrentPosition(async (position) => {
			//If the coordinates are successfully obtained, store them.
			latitude = position.coords.latitude;
			longitude = position.coords.longitude;

            console.log(latitude, longitude)

            localStorage.setItem("latitude", latitude)
            localStorage.setItem("longitude", longitude)

		}, function(){
		//If the coordinates were not succesfully obtained, display an error.
			//If the latitude and longitude could not be obtained, display an error message.
			if(longitude == undefined || latitude == undefined){
				//Displays error message as a toast.
                localStorage.setItem("latitude", latitude)
                localStorage.setItem("longitude", longitude)
				displayToast("failed", "Unfortunately we couldn't find your coordinates!")
			}
		})
 	} else {
        localStorage.setItem("latitude", latitude)
        localStorage.setItem("longitude", longitude)
	    //If the device does not support geolocation, display an error message.
		displayToast("failed", "Unfortunately we couldn't find your coordinates!")
	}

    latitude = localStorage.getItem("latitude")
    longitude = localStorage.getItem("longitude")

    coordTextArea.placeholder = `Latitude: ${latitude}, Longitude: ${longitude}`
}

//Generates the report using the photoURL, description, and endpoint URL.
async function buildReport(photoB64, description, url) {
	var latitude, longitude;

    try {
        latitude = parseFloat(localStorage.getItem("latitude"))
        longitude = parseFloat(localStorage.getItem("longitude"))
    } catch(e){
        console.log("Unable to retrieve latitude and longitude coordaintes.")
        latitude = undefined;
        longitude = undefined;
    }


	console.log(latitude, longitude)
	//Checks to see if the device supports geolocation.
	if (longitude != undefined && latitude != undefined) {
        //Sends the report to the endpoint and stores the results.
        let results = await sendReport(latitude, longitude, photoB64, description, url)
        console.log(results)
        //Prints the results of sending the report.
        try {
            if("msg" in results){
                displayToast("failed", "You must be logged in to report a pothole!")
            } else if("error" in results && !window.navigator.onLine){
                displayToast("failed", "Your report will sync once you reconnect to the internet!")
            } else if("error" in results){
                displayToast("failed", results["error"])
            } else if("message" in results){
                displayToast("success", results["message"])
            }
        } catch (e) {
            displayToast("failed", e.message)
        }
 	} else {
        console.log("One of them is undefined!")
	    //If the device does not support geolocation, display an error message.
		displayToast("failed", "Unfortunately we couldn't find your coordinates!")
	}
}

//Sends a generated report to the endpoint URL.
async function sendReport(latitude, longitude, photoB64, description = null, url){
	
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

//Accepts a date in the format YYYY-MM-DD and returns it in the form DD-MMM-YYYY
function dateConvert(date){
    const temp = report.dateReported.split('-')
    var newDate = temp[2];
    if(temp[1] == '01')
        newDate += ' Jan '
    if(temp[1] == '02')
        newDate += ' Feb '   
    if(temp[1] == '03')
        newDate += ' Mar '
    if(temp[1] == '04')
        newDate += ' Apr ' 
    if(temp[1] == '05')
        newDate += ' May ' 
    if(temp[1] == '06')
        newDate += ' Jun ' 
    if(temp[1] == '07')
        newDate += ' Jul ' 
    if(temp[1] == '08')
        newDate += ' Aug ' 
    if(temp[1] == '09')
        newDate += ' Sep ' 
    if(temp[1] == '10')
        newDate += ' Oct ' 
    if(temp[1] == '11')
        newDate += ' Nov ' 
    if(temp[1] == '12')
        newDate += ' Dec '   
    newDate += temp[0]  
    return newDate;
}

//Bootstraps the application by adding the relevant listeners, toggles, and other initialization procedures.
async function main(){
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

    document.getElementById('submit-passenger-report').addEventListener('click', handleStandardReport);

    window.addEventListener("offline", (event)=>{
        displayToast("failed", "Your network connection has been lost!")
    })

    window.addEventListener("online", (event)=>{
        displayToast("success", "Network connection established!")
    })

    
    channel.addEventListener('message', event => {
        if("message" in event.data){
            displayToast("sync", event.data["message"])
        } else {
            displayToast("failed", event.data["error"])
        }
        displayPotholes();
    });

    let user = await identifyUser();
    if(!("error" in user || "msg" in user)){
        await initDashboardMap();
        displayUserPotholes();
    }

}


async function initDashboardMap(){
    dashboardMap = L.map('dashboardMap', {
        center: [10.69, -61.23],
        zoom: 9,
        minZoom: 10
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(dashboardMap);

    /*
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoidGhlaHVtYW4iLCJhIjoiY2t3YXJoeTdhMm1ocDJxbW4wMXpuc2NhbCJ9.j0jEiwJsxa-Gm2DMb6Fdzw'
    }).addTo(map);
    */
}


async function getUserPotholes(){
    let potholes = await sendRequest(SERVER + '/api/dashboard/potholes', 'GET');

    return potholes;
}

async function getUserReportImages(potholeID, reportID){
    let images = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images`, 'GET');
    console.log(images);

    return images;
}

//gets the dashboard modal
function getDashboardModal(){
    var modalElementList = [].slice.call(document.querySelectorAll('.dashboardModal'))
    var modalList = modalElementList.map(function (modalEl) {
        return new bootstrap.Modal(modalEl)
    })

    for(const modal of modalList){
        if(modal._element.id === 'dashboardModal'){
            return modal;
        }
    }
}

//function responsible for displaying the potholes on the map
async function displayUserPotholes(){
    if(dashboardMarkers)
        dashboardMarkers = []
    if(dashboardMarkersLayer)
        dashboardMarkersLayer.clearLayers();

    //adds a markers layer to the map
    dashboardMarkersLayer = L.layerGroup().addTo(dashboardMap); 

    let potholes = await getUserPotholes();
    if(potholes.length > 0){
        for(let pothole of potholes){
            try {
                //create a new marker object with the constituency name, pothole id and constituency id
                let marker = L.marker([pothole.latitude, pothole.longitude], {
                    potholeID: pothole.potholeID
                }).on('click', async function(){

                    loadUserReport(pothole.potholeID);


                    var dashboardModal = getDashboardModal();
                    dashboardModal.toggle();

                    //load reports and constituency data when the marker is clicked
                    //loadReports(this.options.potholeID);
                    //loadConstituencyData(this.options.constituencyID)
                    
                    //toggle the offcanvas
                    //var offCanvasReport= getOffCanvas();
                    //offCanvasReport.toggle();
                }).bindPopup(pothole.numReports + " Report(s)").addTo(dashboardMarkersLayer);
                dashboardMarkers.push(marker)
            } catch (e){
                console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
            }
        }   
    } 
    
    setTimeout(() => {
        map.invalidateSize();
    }, 500);
}

async function loadUserReport(potholeID){
    let dashboardTitle = document.querySelector("#dashboard-title");
    let dashboardBody = document.querySelector("#dashboard-body");
    let dashboardFooter = document.querySelector("#dashboard-footer");

    dashboardTitle.innerText = "Your Report";

    try {
        var potholeReport = await getIndividualReport(potholeID);
        var reportedImages = await getUserReportImages(potholeID, potholeReport.reportID)
    } catch (e){
        console.log(e)
    }

    if(!window.navigator.onLine){
        dashboardBody.innerHTML = `<div class="mt-5 text-center text-black">
                                    <h2>Unavailable!</h2>
                                    <p>Sorry, the dashboard is only available in online mode.</p>
                                </div>`;
        return;
    }

    allReportImages = ""

    //Attempts to load the reports into the pane.
    try {
        //Determines if there are pothole images to be added. If not, display a message.
        if(reportedImages.length == 0){
            allReportImages = `<div class="d-flex justify-content-center mt-3"><strong>No report images uploaded!</strong></div>`
        } else {
        //Otherwise, iterate over all of the images and add them to the image carousel for the report.
            let tag = "active"
            let i = 0
            for(reportImage of reportedImages){
                if(i > 0)
                    tag = ""
                allReportImages +=
                `<div class="carousel-item ${tag}">
                    <img src="${reportImage.imageURL}" style="height: 300px; background-position: center center; object-fit: cover; background-repeat: no-repeat; z-index: 9995" class="d-block w-100">
                    <div class="carousel-caption d-none d-md-block mt-5 pt-5">
                        <button type="button" id="deleteImageButton" dashDeleteReportImage()" data-bs-toggle="collapse" data-bs-target="#dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}" aria-expanded="false" aria-controls="collapseExample" class="btn btn-danger"><i class="bi bi-trash"></i> Delete Image</button>
                        <div class="collapse" id="dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}">
                            <div class="card card-body text-white mt-3" style="background: #050d18;">
                                <b>Confirm image deletion?</b>
                                <button type="button" data-bs-toggle="collapse" onclick="deleteImageFromReport(event, ${potholeReport.potholeID}, ${potholeReport.reportID}, ${reportImage.imageID})" data-bs-target="#dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}" aria-expanded="false" aria-controls="collapseExample" class="btn btn-danger my-2">Delete Image</button>
                                <button type="button" data-bs-toggle="collapse" data-bs-target="#dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}" aria-expanded="false" aria-controls="collapseExample" class="btn btn-secondary my-2">Close</button>
                            </div>
                        </div>
                    </div>
                </div>`
                i++;
            }
        }  
    } catch(e){
        //If any error occurs, display that there were no reports for ht pothole.
        allReportImages = `<div class="d-flex justify-content-center mt-3"><strong>Error retrieving images for report!</strong></div>`
    }


    if(report != null){
        console.log(report)
        dashboardBody.innerHTML = 
        `
        <ul class="nav nav-pills nav-justified mb-3 w-100" id="pills-tab-dashboard" role="tablist" style="background: #040b14">
            <li class="nav-item" role="presentation">
                <button class="btn btn-dark nav-link active" id="pills-image-tab"  data-bs-toggle="pill" data-bs-target="#pills-imageTab" type="button" role="tab" aria-controls="pills-home" aria-selected="true">Images</button>
            </li>

            <li class="nav-item" role="presentation">
                <button class="btn btn-dark nav-link" id="pills-description-tab"  data-bs-toggle="pill" data-bs-target="#pills-descriptionTab" type="button" role="tab" aria-controls="pills-profile" aria-selected="false">Description</button>
            </li>

            <li class="nav-item" role="presentation">
                <button class="btn btn-dark nav-link" id="pills-delete-tab"  data-bs-toggle="pill" data-bs-target="#pills-deleteTab" type="button" role="tab" aria-controls="pills-delete" aria-selected="false">Delete</button>
            </li>
        </ul>

        <div class="tab-content" id="pills-dashboardContent">

            <div class="tab-pane fade show active mt-4" id="pills-imageTab" role="tabpanel" aria-labelledby="pills-home-tab">
        
                <p class="fw-bold " for="editImages-${report.reportID}">Pothole Images</p>
                <div id="dashCarouselReport-${potholeReport.reportID}" class="carousel slide my-2" data-bs-ride="carousel">
                    <div id="dashReportImages-${potholeReport.reportID}" class="carousel-inner">
                        ${allReportImages}
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#dashCarouselReport-${potholeReport.reportID}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#dashCarouselReport-${potholeReport.reportID}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    </button>
                </div>
                

                <p> 
                    <div class="d-flex justify-content-center">
                        <a class="btn btn-primary" data-bs-toggle="collapse" href="#addReportImage-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class="bi bi-plus-medical"></i>
                            Add Image
                        </a>
                    </div>
                </p>

                <div class="collapse" id="addReportImage-${report.reportID}">
                    <div class="text-white mb-2">

                        <!-- Image Preview Area -->
                        <div id ="dashboard-img-container" class="d-flex justify-content-around">
                            <img id="dashboard-pothole-img" class="w-100" src="" hidden/>
                        </div>
                        
                        <!-- Image Upload Area --> <!-- Refactor again -->
                        <div class="input-group justify-content-center mt-5 mb-5">
                            <button class="btn btn-outline-transparent" > 
                                <label class="input-group-text " for="dashboardPhoto"><i class="bi bi-images"></i> <div class="ms-2">Select Image </div></label>
                            </button>
                            <button onclick="removeDashboardImage()" class="btn btn-danger rounded">x</button>
                            <div id="dashboardPhotoContainer">
                                <input id="dashboardPhoto" class="form-control-file" type="file" accept="image/*" onchange="showDashboardImage()" hidden> 
                            </div>
                            
                        </div>
                        <div class="text-center mb-3" id="dashboardUploadProgress"></div>
                        <div class="d-flex justify-content-center">
                            <button onclick="handleAddImage(event, ${report.potholeID}, ${report.reportID})" class="btn btn-primary"><i class='bi bi-camera-fill'></i> Add</button> 
                        </div>
                    </div>
                </div>

                <div class="mt-3" id="imageUpdateMessage"></div>
            </div>

            <div class="tab-pane fade show mt-4" id="pills-descriptionTab" role="tabpanel" aria-labelledby="pills-home-tab">
                <div class="form-group mb-2">
                    <label class="fw-bold" for="editDescription-${report.reportID}">Pothole Description</label>
                    <p class="ms-3 mt-2">${report.description}</p>
                </div>

                <p>
                    <div class="d-flex justify-content-center">
                        <a class=" btn btn-primary mt-4" data-bs-toggle="collapse" href="#editPotholeDescription-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class='bi bi-pencil' ></i>
                            Edit Description
                        </a>
                    </div>
                </p>

                <div class="collapse" id="editPotholeDescription-${report.reportID}">
                    <div class="text-white mb-2">
                        <form class="form-group mb-1" onsubmit="updatePotholeDescription(event, ${report.potholeID}, ${report.reportID})">
                            
                            <input type="text" id="updatePotholeDescription-${report.reportID}" class="text-muted form-control mt-2" name="description" value="${report.description}" required>
                            <br>
                            <div class="d-flex justify-content-center">
                                <button type="submit" class="btn btn-primary">Update</button>
                            </div>
                            <div class="mt-3" id="updateDescriptionMessage"></div>
                        </form>
                        
                    </div>

                </div>
            </div>

            <div class="tab-pane fade show mt-4" id="pills-deleteTab" role="tabpanel" aria-labelledby="pills-home-tab">
                <p>

                    <label class="fw-bold" for="editDescription-${report.reportID}">Delete Pothole</label>
                    <div class="d-flex justify-content-center mt-3">
                        <button class="btn btn-danger w-100 py-5" data-bs-toggle="collapse" href="#deletePotholeReport-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class='bi bi-trash'></i>
                            Delete
                        </button>
                    </div>
                </p>
                <div class="mt-4 collapse" id="deletePotholeReport-${report.reportID}">
                    <div class="text-white text-center">
                        <b>Are you sure you want to delete this report?</b><br>
                        <div class="mt-4 text-center">
                            <button onclick="deletePotholeReport(event, ${report.potholeID}, ${report.reportID})" class="btn btn-danger me-3">Confirm</button>
                            <button class="btn btn-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#deletePotholeReport-${report.reportID}" aria-expanded="false" aria-controls="collapseExample">
                                Close
                            </button>
                        </div>
                        <div class="mt-3" id="deletePotholeMessage"></div>
                    </div>
                </div>
            </div>
        </div>  
        `
        
      
        /*
        `<p>${report.dateReported}</p>
        <p>${report.description}</p>
        <p>${report.potholeID}</p>
        <p>${report.reportID}</p>
        <p>${report.reportedBy}</p>
        <p>${report.reportedImages}</p>
        <p>${report.userID}</p>
        <p>${report.votes}</p>`
        */
    } else {
        dashboardBody.innerHTML = `<p>An error has occurred!</p>`
    }
}



async function deletePotholeReport(event, potholeID, reportID){
    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "DELETE");
    let messageOutcomeArea  = document.querySelector("#deletePotholeMessage");

    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center">Pothole Deleted Successfully!</b>
                                        </div>`;

        loadDashboard();
        displayPotholes();
    }

}

async function updatePotholeDescription(event, potholeID, reportID){
    event.preventDefault();

    let form = event.target;

    let newDescription = {
        "description" : form.elements["description"].value
    }

    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "PUT", newDescription);
    let messageOutcomeArea  = document.querySelector("#updateDescriptionMessage");

    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <div class="spinner-border text-success mb-2" role="status"></div><br>
                                            <b class="align-middle text-success text-center">Description Updated Successfully!</b>
                                        </div>`;
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}


async function changePassword(event){
    event.preventDefault();

    let form = event.target;

    let passwordDetails = {
        "oldPassword" : form.elements["oldPassword"].value,
        "password" : form.elements["password"].value,
        "confirmPassword" : form.elements["confirmPassword"].value
    }

    let result = await sendRequest(SERVER + `/user/password`, "PUT", passwordDetails);
    let messageOutcomeArea  = document.querySelector("#updatePasswordMessage");

    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center">Password Updated Successfully!</b>
                                        </div>`;     
    }
}

async function updateProfile(event){
    event.preventDefault();

    let form = event.target;

    let profileDetails = {
        "firstName" : form.elements["firstName"].value,
        "lastName" : form.elements["lastName"].value,
    }

    let result = await sendRequest(SERVER + `/user/profile`, "PUT", profileDetails);
    let messageOutcomeArea  = document.querySelector("#updateProfileMessage");

    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center">Profile Updated Successfully!</b>
                                        </div>`;  
        await identifyUserContext()      
    }
}


async function loadProfileData(){
    let user = await identifyUser();

    let firstName = document.querySelector("#updateProfile-firstName")
    let lastName = document.querySelector("#updateProfile-lastName")

    let messageOutcomeArea  = document.querySelector("#updateProfileMessage");

    if("error" in user || "msg" in user){
        messageOutcomeArea.innerHTML = `<b class="text-danger text-center">User is not logged in.</b></div>`;
    } else {
        firstName.value = user["firstName"];
        lastName.value = user["lastName"];
    }
}

async function addImageToReport(photoB64, potholeID, reportID){
    let B64Image = {
        "images" : [photoB64]
    }

    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images`, "POST", B64Image);
    let messageOutcomeArea  = document.querySelector("#imageUpdateMessage");
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center mb-2">
                                            <div class="spinner-border text-success mb-2" role="status"></div><br>
                                            <b class="align-middle text-success text-center">Image Added successfully!</b>
                                        </div>`;
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}


async function deleteImageFromReport(event, potholeID, reportID, imageID){
    event.preventDefault();

    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images/${imageID}`, "DELETE");
    let messageOutcomeArea  = document.querySelector("#imageUpdateMessage");
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center mb-2">
                                            <div class="spinner-border text-success mb-2" role="status"></div><br>
                                            <b class="align-middle text-success text-center">Image Deleted Successfully!</b>
                                        </div>`;
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}


async function getIndividualReport(potholeID){
    let reports = await sendRequest(SERVER + `/api/dashboard/reports`, 'GET');
    try {
        for(report of reports){
            if(report.potholeID == potholeID){
                return report;
            }
        }
    } catch(e){
        console.log(e);
        return null
    }
}


async function loadDashboard(){
    let user = await identifyUser();
    let loginStateArea = document.querySelector("#dashboardMap");
    let dashboardMessage = document.querySelector("#dashboardMessage")


    if(!window.navigator.onLine){
        loginStateArea.style.visibility = "hidden"
        dashboardMessage.innerHTML = `<div class="mt-5 text-center text-black">
                                            <h2>Unavailable!</h2>
                                            <p>Sorry, the dashboard is only available in online mode.</p>
                                        </div>`
    } else {
        loginStateArea.style.visibility = "visible"
        dashboardMessage.innerHTML = ``
        if("error" in user || "msg" in user){
            loginStateArea.innerHTML = `<div class="mt-5 text-center text-black">
                                            <h2>User is not logged in!</h2>
                                            <p>${user["error"]}</p>
                                        </div>`
        } else {
            await displayUserPotholes();
            setTimeout(() => {
                dashboardMap.invalidateSize();
            }, 200);
        }
    }   
}

//Displays the selected image after the user has chosen their upload.
function showDashboardImage(){
    //Gets the uploaded image file.
    const image = event.target.files[0];
    console.log(image)
    const displayImage = document.getElementById("dashboard-pothole-img");
    try {
        //Displays the image as a preview.
        displayImage.src = URL.createObjectURL(image);
        console.log(displayImage.src)
        displayImage.hidden = false;
    } catch(e){
        //For any error , hide the image and resets the source.
        console.log("Error")
        displayImage.hidden = true;
        displayImage.src = "";
    }

    
}


//Removes the selected image as the upload image.
function removeDashboardImage(){
    const displayImage = document.getElementById("dashboard-pothole-img");
    
    //Attempts to remove the image from the report page.
    try {
        var image = document.querySelector('#dashboardPhotoContainer');
        //Resets the file input field.
        image.innerHTML = `<input id="dashboardPhoto" class="form-control-file" type="file" accept="image/*" onchange="showDashboardImage()" hidden> `
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

//Once the DOM has loaded, bootstrap the application.
window.addEventListener('DOMContentLoaded', main);


/**
* Template Name: iPortfolio - v3.7.0
* Template URL: https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function() {
    "use strict";
  
    /**
     * Easy selector helper function
     */
    const select = (el, all = false) => {
      el = el.trim()
      if (all) {
        return [...document.querySelectorAll(el)]
      } else {
        return document.querySelector(el)
      }
    }
  
    /**
     * Easy event listener function
     */
    const on = (type, el, listener, all = false) => {
      let selectEl = select(el, all)
      if (selectEl) {
        if (all) {
          selectEl.forEach(e => e.addEventListener(type, listener))
        } else {
          selectEl.addEventListener(type, listener)
        }
      }
    }
  
    /**
     * Easy on scroll event listener 
     */
    const onscroll = (el, listener) => {
      el.addEventListener('scroll', listener)
    }
  
    /**
     * Navbar links active state on scroll
     */
    let navbarlinks = select('#navbar .scrollto', true)
    const navbarlinksActive = () => {
      let position = window.scrollY + 200
      navbarlinks.forEach(navbarlink => {
        if (!navbarlink.hash) return
        let section = select(navbarlink.hash)
        if (!section) return
        if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
          navbarlink.classList.add('active')
        } else {
          navbarlink.classList.remove('active')
        }
      })
    }
    window.addEventListener('load', navbarlinksActive)
    onscroll(document, navbarlinksActive)
  
    /**
     * Scrolls to an element with header offset
     */
    const scrollto = (el) => {
      let elementPos = select(el).offsetTop
      window.scrollTo({
        top: elementPos,
        behavior: 'smooth'
      })
    }
  
    /**
     * Back to top button
     */
    let backtotop = select('.back-to-top')
    if (backtotop) {
      const toggleBacktotop = () => {
        if (window.scrollY > 100) {
          backtotop.classList.add('active')
        } else {
          backtotop.classList.remove('active')
        }
      }
      window.addEventListener('load', toggleBacktotop)
      onscroll(document, toggleBacktotop)
    }
  
    /**
     * Mobile nav toggle
     */
    on('click', '.mobile-nav-toggle', function(e) {
      select('body').classList.toggle('mobile-nav-active')
      this.classList.toggle('bi-list')
      this.classList.toggle('bi-x')
    })
  
    /**
     * Scrool with ofset on links with a class name .scrollto
     */
    on('click', '.scrollto', function(e) {
      if (select(this.hash)) {
        e.preventDefault()
  
        let body = select('body')
        if (body.classList.contains('mobile-nav-active')) {
          body.classList.remove('mobile-nav-active')
          let navbarToggle = select('.mobile-nav-toggle')
          navbarToggle.classList.toggle('bi-list')
          navbarToggle.classList.toggle('bi-x')
        }
        scrollto(this.hash)
      }
    }, true)
  
    /**
     * Scroll with ofset on page load with hash links in the url
     */
    window.addEventListener('load', () => {
      if (window.location.hash) {
        if (select(window.location.hash)) {
          scrollto(window.location.hash)
        }
      }
    });
  
    /**
     * Hero type effect
     */
    const typed = select('.typed')
    if (typed) {
      let typed_strings = typed.getAttribute('data-typed-items')
      typed_strings = typed_strings.split(',')
      new Typed('.typed', {
        strings: typed_strings,
        loop: true,
        typeSpeed: 100,
        backSpeed: 50,
        backDelay: 2000
      });
    }
  
    /**
     * Skills animation
     */
    let skilsContent = select('.skills-content');
    if (skilsContent) {
      new Waypoint({
        element: skilsContent,
        offset: '80%',
        handler: function(direction) {
          let progress = select('.progress .progress-bar', true);
          progress.forEach((el) => {
            el.style.width = el.getAttribute('aria-valuenow') + '%'
          });
        }
      })
    }
  
    /**
     * Porfolio isotope and filter
     */
    window.addEventListener('load', () => {
      let portfolioContainer = select('.portfolio-container');
      if (portfolioContainer) {
        let portfolioIsotope = new Isotope(portfolioContainer, {
          itemSelector: '.portfolio-item'
        });
  
        let portfolioFilters = select('#portfolio-flters li', true);
  
        on('click', '#portfolio-flters li', function(e) {
          e.preventDefault();
          portfolioFilters.forEach(function(el) {
            el.classList.remove('filter-active');
          });
          this.classList.add('filter-active');
  
          portfolioIsotope.arrange({
            filter: this.getAttribute('data-filter')
          });
          portfolioIsotope.on('arrangeComplete', function() {
            AOS.refresh()
          });
        }, true);
      }
  
    });
  
  
  })()