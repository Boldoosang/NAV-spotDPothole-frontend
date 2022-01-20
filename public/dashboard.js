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
    console.log(potholes);

    return potholes;
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
            console.log(pothole)
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
    let report = await getIndividualReport(potholeID);

    if(report != null){
        console.log(report)
        dashboardBody.innerHTML = 
        `<p>${report.dateReported}</p>
        <p>${report.description}</p>
        <p>${report.potholeID}</p>
        <p>${report.reportID}</p>
        <p>${report.reportedBy}</p>
        <p>${report.reportedImages}</p>
        <p>${report.userID}</p>
        <p>${report.votes}</p>`
    } else {
        dashboardBody.innerHTML = `<p>An error has occurred!</p>`
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
    getUserPotholes();
    setTimeout(() => {
        dashboardMap.invalidateSize();
    }, 500);
}


async function dashMain(){
    await initDashboardMap();
    displayUserPotholes();
}

window.addEventListener('DOMContentLoaded', dashMain);