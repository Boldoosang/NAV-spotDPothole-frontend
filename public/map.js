const container = document.getElementById('map')
var markersLayer;
let markers = [];
let leaderboardData = []

if(container) {
    var map = L.map('map', {
        center: [10.69, -61.23],
        zoom: 9,
    });

    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1IjoidGhlaHVtYW4iLCJhIjoiY2t3YXJoeTdhMm1ocDJxbW4wMXpuc2NhbCJ9.j0jEiwJsxa-Gm2DMb6Fdzw'
    }).addTo(map);

    fetch("./ttmap.geojson").then(function(response) {
        return response.json();
        }).then(function(data) {
        L.geoJSON(data, {
            onEachFeature: function(feature, layer) {
                console.log(feature)
            }
        }).addTo(map);
    });

    displayPotholes()
}
    function getRandom(){
        return today.getSeconds()/today.getMinutes() * 0.05
    }

    async function submitReport(){
        today = new Date();
            let randLat = Math.random() * getRandom();
            let randLong = Math.random() * getRandom();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async function(position) {
                const constituency = leafletPip.pointInLayer([position.coords.longitude, position.coords.latitude], map);
                    if(constituency.length == 0)
                        return
                    const data = {
                        "longitude" : position.coords.longitude,
                        "latitude" : position.coords.latitude,
                        "constituencyID" : constituency[0].feature.properties.Constituency,
                    }

                    let result =  await sendRequest(SERVER + '/api/reports/driver', 'POST', data);
                    console.log(result);
                    if(markersLayer)
                        markersLayer.clearLayers();

                    displayPotholes();
                });     
            }else {
                alert("Geolocation is not supported by this browser.");
                return null;
            }
    }

    async function submitReportClickTest(lat, long){
        const constituency = leafletPip.pointInLayer([long, lat], map);

        const data = {
            "longitude" : long,
            "latitude" : lat,
            "constituencyID" : constituency[0].feature.properties.Constituency,
        }

        let result =  await sendRequest(SERVER + '/api/reports/driver', 'POST', data);
        console.log(result);
        
        if(markersLayer)
            markersLayer.clearLayers();

        displayPotholes();
    }

    async function getPotholes(){
        let potholes = await sendRequest(SERVER + '/api/potholes', 'GET');
        return potholes;
    }

    async function displayPotholes(){
        let potholes = await getPotholes();
        console.log(potholes);
        if(potholes.length > 0){
            for(const pothole of potholes){
                var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);

                if(constituency.length == 0)
                    return
    
                if(constituency.length == 0){
                    constituency = [
                        {
                            "feature": {
                                "properties": {
                                    "ID": "null",
                                }
                            }
                        }
                    ]
                }     
                
                let marker = L.marker([pothole.latitude, pothole.longitude], {
                    constituency: constituency[0].feature.properties.Constituency,
                    potholeID: pothole.potholeID,
                    constituencyID: constituency[0].feature.properties.ID
                }).on('click', async function(){
                    getPotholesByConstituency()
                    let result =  await sendRequest(SERVER + '/api/potholes', 'GET');
                    console.log(result)

                    var constituency = leafletPip.pointInLayer([pothole.longitude, pothole.latitude], map);
                    var constituencyName = document.getElementById('constituencyName')
                    constituencyName.innerText = constituency[0].feature.properties.Constituency;
    
                    loadReports(this.options.potholeID);
                    loadConstituencyData(this.options.constituencyID)
                    
                    var offCanvasReport= getOffCanvas();
                    offCanvasReport.toggle();
                });
    
                markers.push(marker)
                markersLayer = L.layerGroup(markers); 
                markersLayer.addTo(map);
            }   
        }  
    }

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

    function getPotholesByConstituency(){
        let constituencies = []
        
        var leaderboardData = []
        
        for(var pothole of markers){
            leaderboardData.push(pothole.options.constituency)
        }

        console.log(leaderboardData)

        //count the number of potholes in each constituency and add to an array that contains each constituency name and the number of potholes
        for(var i = 0; i < leaderboardData.length; i++){
            var constituency = leaderboardData[i]
            var count = 0
            for(var j = 0; j < leaderboardData.length; j++){
                if(leaderboardData[j] == constituency){
                    count++
                }
            }
            
            constituencies.push({
                name: constituency,
                count: count
            }) 
        }
        var unique = constituencies.filter(onlyUnique);

        console.log(unique)
        
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
      }

