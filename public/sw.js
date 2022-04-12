//SpotDPothole Service Worker
//Sets and creates initial cache and indexed database variables.
const CACHE_VERSION = 1;
const CURRENT_CACHE = `main-${CACHE_VERSION}`;
var CACHE_NAME = 'offline-form';
var FOLDER_NAME = 'post_requests'
var IDB_VERSION = 1
var form_data
var our_db

//Creates a message channel for communicating between the service worker and the web-app.
//Approach inspiration taken from pipes in Operating Systems.
//Removed due to it being newly implemented for iOS devices on March 14th 2022.
//const channel = new BroadcastChannel('sw-messages');

const mbTilesLink = 'https://dl.dropboxusercontent.com/s/87jkx7txs1uazqw/tandtS.mbtiles?dl=1';

//Files to be cached for offline support.
const cacheFiles = [
	'ttmap.geojson',
	'css/style.css',
	'css/bootstrap.min.css.map',
	'manifest.json',
	'js/map.js',
	'js/index.js',
	'index.html',
	'js/constants.js',
	'js/leaflet.geometryutil.js',
	'js/leaflet-routing-machine.js',
	'images/favicon-16x16.png',
	'images/favicon-32x32.png',
	'images/icons-192.png',
	'images/icons-512.png',
	'images/road.jpg',
	'images/SpotDPothole-Logo.png',
	'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css',
	'css/bootstrap.min.css',
	'css/leaflet.min.css',
	'https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Raleway:300,300i,400,400i,500,500i,600,600i,700,700i|Poppins:300,300i,400,400i,500,500i,600,600i,700,700i',
	'https://cdn.jsdelivr.net/npm/leaflet-pip@1.1.0/leaflet-pip.js',
	'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.js',
	'https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/js/bootstrap.bundle.min.js',
	'https://www.gstatic.com/firebasejs/7.15.5/firebase-app.js',
	'https://www.gstatic.com/firebasejs/7.15.5/firebase-storage.js'
];

// Service Worker, "service-worker.js", service worker activation referenced from JMPerez, September 28th 2020, found at:
// https://gist.github.com/JMPerez/8ca8d5ffcc0cc45a8b4e1c279efd8a94
// Removes cache associated with previous service worker.
self.addEventListener('activate', evt => {
	evt.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (cacheName !== CURRENT_CACHE) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	)
});

// Service Worker, "service-worker.js", installation referenced from JMPerez, September 28th 2020, found at:
// https://gist.github.com/JMPerez/8ca8d5ffcc0cc45a8b4e1c279efd8a94
// Caches the listed resources of cacheFiles once the service worker is installed.
self.addEventListener('install', evt =>{
	evt.waitUntil(
		caches.open(CURRENT_CACHE).then(cache => {
		return cache.addAll(cacheFiles);
		})
	)
});

// Service Worker, "service-worker.js", network strategy referenced from JMPerez, September 28th 2020, found at:
// https://gist.github.com/JMPerez/8ca8d5ffcc0cc45a8b4e1c279efd8a94
// Defines the strategy to be used when pulling resources from the network.
const fromNetwork = (request, timeout) => new Promise((fulfill, reject) => {
	const timeoutId = setTimeout(reject, timeout);
	fetch(request).then(response => {
		clearTimeout(timeoutId);
		fulfill(response);
		update(request);
	}, reject);
});

// Service Worker, "service-worker.js", cache strategy referenced from JMPerez, September 28th 2020, found at:
// https://gist.github.com/JMPerez/8ca8d5ffcc0cc45a8b4e1c279efd8a94
// Defines the strategy to be used when pulling resources from the cache.
// Opens the cache and returns the response from cache for a request that matches any stored request in cache.
const fromCache = request => caches
	.open(CURRENT_CACHE)
	.then(cache =>cache
	.match(request)
	.then(function(matching){
		return matching;
	}).catch(function(e){
		return new Response();
	})
);

// Caches the current visited page.
// Opens the cache, performs a fetch on the requestm and stores the response in the cache.
// If an error occurs, do nothing.
const update = request => caches
	.open(CURRENT_CACHE)
	.then(cache =>fetch(request).then(response => cache.put(request, response)).catch(doNothing));

//Adds a listener for fetches within the web app. This is responsible for handling which requests gets cached,
//and how offline pothole reports are filed.
self.addEventListener('fetch', function(event) {
	//When handling GET requests that are not associated with the map (since we are using our own offline map),
	//we must cache the request and response if they are static.
	if (event.request.method === 'GET' && !event.request.url.includes("openstreetmap.org/")) {
		//If the request specifies a URL that contains dynamic content; such as the API, OSRM and login state, we use a network first strategy.
		if(event.request.url.includes("/api/") || event.request.url.includes("osrm") || event.request.url.includes("identify")){
			//Respond to the request with a response from the network, falling back to cache if the response fails.
			event.respondWith(
				fromNetwork(event.request, 10000).catch(() => fromCache(event.request))
			);
			

		//Otherwise, the remaining content will be static content and will make use of a cache first strategy.
		} else {
			//Responds to the event with a response from the cache, if it exists.
			event.respondWith(
				caches.match(event.request).then(function(response) {
					return response || fetch(event.request);
				})
			);
		}
		
		//Attempts to update the cache the visited resource
		if(event.request.url.includes("mbtiles")){
			caches.match(mbTilesLink).then(function(response) {
				if(response){
					console.log("Offline Map Available!")
				}
			})
		} else {
			event.waitUntil(update(event.request));
		}
	//Otherwise, if the request is a POST request; sending the report data or voting, prepare offline techniques if sending fails.
	} else if (event.request.clone().method === 'POST') {
		//console.log('form_data', form_data)
		//Attempts to service the POST request via network. If this fails, save the request to the indexedDB of the browser.
		event.respondWith(fetch(event.request.clone()).catch(function (error) {
			//If an error has occured with sending the POST request over network, store the request if it is a POST request for reporting or voting.
			if(event.request.url.includes('/api/reports/standard') || event.request.url.includes('/api/reports/driver') || event.request.url.includes('vote')){
				//Saves the URL of the post request, and the form_data associated with the post request. (form_data is a global object)
				savePostRequests(event.request.clone().url, form_data)
			}
		}))
	}
});

//Literally does nothing. I needed an error handler for a cache miss but it does not matter to us if there is a cache miss.
function doNothing(e){
	() => {}
}

// "Handling POST/PUT Requests in Offline Applications...", referenced from Adeyinka Adegbenro, August 3rd 2018, found at:
// https://blog.formpl.us/how-to-handle-post-put-requests-in-offline-applications-using-service-workers-indexedb-and-da7d0798a9ab
// Retrieves the object storage use for storing the requests.
function getObjectStore (storeName, mode) {
  	return our_db.transaction(storeName, mode).objectStore(storeName)
}

// "Handling POST/PUT Requests in Offline Applications...", referenced from Adeyinka Adegbenro, August 3rd 2018, found at:
// https://blog.formpl.us/how-to-handle-post-put-requests-in-offline-applications-using-service-workers-indexedb-and-da7d0798a9ab
// Accepts the request URL and the request and attempts to add the request to the indexedDB database.
function savePostRequests(url, request) {
	//Gets a handle on the indexedDB storage location and adds the URL and request to the indexedDB storage location.
	var request = getObjectStore(FOLDER_NAME, 'readwrite').add({
		url: url,
		request: request
	})

	//Upon successfully adding the request, log the outcome.
	request.onsuccess = function (event) {
		console.log('Request added to sync queue.')
	}

	//If an error occurs, log the error.
	request.onerror = function (error) {
		console.error(error)
	}
}

// "Handling POST/PUT Requests in Offline Applications...", referenced from Adeyinka Adegbenro, August 3rd 2018, found at:
// https://blog.formpl.us/how-to-handle-post-put-requests-in-offline-applications-using-service-workers-indexedb-and-da7d0798a9ab
//Creates the database for storage of the offline requests.
function openDatabase () {
	//Attempts to create/open the indexedDB database used for storage of the report/vote data.
	var indexedDBOpenRequest = indexedDB.open('queued-requests')

	//If an error occurs when creating/opening the indexedDB, print the corresponding error.
	indexedDBOpenRequest.onerror = function (error) {
		console.error('IndexedDB error:', error)
	}

	//If the indexedDB is outdated or needs to be created, create the updated database with the schema.
	indexedDBOpenRequest.onupgradeneeded = function () {
		this.result.createObjectStore(FOLDER_NAME, { autoIncrement: true, keyPath: 'id' })
	}

	// Whenever the database is opened, set the global our_db object to the current instance holding the indexedDB.
	indexedDBOpenRequest.onsuccess = function () {
		our_db = this.result
	}
}


//If postMessage was used within the web-app, the contents are intercepted here.
//Hence, all post requests are intercepted if they have the form_data property.
self.addEventListener('message', function (event) {
	//console.log('Form Data Received from Request: ', event.data)

	//Determines if the request was generated from a post request corresponding to a report or vote.
	if (event.data.hasOwnProperty('form_data')) {
		//Sets the intercepted form data to the global form_data object.
		form_data = event.data.form_data
	}

	if ("downloadMap" in event.data){
		event.waitUntil(update(mbTilesLink).then(function(){
			channel.postMessage({"mapDownloadComplete" : true})
			console.log("Map download complete!")
		}))
	}
})

// "Handling POST/PUT Requests in Offline Applications...", referenced from Adeyinka Adegbenro, August 3rd 2018, found at:
// https://blog.formpl.us/how-to-handle-post-put-requests-in-offline-applications-using-service-workers-indexedb-and-da7d0798a9ab
// Sends the stored post requests to the backend server.
function sendPostToServer () {
	//Sets the saved requests to an empty array.
	var savedRequests = []

	//Gets the indexedDB object reference used in storing the POST requests.
	var req = getObjectStore(FOLDER_NAME).openCursor()

	//Upon successfully accessing the 
	req.onsuccess = async function (event) {
		//Gets the current cursor position.
		var cursor = event.target.result;
		
		//If the cursor has a valid position (database opened successfully), collect the saved requests. 
		if (cursor) {
			//Push all of the requests within the indexedDB into the savedRequests array.
			savedRequests.push(cursor.value)
			cursor.continue()
		} else {
		//Once all of the saved requests have been retrieved from the database, attempt to resend them.
			for (let savedRequest of savedRequests) {
				//Gets the request URL destination and the actual request.
				var requestUrl = savedRequest.url
				var request = savedRequest.request

				//Performs a request to the requestURL with the request.
				fetch(requestUrl, request).then(async function (response) {
					//Once the request has been submitted, store the response and convert it to Json.
					responseJson = await response.json()

					//Removes the post request from the IndexedDB.
					getObjectStore(FOLDER_NAME, 'readwrite').delete(savedRequest.id)
				}).catch(function (error) {
					//Upon error, display an error to the console.
					//An exception is thrown so that background sync may reattempt it when network conditions become favorable.
					console.error('Send to Server failed: ', error)
					throw error
				})
			}
		}
	}
}

//Adds a sync event listener to the service worker that will fire once the web-app has reconnected to the internet.
self.addEventListener('sync', function (event) {
	//Prints a message when the service worker is connected to the internet.
	console.log('Connected to Internet')
	//Determines if the sync event matches for sending saved requests.
	if (event.tag === 'sendSavedRequests') {
		event.waitUntil(
			//Sends the saved requests to the backend.
			sendPostToServer()
		)
	}
})

//Initializes the database by creating it if it does not exist, or opening it if it does.
//Assigns the created/found instance to a global variable, our_db.
openDatabase()