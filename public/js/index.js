// Imports firebase credentials for connecting to firebase storage app
const firebaseConfig = {
    apiKey: "AIzaSyAFJQVYCaIhUWHoEIAhllfXK6sZdq6zgws",
    authDomain: "spotdpoth.firebaseapp.com",
    projectId: "spotdpoth",
    storageBucket: "spotdpoth.appspot.com",
    messagingSenderId: "762264703594",
    appId: "1:762264703594:web:355f7105be2eeda5f33013"
};

// Dashboard Map, Layer and Markers Initialization
var dashboardMap;
let dashboardMarkersLayer;
let dashboardMarkers = [];
let userState = null;
var reportInProgress = false;


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Creates a function to convert a file to base64.
// Referenced from: Dmitri Pavlutin, March 29th 2016, https://stackoverflow.com/questions/36280818/how-to-convert-file-to-base64-in-javascript
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
    //Initializes the base64 image string.
    let photoB64 = ""
	//If a valid file was uploaded, upload it to firebase.
	if (file != null) {
		//Determines if the file is not an image.
        //If the file is not a particular format, alert the user and do not upload the file.
		if(!(['image/png', 'image/jpeg', 'image/gif', 'image/jpg'].includes(file.type))){
			alert("This file is not an image!")
			return;
		}

        //Converts the file to base64 and stores the string outcome.
        photoB64 = await toBase64(file)
	} else {
    //Otherwise, if no file was uploaded, set the base64 image content to null.
		photoB64 = null;
	}

    //Gets the description text from the form, and builds and send the report using the base64 image and description.
    let description = document.getElementById("descriptionText").value;
	buildReport(photoB64, description, STANDARD_REPORT_URL)
}

// Handles the submission of a standard pothole report for both image and non-image cases.
async function handleAddImage(event, potholeID, reportID) {
    //Prevents the page from reloading.
    event.preventDefault();

	//Get the single file input
	const file = document.querySelector('#dashboardPhoto').files[0];

    //Get the upload progress text area.
	let uploadProgress = document.querySelector("#dashboardUploadProgress")

	//If a valid file was uploaded, upload it to firebase.
	if (file != null) {
		//Determines if the file is not an image.
		if(!(['image/png', 'image/jpeg', 'image/gif', 'image/jpg'].includes(file.type))){
			alert("This file is not an image!")
			return;
		}
        //Converts the file to base64 and stores the string outcome.
        photoB64 = await toBase64(file)
        //Sends the base64 image to the backend to be added to the report specified by the potholeID and reportID.
		await addImageToReport(photoB64, potholeID, reportID)
	} else {
    //Otherwise, if no file was provided. Inform the user that no image was selected.
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

        //Creates the request with a body.
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
        
        //If the request is a post request, store the request in a key-value object, and send the object to the service worker.
        if(method == "POST"){
            //console.log("This is a post request!")
            //Creates the form data objec to hold the request.
            let form_data = {
                "form_data" : request
            }

            //If the service worker is ready, send the form data, containing the request, to the service worker for processing.
            navigator.serviceWorker.ready.then(worker => {
                worker.active.postMessage(form_data)
            });
        }

        //Carries out the requests and collects the results.
        let response = await fetch(url, request);
        let results = await response.json()

        //Removes the token and displays a message for expired access_tokens.
        if("msg" in results){
            if(results["msg"] == "Signature verification failed" || results["msg"] == "Token has expired"){
                window.localStorage.removeItem('access_token');
                alert("Session has expired!")
                window.location = "index.html"
                return;
            }
        }

        //If the request returned an error, check the error to determine if the user is banned and remove their token, or return the results.
        if("error" in results){
            //If the user is banned, remove their access token and alert them.
            if(results["error"] == "User is banned."){
                window.localStorage.removeItem('access_token');
                alert("You have been banned!")
                window.location = "index.html"
                return;
            }
        }

        //Otherwise, return the parsed results.
        return results;
    } catch (e){
        //console.log(e)
        //If unable to send the request, return an error.
        if(e instanceof TypeError && !window.navigator.onLine){
            return {"error" : "Please go online to use this feature!"};
        }
        
        //Otherwise, return an unexpected error.
        return {"error" : "An unexpected error has occurred!"};
    }
}

//Facilitates the logout of a user by removing their access token.
async function logout(){
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
    window.location = `index.html`
}

//Facilitates the login of a user based on their login information.
async function login(event){
    //Prevents the reloading of the page/
    event.preventDefault();

    //Gets and extracts the form data from the login form. Then resets the form.
    let form = event.target;

    //Creates the login details object out of the form values.
    let loginDetails = {
        "email" : form.elements["InputEmail"].value,
        "password" : form.elements["InputPassword"].value
    }

    //Sends the login request to the server and stores the result.
    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    //Gets the area to write the result.
    let messageArea = document.querySelector("#userLoginMessage")

    //Sets the result of logging in to the outcome area.
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
    //If the result is a success, set the returned access token in the storage, sets the outcome message, and refreshes the page.
        window.localStorage.setItem("access_token", result["access_token"]);
        messageArea.innerHTML = `<b class="text-success text-center">Login successful!</b>`
        window.location = "index.html"
    }
}

//Identifies the current logged in user.
async function identifyUser(){
    //Sends a identify GET request to the server and stores the result.
    let user = await sendRequest(SERVER + "/identify", "GET")

    //If there is an email in the response, the user is logged in. Otherwise, the user is not logged in/session is expired.
    try {
        if("email" in user && "access_token" in window.localStorage){
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
    window.userState = user;
    let access_token = window.localStorage.getItem("access_token")

    //Gets a handle on each of the name, menu area, 
    let userStateArea = document.querySelector("#userContextGroup");
    let userNameArea = document.querySelector("#userNameArea");
    let menuArea = document.querySelector("#profileArea");
    let reportButtonArea = document.querySelector("#driverReportButtonArea");

    //Writes the appropriate menu options to the user context actions for login/register, or logout.
    if("email" in user && access_token){
        userStateArea.innerHTML = `<li><a class="" href="#" onclick="logout()"><i class='bi bi-box-arrow-left'></i> <span>Logout</span></a></li>`
        userNameArea.innerHTML = `<h1 class="text-light">${user.firstName} ${user.lastName}</h1>`
        menuArea.innerHTML = `<li><a href="#profile" data-bs-toggle="modal" data-bs-target="#profileManagementModal"><i class="bi bi-person-fill"></i> <span>Profile</span></a></li>`
        if(isMobileDevice())
            reportButtonArea.innerHTML = `<i class="bi bi-plus d-xl-none" data-bs-toggle="modal" data-bs-target="#driverReportModal" id="driverReportButton"></i>`
    }
}

//Facilitates the registration of a user when the register form is submitted.
async function register(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets a handle on the outcome area.
    let messageArea = document.querySelector("#userRegisterMessage")
    messageArea.innerHTML = `<div class="align-middle text-center">
                                <div class="spinner-border text-success mb-2" role="status"></div><br>
                                <b class="align-middle text-success text-center">Registering...</b>
                            </div>`;

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;

    //Creates the registration details object from the form values.
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
    

    //Prints the outcome of the request to the outcome area of the registration section.
    if("error" in result || "msg" in result){
        //console.log("Error")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center mt-2">${result["error"]}</b>
                                </div>`
    } else {
        //console.log("Success")
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center mt-2">${result["message"]}</b>
                                </div>`
    
    }

}

//Facilitates the verification of a user when the verification form is submitted.
async function verifyEmail(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let token = form.elements["emailToken"].value;
    
    //Creates the verification object and stores the form value for email verification.
    let verifyDetails = {
        "email" : form.elements["emailVerifyActual"].value,
    }

    //Submits the verification request to the server and stores the result.
    let result = await sendRequest(SERVER + "/confirm/" + token, "PUT", verifyDetails);
    let messageArea = document.querySelector("#verificationMessage")

    //Prints the outcome of the request to the outcome area of the verification section.
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


//Facilitates the resending of the confirmation user for a user when the resend confirmation form is submitted.
async function resendConfirmationEmail(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;

    //Creates an object for sending the values of the email confirmation form.
    let resendDetails = {
        "email" : form.elements["resendConfirmationEmailField"].value,
    }
    
    //Resets the form.
    form.reset();

    //Submits the resend verification request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resendConfirmation", "POST", resendDetails);
    let messageArea = document.querySelector("#resendConfirmationMessage")

    //Prints the outcome of the request to the outcome area of the resend confirmation email section.
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

//Facilitates the resetting the password of a user when the reset password form is submitted.
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

    //Submits the password reset request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resetPassword/" + token, "POST", resetDetails);
    let messageArea = document.querySelector("#resetPasswordMessage")

    //Prints the outcome of the request to the outcome area of the password reset section.
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


//Facilitates the password reset email request of a user when the send password reset form is submitted.
async function sendResetPassword(event){
    //Prevents the reloading of the page.
    event.preventDefault();

    //Gets the submitted form details and parses it into the required format for the request. The form is then reset.
    let form = event.target;
    let resetDetails = {
        "email" : form.elements["resetPassword-email"].value,
    }

    form.reset();

    //Submits the password reset email request to the server and stores the result.
    let result = await sendRequest(SERVER + "/resetPassword", "POST", resetDetails);
    let messageArea = document.querySelector("#sendResetPasswordMessage")

    //Prints the outcome of the request to the outcome area of the password reset email section.
    if("error" in result || "msg" in result){
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="align-middle text-danger text-center">${result["error"]}</b>
                                </div>`
    } else {
        messageArea.innerHTML = `<div class="align-middle text-center">
                                    <b class="text-success text-center">${result["message"]} Check your email and use the account tab above to reset your password.</b>
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
function determineUpVoteButtonColor(report, user){
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
function determineDownVoteButtonColor(report, user){
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
    //Gets the report container and initializes the loading screen.
    
    let allReportsContainer = document.querySelector("#reportAccordion")
    allReportsContainer.innerHTML = `<div class="align-middle text-center">
                                        <div class="spinner-border text-dark mb-2" role="status"></div><br>
                                        <b class="align-middle text-dark text-center">Loading Reports...</b>
                                    </div>`;


    //Gets all of the pothole reports.
    let potholeReports = await getReports(potholeID)
    let userLogin = window.userState;

    //Writes the number of reports to the report area.
    let numberOfReportsContainer = document.querySelector('#numberOfReportsArea')
    numberOfReportsContainer.innerHTML = `${potholeReports.length == undefined ? "-" : potholeReports.length} Report`;
    //If the number of reports is more than 1, add an 's' to make Report plural.
    if(potholeReports.length > 1)
        numberOfReportsContainer.innerHTML +=`s`

    //Attempts to load the reports into the pane.
    try {
        //Sorts the pothole by ID; most recent to least recent.
        potholeReports = potholeReports.sort((a, b) => {
            if (a.reportID < b.reportID)
                return 1;                
            else
                return -1;
        })



        //After getting the reports from the server, reset the reports container.
        allReportsContainer.innerHTML = ``
        //If there are reports for the pothole, populate the pane.
        if(potholeReports.length > 0){
            //Iterates over the reports and generates the accordion list for the potholes.
            for(report of potholeReports){
                let debugInfo = "";
                allReportImages = ""

                //Prints debugging information when DEBUG is set to true.
                if(DEBUG){
                    let debugPothole = await sendRequest(SERVER + "/api/potholes/" + potholeID, "GET");
                    let expiryDate = new Date(debugPothole.expiryDate)
                    debugInfo = `<hr><div class="mt-1">UserID - ${report.userID}<br>PotholeID - ${report.potholeID}<br>ReportID - ${report.reportID}<br>Expiry - ${expiryDate}</div>`
                }
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
                            <img src="${reportImage.imageURL}" style="height: 400px; background-position: center center; object-fit: cover; background-repeat: no-repeat;" class="d-block w-100">
                        </div>`
                        i++;
                    }
                }

                //Calculates the votes for the report, button colors, and text colors.
                netVotes = calculateNetVotes(report);
                upvoteButtonColor = determineUpVoteButtonColor(report, userLogin)
                downvoteButtonColor = determineDownVoteButtonColor(report, userLogin)
                let color = determineTextColor(netVotes);
                
                //Converts the date to a dateobject
                var newDate = dateConvert(report.dateReported);
                //Creates and appends the accordion item containing the report information.
                allReportsContainer.innerHTML += 
                `<div class="accordion-item rounded-0">
                    <h2 class="accordion-header" id="heading-${report.reportID}">
                    <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${report.reportID}">
                         <div><span class="font-monospace ${color}" id="accordionNetVotes-${report.reportID}">${(netVotes < 0 ? "" : netVotes == 0 ? "&nbsp" : "+")}<span>${netVotes}</span></span> | ${report.reportedBy} - [${newDate}]  </div>
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
                                    <strong class="px-3 ${color}" id="netVotes-${report.reportID}"><span class="text-white">${netVotes}<span></strong>
                                    <span id="castedUpvote-${report.reportID}">
                                        <button type="button" class="btn ${upvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${report.reportID}, true)">
                                            <i class="bi bi-arrow-up"></i>
                                        </button>
                                    </span>
                                </div>
                                <span id="voteOutcomeMessage-${report.reportID}"></span>
                                ${debugInfo}
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
    //Gets the report dash area.
    let reportArea = document.querySelector("#reportContent");

    //Gets the user context
    let user = window.userState;

    //If the user is not logged in, display an error message.
    if("error" in user || "msg" in user){
        reportArea.innerHTML = `<div class="mt-5 text-center text-black">
                                        <h2>User is not logged in!</h2>
                                        <p>${user["error"]}</p>
                                    </div>`
    } else {
    //Otherwise, display the interfaces if the device the user is logged in and the device is a mobile device.
        //If a mobile device is not being used, display that their device is unsupported.
        if(!isMobileDevice()){
             reportArea.innerHTML = `
             <div class="text-center mt-5 text-center text-black">
               <h2>Unsupported Device!</h2>
               <p>Sorry, but you need to use a mobile device in order to make a report.</p>
             </div>`
        } else {
            reportArea.innerHTML = 
            `<div class="list-group p-3 d-flex flex-column justify-content-evenly align-items-middle" style="min-height: 75vh">
                <button data-bs-target="#standardReportModal" onclick="updateLocalCoords()" data-bs-toggle="modal" id="standard-button" type="button" class="btn btn-primary py-5">Standard Report</button>                       
                <button data-bs-target="#driverReportModal" data-bs-toggle="modal" id="driver-button" type="button" class="btn btn-dark py-5">Driver Report</button>
            </div>`
        }
    }
}



//Loads the report leaderboard data into the report leaderboard page.
async function loadReportLeaderboardData(){
    //Gets the leaderboard area handle.
    let leaderboard = document.querySelector("#reportLeaderboard")

    //Sets the headers of the leaderboard.
    leaderboard.innerHTML = `
    <tr id="headerRow">
        <th scope="col">RANK</th>
        <th scope="col">POTHOLE ID</th>
        <th scope="col">NUMBER OF REPORTS</th>
        <th scope="col">CONSTITUENCY</th>
    </tr>
    `
    //Retrieves the report leaderboard data and stores it.
    let leaderboardData = await getReportLeaderboardData();
    
    //Iterates over the leaderboard data and appends rows containing the report leaderboard information.
    let i = 1;
    for(pothole of leaderboardData){
        try {
            leaderboard.innerHTML += `
            <tr onclick="reportLeaderboardModal(${pothole.lat}, ${pothole.long}, ${pothole.potholeID})"  id=${(i == 1 ? "fstPlaceRow" : i == 2 ? "sndPlaceRow" : i == 3 ? "trdPlaceRow" : "")}>
                <td><b>${i}</b></td>
                <td class="${(i < 4 ? "text-dark text-decoration-underline" : "text-primary text-decoration-underline")}">Pothole #${pothole.potholeID}</td>
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
    //Retrieves the constituency leaderboard data and stores it.
    let leaderboard = document.querySelector("#constLeaderboard")
    //Sets the headers of the leaderboard.
    leaderboard.innerHTML = `
    <tr id="headerRow">
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
        <tr id=${(i == 1 ? "fstPlaceRow" : i == 2 ? "sndPlaceRow" : i == 3 ? "trdPlaceRow" : "")}>
            <td><b>${i}</b></td>
            <td>${constituency.name}</td>
            <td>${constituency.count}</td>
            <td><button class="btn btn-dark w-100" data-bs-toggle="modal" data-bs-target="#councillorInfoModal" onclick="displayCouncillorInfo(event, '${constituency.constitID}')">Councillor Info</button></td>
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
        //Displays the error message in the event that the user is offline and the page is not cached.
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

    //Gets the vote buttons
    let upvoteButton = document.querySelector(`#castedUpvote-${reportID}`)
    let downvoteButton = document.querySelector(`#castedDownvote-${reportID}`)
    
    //Gets the outcome message area.
    let messageArea = document.querySelector(`#voteOutcomeMessage-${reportID}`)

    //Determines if the user is logged in.
    let userLogin = window.userState;

    if("msg" in userLogin || !("email" in userLogin)){
        messageArea.innerHTML = `<b class="text-danger text-center">Please login to vote!</b>`
    } else {
        //Sends the vote request to the server for the pothole and reportID.
        let result = await sendRequest(SERVER + `/api/vote/pothole/${potholeID}/report/${reportID}/vote`, "POST", voteData);
        //If there was an error in voting, display the login error. (The only type of error possible)
        if("error" in result || "msg" in result){
            if(!window.navigator.onLine && "email" in userLogin){
                messageArea.innerHTML = `<b class="text-danger text-center">Vote will be synced once reconnected!</b>`
            } else {
                messageArea.innerHTML = `<b class="text-danger text-center">Please login to vote!</b>`
            }
        } else {
            //Updates the message area to a success message and attempts to update the colors, text and counter.
            messageArea.innerHTML = `<b class="text-success text-center">${result["message"]}</b>`

            try {

                let updatedReport
                //Updates the local cache for reports and gets updated report.
                let allReports = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}`, "GET");
                for(currReport of allReports)
                    if(currReport.reportID == reportID && currReport.potholeID == potholeID)
                        //Gets the updated vote report.
                        updatedReport = currReport
                

                
                //Recalculates the votes, text colors and button colors.
                newNetVotes = calculateNetVotes(updatedReport)
                let color = determineTextColor(newNetVotes)
                let updatedDownvoteButtonColor = determineDownVoteButtonColor(updatedReport, userLogin)
                let updatedUpvoteButtonColor = determineUpVoteButtonColor(updatedReport, userLogin)

                //Replaces the buttons, text, and counters for the updated report.
                netVotesCounter.innerHTML = `<span class="text-white">${newNetVotes}</span>`
                accordionVotesCounter.innerHTML = `<span class="font-monospace ${color}">${(newNetVotes < 0 ? "" : newNetVotes == 0 ? "&nbsp" : "+")}<span id="accordionNetVotes-${updatedReport.reportID}">${newNetVotes}</span></span>`
                upvoteButton.innerHTML = `<button id="castedUpvote-${updatedReport.reportID}" type="button" class="btn ${updatedUpvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, true)">
                                            <i class="bi bi-arrow-up"></i>
                                        </button>`
                downvoteButton.innerHTML = `<button id="castedDownvote-${updatedReport.reportID}" type="button" class="btn ${updatedDownvoteButtonColor}" onclick="voteOnReport(event, ${potholeID}, ${updatedReport.reportID}, false)">
                                                <i class="bi bi-arrow-down"></i>
                                            </button>`
                                            
            } catch(e){
                //If any errors occur, print the errors.
                console.log("Deleting pothole with no reports...")
                displayPotholes()
            }
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
    //Gets a handle on the councillor information area.
    let councillorInformationArea = document.querySelector("#councillorInformation")
    //Sets initial councillor information
    councillorInformationArea.innerHTML = `<div class="align-middle text-center mb-2">
                                                <div class="spinner-border text-white mb-2" role="status"></div><br>
                                                <b class="align-middle text-white text-center mt-2">Loading Information...</b>
                                            </div>`;

    //Gets the councillor data for the constituencyID and election year.
    let councillorData = await getCouncillorData(ELECTION_YEAR, constituencyID)

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
        //If the user is offline and the data is not cached, display the cache error message.
        if(!window.navigator.onLine){
            councillorInformationArea.innerHTML = `<div class="text-center text-white"><b class="text-danger text-center">Please visit this page when online to save for offline use!</b><div>`
        } else {
            //If there was an error formatting or accessing the data, display an error message saying that no constituency information is available.
            councillorInformationArea.innerHTML = `<div class="d-flex justify-content-center text-white my-3"><strong>No constituency information available!</strong></div>`
        }
    }
}


//Referenced from Baraa, Oct 26th 2014, found at:
//https://stackoverflow.com/questions/6666907/how-to-detect-a-mobile-device-with-javascript
//Determines if the current device is a mobile device.
function isMobileDevice(){
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)) {
        return true;
    }
    return false
}

//Displays the selected image after the user has chosen their upload.
function showImage(){
    //Gets the uploaded image file.
    const image = event.target.files[0];
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

//Facilitates the submission of a driver report for processing at the backend.
async function postDriverReport() {
	//Builds the driver report; without images and description.
  	buildReport(null, null, DRIVER_REPORT_URL);
}

//Gets and updates the coordinates of the user in the standard report screen.
async function updateLocalCoords(){
    var latitude, longitude;

    //Gets the coordinate text area and sets the options for the geolocation function.
    let coordTextArea = document.querySelector("#coordinatesText");
    if (navigator.geolocation) {
        coordTextArea.placeholder = `Geolocation is supported on your device!`
    } else {
        coordTextArea.placeholder = `Geolocation is not supported or enabled on your device!`
    }
    /*
	var options = { enableHighAccuracy: true, maximumAge: 0};

	//Checks to see if the device supports geolocation.
	if (navigator.geolocation) {
        //Creates an observer for the user's position and updates the standard report location box
        navigator.geolocation.getCurrentPosition(async (position) =>{
            //If the coordinates are successfully obtained, store them.
			latitude = position.coords.latitude;
			longitude = position.coords.longitude;

            coordTextArea.placeholder = `Latitude: ${latitude}, Longitude: ${longitude}`
        }, function(){
            //Otherwise, if no location can be found, display an error message as a toast.
            coordTextArea.placeholder = `Unfortunately we couldn't find your coordinates!`
        }, options );
        

        //The use of getCurrentPosition would return a cached location from the operating system.
        //This is returned despite the maximum age of 0; requesting for the most up to date location.

 	} else {
        coordTextArea.placeholder = `Geolocation is not supported or enabled on your device!`
	}
    */
}

//Generates the report using the photoURL, description, and endpoint URL.
async function buildReport(photoB64, description, url) {
    if(reportInProgress){
        displayToast("sync", "Current report in progress. Please wait.")
        return;
    }

    reportInProgress = true;
    
	var latitude = null, longitude = null, accuracy = null;
    bestAccuracy = 3000;

    //Resets coords in localStorage
    window.localStorage.setItem("latitude", latitude)
    window.localStorage.setItem("longitude", longitude)
    window.localStorage.setItem("accuracy", accuracy)

    //Sets the options for the geolocation function.
    var options = { enableHighAccuracy: true, maximumAge: 200, timeout: 20000 };
    //Checks to see if the device supports geolocation.
	if (navigator.geolocation) {
        //Spends 5 seconds attempting to get the most accurate GPS coords; even with no data or internet.
        const getLatestLocation = async () => {
            displayToast("sync", "Obtaining accurate coordinates...")
            //Gets the current geoposition of the device.
            //getCurrentLocation does not return an accurate position.
            //Dear Mr. Mendez, forgive me for my sins. - Boldoosang
            return new Promise(resolve => {
                var watchID = navigator.geolocation.watchPosition(async (position) =>{
                    //If the coordinates are successfully obtained, store them.
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                    accuracy = position.coords.accuracy;
    
                    //As the watch position accuracy increases, overwrite each coordinate with the most accurate reading.
                    window.localStorage.setItem("latitude", latitude)
                    window.localStorage.setItem("longitude", longitude)
                    
                    if(accuracy < bestAccuracy){
                        bestAccuracy = accuracy
                        window.localStorage.setItem("accuracy", bestAccuracy)
                    }

                    console.log(`Latitude: ${latitude}, Longitude: ${longitude}, Accuracy: ${accuracy}`)
                        
                }, function(){
                //If the coordinates were not succesfully obtained, display an error.
                    //If the latitude and longitude could not be obtained, display an error message.
                    if(longitude == null || latitude == null){
                        //Displays error message as a log.
                        console.log("Unfortunately, we couldn't find your coordinates!")
                        navigator.geolocation.clearWatch( watchID );
                    }
                }, options)
    
                //Clears the watchPosition after 8 seconds, sets the report in progress to false as the GPS should now be unlocked, and resolve the promise.
                setTimeout(function() {
                    navigator.geolocation.clearWatch( watchID );
                    reportInProgress = false;
                    resolve()
                }, 6000);
            })
        }

        //Gets the current location, and then creates and submits a report from the location and other information.
        getLatestLocation().then(async function(){
            //Gets the stored coordinates from the localStorage.
            latitude = window.localStorage.getItem("latitude")
            longitude = window.localStorage.getItem("longitude")
            accuracy = window.localStorage.getItem("accuracy")

            //Sends the report to the server.
            if(latitude == "null" || longitude == "null"){
                //If the geolocation coordinates could not be found, display an error message.
		        displayToast("failed", "Unfortunately, we couldn't find your coordinates! Ensure GPS is enabled and not in use by another service.")
                return;
            }

            if(parseFloat(accuracy) > 35){
                displayToast("failed", `Your GPS is unable to provide an accurate enough location. Please try again. Accuracy: ${parseFloat(accuracy).toFixed(2)}m`)
                window.localStorage.removeItem("latitude")
                window.localStorage.removeItem("longitude")
                window.localStorage.removeItem("accuracy")
                return;
            }

            let results = await sendReport(latitude, longitude, photoB64, description, url)
            //results = {"message" : `Debug ${latitude}, ${longitude}. Accuracy ${accuracy}!`}


			//Prints the results of sending the report.
			try {
                if("msg" in results){
                    displayToast("failed", "You must be logged in to report a pothole!")
                } else if("error" in results && !window.navigator.onLine){
                    displayToast("failed", "Your report will sync once you reconnect to the internet!")
                    document.getElementById("descriptionText").value = "";
                    removeImage();
                } else if("error" in results){
                    displayToast("failed", results["error"])
                } else if("message" in results){
                    displayToast("success", results["message"])
                    displayPotholes();
                    document.getElementById("descriptionText").value = "";
                    removeImage();
                }
            } catch (e) {
                displayToast("failed", e.message)
            }
        });
    } else {
        //If the device does not support geolocation, display an error message.
		displayToast("failed", "Unfortunately, we couldn't find your coordinates!")
    }
}

//Sends a generated report to the endpoint URL.
async function sendReport(latitude, longitude, photoB64, description = null, url){
    //Parses coordaintes to float values.
    latitude = parseFloat(latitude)
    longitude = parseFloat(longitude)

    //If the values cannot be parsed, they are invalid.
    if(latitude == NaN || longitude == NaN)
        return {"error": "Pothole coordinates are not valid!"}

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
        window.localStorage.removeItem("latitude")
        window.localStorage.removeItem("longitude")
        window.localStorage.removeItem("accuracy")
		return await sendRequest(url, "POST", data)
	} catch (error) {
		return error;
	}
}

//Brandon's code.
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

async function downloadMapTiles(){
    await navigator.serviceWorker.ready.then(worker => {
        worker.active.postMessage({"downloadMap" : true})
    });
}

async function revealDownloadButton(downloadButton){
    downloadButton.classList.replace("d-none", "d-flex")
}


//Bootstraps the application by adding the relevant listeners, toggles, and other initialization procedures.
async function main(){
    //Determines the user context.
    await identifyUserContext()
    //Disables the back button
    disableBackButton()
    //Adds a click listener to the driver report button and automatically collapse the modal.
    document.getElementById('submit-driver-report').addEventListener('click', ()=> {
        postDriverReport();
        var myCollapse = document.getElementById('flush-collapseOne')
        var bsCollapse = new bootstrap.Collapse(myCollapse, {
            toggle: true
        })
    });

    //Gets the download button
    let downloadButton = document.querySelector("#mapDownloadButton");

    //Adds a click listener to the standard report button.
    document.getElementById('submit-passenger-report').addEventListener('click', handleStandardReport);
    //Adds a listener to detect when the user has gone offline, and displays a corresponding message.
    window.addEventListener("offline", (event)=>{
        displayToast("failed", "Your network connection has been lost!")
        downloadButton.classList.replace("d-flex", "d-none")
    })
    //Adds a listener to detect when the user has gone online, and displays a corresponding message.
    //Also requests background syncing.
    window.addEventListener("online", (event)=>{
        displayToast("success", "Network connection established!!")
        navigator.serviceWorker.ready.then(worker => {
            worker.active.postMessage({"syncActions": true})
        });
    })

    //Attempts to perform a sync if the app was retrieved from the app draw.
    window.addEventListener("visibilitychange", (event)=>{
        navigator.serviceWorker.ready.then(worker => {
            if(window.navigator.onLine)
                worker.active.postMessage({"syncActions": true})
        });
    })

    //Performs a sync on page load.
    navigator.serviceWorker.ready.then(worker => {
        if(window.navigator.onLine)
            worker.active.postMessage({"syncActions": true})
    });

    downloadButton.addEventListener("click", function(){
        displayToast("sync", "Downloading Map...")
        downloadButton.classList.replace("d-flex", "d-none")
        downloadMapTiles()
    })

    //Gets the current user.
    let user = window.userState;
    //If the current user is logged in, initialize their dashboard and display their potholes.
    if(!("error" in user || "msg" in user)){
        await initDashboardMap();
        displayUserPotholes();
    }

    //Initializes tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })


    //Determines if to display or hide the button after 3 seconds of the page loading.
    setTimeout(async function(){
        let mapSelectorArea = document.getElementsByClassName("leaflet-control-layers-selector");
        if(mapSelectorArea.length == 1){
            await revealDownloadButton(downloadButton);
        } else {
            downloadButton.classList.replace("d-flex", "d-none")
        }
    }, 3000)
    
    //Listens for messages from the service worker.
    navigator.serviceWorker.addEventListener('message', function(event) {
        //Displays the downloaded map message and reloads the page after 3 seconds.
        if("downloadedMap" in event.data){
            displayToast("sync", "Map download complete!")
            setTimeout(function(){
                window.location.reload(true);
            }, 3000);
        } else if("syncComplete" in event.data){
        //Displays the sync message and refreshes the potholes.
            displayToast("sync", "Sync completed!")
            displayPotholes();
        } else if ("message" in event.data){
        //Displays any incoming synced messages and refreshes the potholes.
            displayToast("sync", event.data.message)
            displayPotholes()
        } else if("error" in event.data){
        //Displays any errors from syncing.
            displayToast("sync", event.data.error)
        }
    });
}


//Initializes the dashboard map.
async function initDashboardMap(){
    dashboardMap = L.map('dashboardMap', {
        center: [10.69, -61.23],
        zoom: 9,
        minZoom: 10
    });

    //Gets the tile layer for the map and adds it to the map.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(dashboardMap);
}

//Gets all of the current user's potholes and returns it.
async function getUserPotholes(){
    let potholes = await sendRequest(SERVER + '/api/dashboard/potholes', 'GET');
    return potholes;
}

//Gets the dashboard modal interface.
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

//Display the user's potholes on the dashboard map.
async function displayUserPotholes(){
    //Resets the dashboard layers and markers if previously initialized.
    if(dashboardMarkers) //[] == 0
        dashboardMarkers = []
    if(dashboardMarkersLayer)
        dashboardMarkersLayer.clearLayers();

    //Adds a markers layer to the map
    dashboardMarkersLayer = L.layerGroup().addTo(dashboardMap); 

    //Gets the user's potholes and displays them on the map if there are any.
    let potholes = await getUserPotholes();
    if(potholes.length > 0){
        for(let pothole of potholes){
            try {
                //Create a new marker object with the constituency name, pothole id and constituency id
                let marker = L.marker([pothole.latitude, pothole.longitude], {
                    potholeID: pothole.potholeID
                }).on('click', async function(){
                    //When a pothole report has been clicked, load the report into the modal and toggle the modal.
                    loadUserReport(pothole.potholeID);
                    getDashboardModal().toggle();
                //Adds the marker layer to the markers layer.
                }).addTo(dashboardMarkersLayer);
                //Pushes the created marker into a list of markers.
                dashboardMarkers.push(marker)
            } catch (e){
                //In the event of an error, print the most common error to the console.
                console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
            }
        }   
    } 
    
    
    setTimeout(() => {
        //Resets the map to resize to the size of the UI.
        map.invalidateSize();
    }, 200);
}

//Loads a user's report given the potholeID.
async function loadUserReport(potholeID){
    //Gets the dashboard title and body.
    let dashboardTitle = document.querySelector("#dashboard-title");
    let dashboardBody = document.querySelector("#dashboard-body");

    //Sets the initial loading 
    dashboardBody.innerHTML = `<div class="align-middle text-center mb-2">
                                    <div class="spinner-border text-white mb-2" role="status"></div><br>
                                    <b class="align-middle text-white text-center mt-2">Loading Report...</b>
                                </div>`;

    //Sets the title of the report.
    dashboardTitle.innerText = "Your Report";

    //Gets the report details and the report images for the report made by the user.
    try {
        var potholeReport = await getIndividualReport(potholeID);
        reportedImages = potholeReport.reportedImages
    } catch (e){
        //Prints any errors that may occur.
        console.log(e)
    }

    //If the user has switched to offline mode after accessing the dashboard, notify them that the dashboard can only be used online.
    if(!window.navigator.onLine){
        dashboardBody.innerHTML = `<div class="mt-5 text-center text-black">
                                    <h2>Unavailable!</h2>
                                    <p>Sorry, the dashboard is only available in online mode.</p>
                                    </div>`;
        return;
    }

    //Initializes the string containing the image URLs.
    allReportImages = ""

    //Attempts to load the report into the dashboard.
    try {
        //Determines if there are pothole images to be added. If not, display a message.
        if(reportedImages.length == 0){
            allReportImages = `<div class="d-flex justify-content-center mt-3 mb-3"><span class="border border-1 border-white rounded-3 px-3 py-5"><strong >No report images uploaded!</strong></div>`
        } else {
        //Otherwise, iterate over all of the images and add them to the image carousel for the report.
            let tag = "active"
            let i = 0
            for(reportImage of reportedImages){
                if(i > 0)
                    tag = ""
                allReportImages +=
                `<div class="carousel-item ${tag}">
                    <img src="${reportImage.imageURL}" style="height: 400px; background-position: center center; object-fit: cover; background-repeat: no-repeat; z-index: 9995" class="d-block w-100">
                    <div class="carousel-caption d-none d-md-block mt-5 pt-5">
                        <button type="button" id="deleteImageButton" dashDeleteReportImage()" data-bs-toggle="collapse" data-bs-target="#dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}" aria-expanded="false" aria-controls="collapseExample" class="btn btn-danger"><i class="bi bi-trash"></i> Delete Image</button>
                        <div class="collapse" id="dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}">
                            <div class="card card-body text-white mt-3" style="background: #050d18;">
                                <b>Confirm deletion?</b>
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
        //If any error occurs, display that there were no reports for the pothole.
        allReportImages = `<div class="d-flex justify-content-center mt-3"><strong>Error retrieving images for report!</strong></div>`
    }

    //If the pothole report has content, format and display the pothole content with corresponding edit buttons.
    if(potholeReport != null){
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
        
                <p class="fw-bold " for="editImages-${potholeReport.reportID}">Pothole Images</p>
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
                        <a class="btn btn-primary" data-bs-toggle="collapse" href="#addReportImage-${potholeReport.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class="bi bi-plus-medical"></i>
                            Add Image
                        </a>
                    </div>
                </p>

                <div class="collapse" id="addReportImage-${potholeReport.reportID}">
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
                            <button onclick="handleAddImage(event, ${potholeReport.potholeID}, ${potholeReport.reportID})" class="btn btn-primary"><i class='bi bi-camera-fill'></i> Add</button> 
                        </div>
                    </div>
                </div>

                <div class="mt-3" id="imageUpdateMessage"></div>
            </div>

            <div class="tab-pane fade show mt-4" id="pills-descriptionTab" role="tabpanel" aria-labelledby="pills-home-tab">
                <div class="form-group mb-2">
                    <label class="fw-bold" for="editDescription-${potholeReport.reportID}">Pothole Description</label>
                    <p class="ms-3 mt-2">${potholeReport.description}</p>
                </div>

                <p>
                    <div class="d-flex justify-content-center">
                        <a class=" btn btn-primary mt-4" data-bs-toggle="collapse" href="#editPotholeDescription-${potholeReport.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class='bi bi-pencil' ></i>
                            Edit Description
                        </a>
                    </div>
                </p>

                <div class="collapse" id="editPotholeDescription-${potholeReport.reportID}">
                    <div class="text-white mb-2">
                        <form class="form-group mb-1" onsubmit="updatePotholeDescription(event, ${potholeReport.potholeID}, ${potholeReport.reportID})">
                            
                            <input type="text" id="updatePotholeDescription-${potholeReport.reportID}" class="text-muted form-control mt-2" name="description" value="${potholeReport.description}" required>
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

                    <label class="fw-bold" for="editDescription-${potholeReport.reportID}">Delete Pothole</label>
                    <div class="d-flex justify-content-center mt-3">
                        <button class="btn btn-danger w-100 py-5" data-bs-toggle="collapse" href="#deletePotholeReport-${potholeReport.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample"><i class='bi bi-trash'></i>
                            Delete
                        </button>
                    </div>
                </p>
                <div class="mt-4 collapse" id="deletePotholeReport-${potholeReport.reportID}">
                    <div class="text-white text-center">
                        <b>Are you sure you want to delete this report?</b><br>
                        <div class="mt-4 text-center">
                            <button onclick="deletePotholeReport(event, ${potholeReport.potholeID}, ${potholeReport.reportID})" class="btn btn-danger me-3">Confirm</button>
                            <button class="btn btn-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#deletePotholeReport-${potholeReport.reportID}" aria-expanded="false" aria-controls="collapseExample">
                                Close
                            </button>
                        </div>
                        <div class="mt-3" id="deletePotholeMessage"></div>
                    </div>
                </div>
            </div>
        </div>  
        `
        
    } else {
    //Otherwise, display an error if no pothole can be displayed from the pin.
        dashboardBody.innerHTML = `<p>An error has occurred!</p>`
    }
}


//Deletes an entire pothole report from within the dashboard.
async function deletePotholeReport(event, potholeID, reportID){
    //Gets the outcome area and displays the outcome.
    let messageOutcomeArea  = document.querySelector("#deletePotholeMessage");

    //Sets an initial outcome.
    messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                        <b class="align-middle text-success mt-2 text-center">Deleting Pothole...</b>
                                    </div>`;

    //Sends a delete request that corresponds to the report.
    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "DELETE");

    
    

    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center">Pothole Deleted Successfully!</b>
                                        </div>`;
        //Reloads the dashboard and displays the updated potholes on the main map.
        loadDashboard();
        displayPotholes();
    }

}

//Updates the pothole description for a given pothole, from within the dashboard.
async function updatePotholeDescription(event, potholeID, reportID){
    //Gets and sets the initial message when updating a pothole description.
    let messageOutcomeArea = document.querySelector("#updateDescriptionMessage")
    messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                        <div class="spinner-border text-success mb-2" role="status"></div><br>
                                        <b class="align-middle text-success text-center">Updating Description...</b>
                                    </div>`;
    //Prevents the page from reloading on submission.
    event.preventDefault();

    //Gets the form and creates the updated description object.
    let form = event.target;
    let newDescription = {
        "description" : form.elements["description"].value
    }

    //Sends the PUT request to the server with the new information for the pothole.
    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}`, "PUT", newDescription);
    
    //Displays the outcome in the associated text area.
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center mt-2">Description Updated! Reloading...</b>
                                        </div>`;

        //Reloads the report after 3 seconds with the updated information.
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}

//Allows for a user to change their password while logged in.
async function changePassword(event){
    //Prevents the page from reloading on submission.
    event.preventDefault();

    //Gets the form containing the information and extracts the form values for password changing.
    let form = event.target;
    let passwordDetails = {
        "oldPassword" : form.elements["oldPassword"].value,
        "password" : form.elements["password"].value,
        "confirmPassword" : form.elements["confirmPassword"].value
    }

    //Sends the password change request to the backend for processing.
    let result = await sendRequest(SERVER + `/user/password`, "PUT", passwordDetails);

    //Gets a handle on the message outcome area and displays the outcome in the message area.
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

//Allows for a user to change their profile information such as their name.
async function updateProfile(event){
    //Prevents the page from reloading on submission.
    event.preventDefault();

    //Gets the form containing the information and extracts the form values for name changing.
    let form = event.target;
    let profileDetails = {
        "firstName" : form.elements["firstName"].value,
        "lastName" : form.elements["lastName"].value,
    }

    //Sends the name change request to the backend for processing.
    let result = await sendRequest(SERVER + `/user/profile`, "PUT", profileDetails);

    //Gets a handle on the message outcome area and displays the outcome in the message area.
    let messageOutcomeArea  = document.querySelector("#updateProfileMessage");
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
                                            <b class="align-middle text-success text-center">Profile Updated Successfully!</b>
                                        </div>`;  
        //Updates the user's display information on their nav.
        await identifyUserContext()      
    }
}

//Allows for a user to add an image to their existing report via the dashboard.
async function addImageToReport(photoB64, potholeID, reportID){
    //Gets a handle on the message outcome area 
    let messageOutcomeArea  = document.querySelector("#imageUpdateMessage");
    messageOutcomeArea.innerHTML = `<div class="align-middle text-center my-2">
                                            <div class="spinner-border text-success mb-2" role="status"></div><br>
                                            <b class="align-middle text-success text-center mt-2">Adding Image...</b>
                                    </div>`;

    //Creates the image array for the report.
    let B64Image = {
        "images" : [photoB64]
    }

    //Sends the image to the backend to be added to the report images.
    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images`, "POST", B64Image);
    
    //Displays the image add outcome via the outcome area.
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center mb-2">
                                            <b class="align-middle text-success text-center mt-2">Image Added! Reloading...</b>
                                        </div>`;
        //Reloads the user report with the updated information.
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}

//Allows for a user to remove an image from their existing report via the dashboard.
async function deleteImageFromReport(event, potholeID, reportID, imageID){
    let messageOutcomeArea  = document.querySelector("#imageUpdateMessage");
    messageOutcomeArea.innerHTML = `<div class="align-middle text-center mb-2">
                                            <div class="spinner-border text-success mb-2" role="status"></div><br>
                                            <b class="align-middle text-success text-center mt-2">Deleting Image...</b>
                                        </div>`;

    //Prevents the page from reloading.
    event.preventDefault();

    //Sends the delete request to the backend and stores the response.
    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images/${imageID}`, "DELETE");
    
    //Displays the response in the message outcome area.
    if("error" in result || "msg" in result){
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center">
        <b class="text-danger text-center">${result["error"]}</b></div>`;
    } else {
        messageOutcomeArea.innerHTML = `<div class="align-middle text-center mb-2">
                                            <b class="align-middle text-success text-center mt-2">Image Deleted! Reloading...</b>
                                        </div>`;
        //Refreshes the report after the image has been deleted.
        setTimeout(()=>{
            loadUserReport(potholeID)
        }, 3000, potholeID)
        
    }
}

//Retrieves an individual report from the server, via the potholeID.
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
        console.log(e);
        return null
    }
}

//Manually requests a background sync event.
async function requestBackgroundSync() {
    const registration = await navigator.serviceWorker.ready;
    return await registration.sync.register('sendSavedRequests');
}

//Loads the dashboard modal.
async function loadDashboard(){
    let user = window.userState;
    //Gets the dashboard component handles.
    let dashboardMapArea = document.querySelector("#dashboardMap");
    let dashboardMessage = document.querySelector("#dashboardMessage")

    //If the user is not online, hide the dashboard map and display a message that the dashboard can only be used online.
    if(!window.navigator.onLine){
        dashboardMapArea.style.visibility = "hidden"
        dashboardMessage.innerHTML = `<div class="mt-5 text-center text-black">
                                            <h2>Unavailable!</h2>
                                            <p>Sorry, the dashboard is only available in online mode.</p>
                                        </div>`
    } else {
    //Otherwise, display the dashboard, and empty the message string.
        dashboardMapArea.style.visibility = "visible"
        dashboardMessage.innerHTML = ``
        //If the user is not logged in, display the not logged in error.
        if("error" in user || "msg" in user){
            dashboardMapArea.innerHTML = `<div class="mt-5 text-center text-black">
                                            <h2>User is not logged in!</h2>
                                            <p>${user["error"]}</p>
                                        </div>`
        } else {
            //Otherwise, display the user potholes and reset the map size.
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
    const displayImage = document.getElementById("dashboard-pothole-img");
    try {
        //Displays the image as a preview.
        displayImage.src = URL.createObjectURL(image);
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