const container = document.getElementById('map')
let markersLayer;
let markers = [];
let leaderboardData = []
let map

//fuction to load the map and the geoJSON data for the constituencies
async function initMap(){
    map = L.map('map', {
        center: [10.69, -61.23],
        zoom: 9,
        minZoom: 10
    });
    
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYm9sZG9vc2FuZyIsImEiOiJja3dlbzk5NTMwNnBzMnZwd3h5OWhwazJvIn0.FhdBhjtsMsUAge-3EoptiQ'
    }).addTo(map);

    //load the geoJSON data for the constituencies
    await fetch("./ttmap.geojson").then(function(response) {
        return response.json();
    }).then(function(data) {
        L.geoJSON(data, {
            onEachFeature: function(feature, layer) {
                layer.bindPopup(feature.properties.Constituency);
            }
        }).addTo(map)
    });

    
}

async function getPotholes(){
    let potholes = await sendRequest(SERVER + '/api/potholes', 'GET');
    return potholes;
}

//function responsible for displaying the potholes on the map
async function displayPotholes(){
    if(markers)
    markers = []
    if(markersLayer)
        markersLayer.clearLayers();

    //adds a markers layer to the map
    markersLayer = L.layerGroup().addTo(map); 

    let potholes = await getPotholes();
    if(potholes.length > 0){
        for(let pothole of potholes){
            var constituency = await leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
            
            try{
                //create a new marker object with the constituency name, pothole id and constituency id
                let marker = L.marker([pothole.latitude, pothole.longitude], {
                    constituency: constituency[0].feature.properties.Constituency,
                    potholeID: pothole.potholeID,
                    constituencyID: constituency[0].feature.properties.ID
                }).on('click', async function(){
                    var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
                    var constituencyName = document.getElementById('constituencyName')
                    constituencyName.innerText = constituency[0].feature.properties.Constituency;
                    
                    //load reports and constituency data when the marker is clicked
                    loadReports(this.options.potholeID);
                    loadConstituencyData(this.options.constituencyID)
                    
                    //toggle the offcanvas
                    var offCanvasReport= getOffCanvas();
                    offCanvasReport.toggle();
                }).bindPopup(pothole.numReports + " Report(s)").addTo(markersLayer);
                markers.push(marker)
            } catch (e){
                console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
            }
        }   
    } 
    
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}

//gets the Report off canvas element
function getOffCanvas(){
    var offcanvasElementList = [].slice.call(document.querySelectorAll('.offcanvas'))
    var offcanvasList = offcanvasElementList.map(function (offcanvasEl) {
        return new bootstrap.Offcanvas(offcanvasEl)
    })

    for(const offCanvas of offcanvasList){
        if(offCanvas._element.id === 'offcanvasReport'){
            return offCanvas;
        }
    }
}

//loads all of the potholes in a constituency and returns an array of objects containing the data for that constituency
//used for the constituency leaderboard
async function getPotholesByConstituency(){
    let constituencies = []
    
    var leaderboardData = []
    
    for(var pothole of markers){
        leaderboardData.push(pothole.options.constituency)
    }

    for(const pothole of markers){
        let constituency = pothole.options.constituency;
        let constituencyCode = pothole.options.constituencyID;

        let found = false;
        for(const c of constituencies){
            if(c.name === constituency){
                c.count++;
                found = true;
            }
        }
        if(!found){
            //  let url = `${PICONG_SERVER}?year=${ELECTION_YEAR}&district=${pothole.options.constituencyID}`
            //  leader = await sendRequest(url, "GET")

            constituencies.push({
                name: constituency,
                count: 1,
                //constituencyLeader: leader[0].name
                constitID: constituencyCode,
                constituencyLeader: "Filler data till we get more info from Picong Party"
            })
        }
    }

    constituencies.sort(function(a, b){
        return b.count - a.count;
    })

    return constituencies;
}

//gets the pothole data for all potholes and returns an array of objects containing the data for each pothole
async function getReportLeaderboardData(){
    leaderboardData = []
    let potholes = await getPotholes()

    //sort result by numReports
    potholes.sort(function(a, b){
        return b.numReports - a.numReports;
    })

    for(const pothole of potholes){
        var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
        try {
            leaderboardData.push({
                constituency: constituency[0].feature.properties.Constituency,
                potholeID: pothole.potholeID,
                numReports: pothole.numReports,
                lat: pothole.latitude,
                long: pothole.longitude,

            })
        } catch(e){
            console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
        }
    }
    return leaderboardData;
}

//trigger the offcanvas the councilor data is requested
function reportLeaderboardModal(lat, long, potholeID){
    var constituency = leafletPip.pointInLayer([long, lat], map);
    var constituencyName = document.getElementById('constituencyName')

    constituencyName.innerText = constituency[0].feature.properties.Constituency;

    loadReports(potholeID);
    loadConstituencyData(constituency[0].feature.properties.ID)
        
    var offCanvasReport = getOffCanvas();
    offCanvasReport.toggle();
    console.log(offCanvasReport)
}


async function main(){
    await initMap();
    displayPotholes();
}

window.addEventListener('DOMContentLoaded', main);