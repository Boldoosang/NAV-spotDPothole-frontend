


// the cache version gets updated every time there is a new deployment
const CACHE_VERSION = 1;
const CURRENT_CACHE = `main-${CACHE_VERSION}`;

// these are the routes we are going to cache for offline support
const cacheFiles = [
  'dashboard.js',
  'ttmap.geojson',
  'styles.css',
  'manifest.json',
  'map.js',
  'index.js',
  'index.html',
  'constants.js',
  'images/favicon-16x16.png',
  'images/favicon-32x32.png',
  'images/icons-192.png',
  'images/icons-512.png',
  'images/SpotDPothole-Logo.png',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.1/font/bootstrap-icons.css',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
  'https://unpkg.com/@mapbox/leaflet-pip@latest/leaflet-pip.js',
  'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.1.1/dist/js/bootstrap.bundle.min.js',
  'https://www.gstatic.com/firebasejs/7.15.5/firebase-app.js',
  'https://www.gstatic.com/firebasejs/7.15.5/firebase-storage.js'
];

// on activation we clean up the previously registered service workers
self.addEventListener('activate', evt =>
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
);

// on install we download the routes we want to cache for offline
self.addEventListener('install', evt =>
  evt.waitUntil(
    caches.open(CURRENT_CACHE).then(cache => {
      return cache.addAll(cacheFiles);
    })
  )
);

// fetch the resource from the network
const fromNetwork = (request, timeout) =>
  new Promise((fulfill, reject) => {
    const timeoutId = setTimeout(reject, timeout);
    fetch(request).then(response => {
      clearTimeout(timeoutId);
      fulfill(response);
      update(request);
    }, reject);
  });

// fetch the resource from the browser cache
const fromCache = request =>
  caches
    .open(CURRENT_CACHE)
    .then(cache =>
      cache
        .match(request)
        .then(function(matching){
            //console.log("This matches something in the cache!")
            //console.log(await matching.json())
            return matching;
        }).catch(function(e){
            console.log("This doesn't match anything in the cache!")
            return new Response();
        })
    );

// cache the current page to make it available for offline
const update = request =>
  caches
    .open(CURRENT_CACHE)
    .then(cache =>
      fetch(request).then(response => cache.put(request, response)).catch(doNothing)
    );

// general strategy when making a request (eg if online try to fetch it
// from the network with a timeout, if something fails serve from cache)
/*
self.addEventListener('fetch', evt => {
  evt.respondWith(
    fromNetwork(evt.request, 10000).catch(() => fromCache(evt.request))
  );
  evt.waitUntil(update(evt.request));
});
*/


var isExistInCache = function(request){
  return caches.open(CURRENT_CACHE)
  .then(function(cache) {
    return cache.match(request)
    .then(function(response) {
      return !!response; // or `return response ? true : false`, or similar.
    });
  });
}

//bg sync fetch
self.addEventListener('fetch', function(event) {
  // every request from our site, passes through the fetch handler
  //console.log('I am a request with url: ', event.request.clone().url)

  if (event.request.method === 'GET') {

    //figure out if these are the main files to be cached
    if(event.request.url.includes("/api/") || event.request.url.includes("identify")){
      console.log(event.request.url + " will get the latest version!")
      
      event.respondWith(
        fromNetwork(event.request, 10000).catch(() => fromCache(event.request))
      );

      
    } else {
      console.log(event.request.url + " will be retrieved from cache first, then network!")
      event.respondWith(
        caches.match(event.request).then(function(response) {
          return response || fetch(event.request);
        })
      );
    }
    event.waitUntil(update(event.request));
  } else if (event.request.clone().method === 'POST') {
    // attempt to send request normally
    console.log('form_data', form_data)
    event.respondWith(fetch(event.request.clone()).catch(function (error) {
      // only save post requests in browser, if an error occurs
      savePostRequests(event.request.clone().url, form_data)
    }))
  }
});

//end bg sync fetch


var CACHE_NAME = 'offline-form';
var FOLDER_NAME = 'post_requests'
var IDB_VERSION = 1
var form_data

//Background Sync

function getObjectStore (storeName, mode) {
  return our_db.transaction(storeName, mode).objectStore(storeName)
}

function doNothing(e){
  () => {}
}


function savePostRequests(url, request) {
  var request = getObjectStore(FOLDER_NAME, 'readwrite').add({
    url: url,
    request: request
  })

  request.onsuccess = function (event) {
    console.log('A new post request has been added to local IndexedDB.')
  }

  request.onerror = function (error) {
    console.error(error)
  }
}


function openDatabase () {
  // if `flask-form` does not already exist in our browser (under our site), it is created
  var indexedDBOpenRequest = indexedDB.open('flask-form')

  indexedDBOpenRequest.onerror = function (error) {
    console.error('IndexedDB error:', error)
  }

  
  indexedDBOpenRequest.onupgradeneeded = function () {
    // This should only execute if there's a need to create/update db.
    this.result.createObjectStore(FOLDER_NAME, { autoIncrement: true, keyPath: 'id' })
  }

  // This will execute each time the database is opened.
  indexedDBOpenRequest.onsuccess = function () {
    our_db = this.result
  }
}

var our_db
openDatabase()

self.addEventListener('message', function (event) {
  console.log('Form data received from request', event.data)
  if (event.data.hasOwnProperty('form_data')) {
    // receives form data from script.js upon submission
    form_data = event.data.form_data
  }
})

function sendPostToServer () {
  var savedRequests = []
  var req = getObjectStore(FOLDER_NAME).openCursor() // FOLDERNAME = 'post_requests'

  req.onsuccess = async function (event) {
    var cursor = event.target.result;
    //let access_token = window.localStorage.getItem("access_token");

    if (cursor) {
      // Keep moving the cursor forward and collecting saved requests.
      savedRequests.push(cursor.value)
      cursor.continue()
    } else {
      // At this point, we have collected all the post requests in indexedb.
        for (let savedRequest of savedRequests) {
          // send them to the server one after the other
          console.log('saved request', savedRequest)
          var requestUrl = savedRequest.url
          var request = savedRequest.request
          fetch(requestUrl, request).then(function (response) {
            console.log('server response', response)
            //if (response.status < 400) {
              // If sending the POST request was successful, then remove it from the IndexedDB.
              getObjectStore(FOLDER_NAME, 'readwrite').delete(savedRequest.id)
            //} 
          }).catch(function (error) {
            // This will be triggered if the network is still down. The request will be replayed again
            // the next time the service worker starts up.
            console.error('Send to Server failed:', error)
            // since we are in a catch, it is important an error is thrown,
            // so the background sync knows to keep retrying sendto server
            throw error
          })
        }
    }
  }
}


self.addEventListener('sync', function (event) {
  console.log('now online')
  if (event.tag === 'sendFormData') { // event.tag name checked here must be the same as the one used while registering sync
    event.waitUntil(
      // Send our POST request to the server, now that the user is online
      sendPostToServer()
    )
  }
})
