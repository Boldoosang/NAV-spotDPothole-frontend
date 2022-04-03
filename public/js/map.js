const container = document.getElementById('map')
let markersLayer;
let markers = [];
let leaderboardData = []
let waypoints = {
    "startPoint" : L.latLng(0, 0),
    "endPoint" : L.latLng(0, 0)
}
let debug = false
let debuglines
let line
let route
let map
let watchid
let popupLocation
let lControl


function isPointOnLine(point, path) {
    for (var i = 0; i < path.length - 1; i++) {
        if (L.GeometryUtil.belongsSegment(point, path[i], path[i + 1], 0.2)) {
            return true;
        }
    }
    return false;
}

//fuction to load the map and the geoJSON data for the constituencies
async function initMap() {
    var offline;

    map = L.map('map', {
        center: [10.69, -61.23],
        zoom: 9,
        minZoom: 10
    });

    var online = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Online Map'
    }).addTo(map);

    var baseMaps = {
        "Online": online,
    }

    lControl = L.control.layers(baseMaps, {}, {
        position: 'bottomleft'
    }).addTo(map);

    /*
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoiYm9sZG9vc2FuZyIsImEiOiJja3dlbzk5NTMwNnBzMnZwd3h5OWhwazJvIn0.FhdBhjtsMsUAge-3EoptiQ'
    }).addTo(map);
    */
    
    //load the geoJSON data for the constituencies
    await fetch("./ttmap.geojson").then(function (response) {
        return response.json();
    }).then(function (data) {
        L.geoJSON(data, {
            onEachFeature: function (feature, layer) {
                layer.bindPopup(feature.properties.Constituency);

                // layer.bindPopup(feature.properties.Constituency + 
                //     '<br>' + `<button class="btn btn-link" onClick="setStart()">Start Route Here</button>`
                //     + '<br>' + `<button onClick="setEnd()">End Route Here</button>`
                //     + '<br>' + `<button onClick="liveRouting()">My Location To Here</button>`);


                layer.on('contextmenu', function (e) {
                    menu = `<ul style="display: block; position: relative; border: none; margin: -20px;" class="dropdown-menu">
                            <li><h6 class="dropdown-header">Routing Menu</h6></li>
                            <li><a class="dropdown-item" href="#" onClick="setStart(event)">Start Route Here</a></li>
                            <li><a class="dropdown-item" href="#"  onClick="setEnd()">End Route Here</a></li>
                            <li><a class="dropdown-item" href="#"  onClick="liveRouting()">My Location To Here</a></li>
                            <li><a class="dropdown-item" href="#"  onClick="clearRouting()">Clear Routes</a></li>
                        </ul>`

                    var popup = L.popup().setContent(menu).setLatLng(e.latlng).openOn(map);

                    popupLocation = e.latlng
                })
            }
        }).addTo(map)
    });

    
}

let startCircle;
let endCircle;

function clearRouting(){
    if(watchid != null){
        navigator.geolocation.clearWatch(watchid)
    }
    if(debuglines) map.removeLayer(debuglines)
    if (startCircle) map.removeLayer(startCircle)
    if (endCircle) map.removeLayer(endCircle)
    if (line) map.removeLayer(line)
    if (route) map.removeLayer(route)
    waypoints.startPoint = L.latLng(0, 0)
    waypoints.endPoint = L.latLng(0, 0)
}

function setStart(e){
    if(watchid != null){
        navigator.geolocation.clearWatch(watchid)
    }
    
    let pos = popupLocation
    waypoints.startPoint = pos

    const sp = JSON.stringify(waypoints.startPoint)
    const ep = JSON.stringify(waypoints.endPoint)

    if(startCircle == null){
        startCircle = L.circleMarker(waypoints.startPoint, {
            radius: 8,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })
    
        startCircle.addTo(map)
    }
    else{
        map.removeLayer(startCircle)

        startCircle = L.circleMarker(waypoints.startPoint, {
            radius: 8,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })

        startCircle.addTo(map)
    }

    if(sp != '{"lat":0,"lng":0}' && ep != '{"lat":0,"lng":0}'){
        routingConcept()
    }
}

function setEnd(e){
    if(watchid != null){
        navigator.geolocation.clearWatch(watchid)
    }
    let pos = popupLocation
    waypoints.endPoint = pos
    
    const sp = JSON.stringify(waypoints.startPoint)
    const ep = JSON.stringify(waypoints.endPoint)

    if(endCircle == null){
        endCircle = L.circleMarker(waypoints.endPoint, {
            radius: 8,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })
    
        endCircle.addTo(map)
    }
    else{
        map.removeLayer(endCircle)

        endCircle = L.circleMarker(waypoints.endPoint, {
            radius: 8,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })

        endCircle.addTo(map)
    }

    if(sp != '{"lat":0,"lng":0}' && ep != '{"lat":0,"lng":0}'){
        routingConcept()
    }
}

function liveRouting(e){
    if(watchid != null){
        navigator.geolocation.clearWatch(watchid)
    }
    let pos = popupLocation
    waypoints.endPoint = pos

    if(endCircle == null){
        endCircle = L.circleMarker(waypoints.endPoint, {
            radius: 7,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })
    
        endCircle.addTo(map)
    }
    else{
        map.removeLayer(endCircle)

        endCircle = L.circleMarker(waypoints.endPoint, {
            radius: 8,
            color: 'black',
            fillColor: 'white',
            fillOpacity: 1
        })

        endCircle.addTo(map)
    }

    watchid = navigator.geolocation.watchPosition(function (pos){
        waypoints.startPoint = L.latLng(pos.coords.latitude, pos.coords.longitude)
        
        if(startCircle == null){
            startCircle = L.circleMarker(waypoints.startPoint, {
                radius: 8,
                color: 'black',
                fillColor: 'white',
                fillOpacity: 1
            })
        
            startCircle.addTo(map)
        }
        else{
            map.removeLayer(startCircle)
    
            startCircle = L.circleMarker(waypoints.startPoint, {
                radius: 8,
                color: 'black',
                fillColor: 'white',
                fillOpacity: 1
            })
    
            startCircle.addTo(map)
        }

        routingConcept()
    }, function () {
        displayToast("error", "Please ensure that you have location turned on!");
        console.log("err")
    })
}

async function getPotholes() {
    let potholes = await sendRequest(SERVER + '/api/potholes', 'GET');
    return potholes;
}

//function responsible for displaying the potholes on the map
async function displayPotholes() {
    if (markers)
        markers = []
    if (markersLayer)
        markersLayer.clearLayers();

    //adds a markers layer to the map
    markersLayer = L.layerGroup().addTo(map);

    let potholes = await getPotholes();
    if (potholes.length > 0) {
        for (let pothole of potholes) {
            var constituency = await leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);

            try {
                //create a new marker object with the constituency name, pothole id and constituency id
                let marker = L.marker([pothole.latitude, pothole.longitude], {
                    constituency: constituency[0].feature.properties.Constituency,
                    potholeID: pothole.potholeID,
                    constituencyID: constituency[0].feature.properties.ID
                }).on('click', async function () {
                    var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
                    var constituencyName = document.getElementById('constituencyName')
                    constituencyName.innerText = constituency[0].feature.properties.Constituency;

                    //load reports and constituency data when the marker is clicked
                    loadReports(this.options.potholeID);
                    loadConstituencyData(this.options.constituencyID)

                    //toggle the offcanvas
                    var offCanvasReport = getOffCanvas();
                    offCanvasReport.toggle();
                }).bindPopup(pothole.numReports + " Report(s)").addTo(markersLayer);
                markers.push(marker)
            } catch (e) {
                console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
            }
        }   
    } 
    
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}

//gets the Report off canvas element
function getOffCanvas() {
    var offcanvasElementList = [].slice.call(document.querySelectorAll('.offcanvas'))
    var offcanvasList = offcanvasElementList.map(function (offcanvasEl) {
        return new bootstrap.Offcanvas(offcanvasEl)
    })

    for (const offCanvas of offcanvasList) {
        if (offCanvas._element.id === 'offcanvasReport') {
            return offCanvas;
        }
    }
}

//loads all of the potholes in a constituency and returns an array of objects containing the data for that constituency
//used for the constituency leaderboard
async function getPotholesByConstituency() {
    let constituencies = []

    var leaderboardData = []

    for (var pothole of markers) {
        leaderboardData.push(pothole.options.constituency)
    }

    for (const pothole of markers) {
        let constituency = pothole.options.constituency;
        let constituencyCode = pothole.options.constituencyID;

        let found = false;
        for (const c of constituencies) {
            if (c.name === constituency) {
                c.count++;
                found = true;
            }
        }
        if (!found) {
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

    constituencies.sort(function (a, b) {
        return b.count - a.count;
    })

    return constituencies;
}

//gets the pothole data for all potholes and returns an array of objects containing the data for each pothole
async function getReportLeaderboardData() {
    leaderboardData = []
    let potholes = await getPotholes()

    //sort result by numReports
    potholes.sort(function (a, b) {
        return b.numReports - a.numReports;
    })

    for (const pothole of potholes) {
        var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
        try {
            leaderboardData.push({
                constituency: constituency[0].feature.properties.Constituency,
                potholeID: pothole.potholeID,
                numReports: pothole.numReports,
                lat: pothole.latitude,
                long: pothole.longitude,

            })
        } catch (e) {
            console.log("PotholeID: " + pothole.potholeID + " may not lie on map!")
        }
    }
    return leaderboardData;
}

//trigger the offcanvas the councilor data is requested
function reportLeaderboardModal(lat, long, potholeID) {
    var constituency = leafletPip.pointInLayer([long, lat], map);
    var constituencyName = document.getElementById('constituencyName')

    constituencyName.innerText = constituency[0].feature.properties.Constituency;

    loadReports(potholeID);
    loadConstituencyData(constituency[0].feature.properties.ID)

    var offCanvasReport = getOffCanvas();
    offCanvasReport.toggle();
    console.log(offCanvasReport)
}

async function routingConcept() {
    routingStartPoint = new L.Routing.Waypoint;
    routingStartPoint.latLng = waypoints.startPoint;

    routingEndPoint = new L.Routing.Waypoint;
    routingEndPoint.latLng = waypoints.endPoint;    

    var myRoute = L.Routing.osrmv1({
        serviceUrl: 'https://osrm.justinbaldeo.com/route/v1'
    });

    myRoute.route([routingStartPoint, routingEndPoint], async function(err, routes) {
        let numClear = 0;
        if(routes){
            let potholes = await getPotholes()
            debuglines = L.layerGroup().addTo(map);

            for(let route of routes){
                let clearRoute = true
                let numPotholes = 0
                for (let pothole of potholes) {
                    let point = L.latLng(pothole.latitude, pothole.longitude)

                    if(isPointOnLine(point, route.coordinates)) {
                        console.log("Attempting to avoid " + route.name + " since Pothole " + pothole.potholeID + " lies on route.")
                        clearRoute=false
                        numPotholes++;          
                    }
                } 

                route.numPotholes = numPotholes;

                if(!debug){
                    if(clearRoute){
                        if(line) map.removeLayer(line)
                        line = L.Routing.line(route)
                        line.addTo(map)
                        numClear++
                    }
                } else{
                    if(debug){
                        var templine = L.Routing.line(route,{
                            styles: [{color: 'gray'}]
                        })
                        templine.addTo(debuglines)
                        
                    }
                }
            }

            if(numClear == 0){
                displayToast("error", "No pothole free route exists!")

                let lowestNumPotholes = routes[0].numPotholes
                let lowestRoute = routes[0]
                for(let route of routes){
                    if(route.numPotholes < lowestNumPotholes){
                        lowestNumPotholes = route.numPotholes
                        lowestRoute = route
                    }
                }

                if(line) map.removeLayer(line)
                line = L.Routing.line(lowestRoute)
                line.addTo(map)
            }
        }
        else{
            if(!window.navigator.onLine){
                displayToast("error", "You must be online to use this feature!")
            } else {
                displayToast("error", "No route exists between these points!")
            }
        }
    });
}

async function main() {
    var currentCircle;

    await initMap();
    await displayPotholes();

    watchid = navigator.geolocation.watchPosition(function (pos){
        if (currentCircle!=null) map.removeLayer(currentCircle)

       var currentpos = L.latLng(pos.coords.latitude, pos.coords.longitude);
        currentCircle = L.circleMarker(currentpos, {
            color: 'red',
            fillColor: 'red',
            radius: 8,
            fillOpacity: 0.2,
        }).addTo(map);
    })

        caches.open(`main-1`).then(function(cache){
            cache.keys().then(function(cacheKeys){
                cacheKeys.find((o,i) => {
                    if(o.url.includes('https://dl.dropboxusercontent.com/s/87jkx7txs1uazqw/tandtS.mbtiles?dl=1')){
                        offline = L.tileLayer.mbTiles('https://dl.dropboxusercontent.com/s/87jkx7txs1uazqw/tandtS.mbtiles?dl=1', {
                            attribution: 'Offline Map'
                        });
                        
                        //switch between online and offline map
                        lControl.addBaseLayer(offline, "Offline"); 
                    }
                })
            })
        })
}   

window.addEventListener('DOMContentLoaded', main);
