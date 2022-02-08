var dashboardMap;
let dashboardMarkersLayer;
let dashboardMarkers = [];

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

    dashboardTitle.innerText = "Manage Report";

    try {
        var potholeReport = await getIndividualReport(potholeID);
        var reportedImages = await getUserReportImages(potholeID, potholeReport.reportID)
    } catch (e){
        console.log(e)
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
                    <img src="${reportImage.imageURL}" style="height: 300px; background-position: center center; object-fit: cover; background-repeat: no-repeat;" class="d-block w-100">
                    <div class="carousel-caption d-none d-md-block">
                        <button type="button" dashDeleteReportImage()" data-bs-toggle="collapse" data-bs-target="#dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}" aria-expanded="false" aria-controls="collapseExample" class="btn btn-danger"><i class="bi bi-trash-fill"></i> Delete Image</button>
                        <div class="collapse" id="dashDeleteImage-${potholeReport.reportID}-${reportImage.imageID}">
                            <div class="card card-body bg-dark text-white mt-3">
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
        <p class="fw-bold" for="editImages-${report.reportID}">Pothole Images</p>
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
            <a class="w-100 mt-1 ms-auto btn btn-primary" data-bs-toggle="collapse" href="#addReportImage-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample">
                Add Image
            </a>
        </p>

        <div class="collapse" id="addReportImage-${report.reportID}">
            <div class="card card-body bg-dark text-white mb-2">

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

                <button type="submit" onclick="handleAddImage(event, ${report.potholeID}, ${report.reportID})" class="btn btn-success">Add Image</button> 
            </div>
        </div>

        <div class="mt-3" id="imageUpdateMessage"></div>

        <div class="form-group mb-2">
            <label class="fw-bold" for="editDescription-${report.reportID}">Pothole Description</label>
            <input type="text" class="form-control mt-2" id="editDescription-${report.reportID}" readonly disabled placeholder="${report.description}">
        </div>

        <p>
            <a class="w-100 mt-1 ms-auto btn btn-primary" data-bs-toggle="collapse" href="#editPotholeDescription-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample">
                Update Description
            </a>
        </p>

        <div class="collapse" id="editPotholeDescription-${report.reportID}">
            <div class="card card-body bg-dark text-white mb-2">
                <form class="form-group mb-1" onsubmit="updatePotholeDescription(event, ${report.potholeID}, ${report.reportID})">
                    <label for="updatePotholeDescription-${report.reportID}">Pothole Description</label>
                    <input type="text" id="updatePotholeDescription-${report.reportID}" class="text-muted form-control mt-2" name="description" value="${report.description}" required>
                    <br>
                    <button type="submit" class="btn btn-success">Update Description</button>
                    <div class="mt-3" id="updateDescriptionMessage"></div>
                </form>
            </div>
        </div>


        <p>
            <a class="btn btn-danger w-100" data-bs-toggle="collapse" href="#deletePotholeReport-${report.reportID}" role="button" aria-expanded="false" aria-controls="collapseExample">
                Delete Report
            </a>
        </p>
        <div class="collapse" id="deletePotholeReport-${report.reportID}">
            <div class="card card-body bg-dark text-white">
                <b>Are you sure you want to delete this report?</b><br>
                <div class="mt-0 text-center">
                    <button onclick="deletePotholeReport(event, ${report.potholeID}, ${report.reportID})" class="btn btn-danger">Confirm</button>
                    <button class="btn btn-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#deletePotholeReport-${report.reportID}" aria-expanded="false" aria-controls="collapseExample">
                        Close
                    </button>
                </div>
                <div class="mt-3" id="deletePotholeMessage"></div>
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

async function addImageToReport(url, potholeID, reportID){
    let imageURL = {
        "images" : [url]
    }

    let result = await sendRequest(SERVER + `/api/reports/pothole/${potholeID}/report/${reportID}/images`, "POST", imageURL);
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

async function dashMain(){
    let user = await identifyUser();
    if(!("error" in user || "msg" in user)){
        await initDashboardMap();
        displayUserPotholes();
    }
}

window.addEventListener('DOMContentLoaded', dashMain);