// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-app.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-analytics.js";


import { firebaseConfig } from "./credentials.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Get a reference to the storage service, which is used to create references in your storage bucket
const myStorage = getStorage(app);


//Backend Constants
const SERVER = "https://spotdpothole.herokuapp.com/"
const driverReportURL = SERVER + "/api/reports/driver"
const standardReportURL = SERVER + "/api/reports/standard"


/* To display Toast */
function displayToast(type, message) {
	var id= new Date() + '-' + "notification"
	var div = document.createElement('div');
	div.textContent = message;

	div.setAttribute('id', id)
	div.setAttribute('class', '');
  
	if( type=='success'){
		div.setAttribute('class', "message success show");    
	} else {
		div.setAttribute('class', "message failed show");
	}
  
  	document.getElementById('mainTabContent').appendChild(div);

	// After 4 seconds, remove the show class from DIV
	setTimeout(() => { 
		let element = document.getElementById(id);
		element.className = element.className.replace("show", "hide"); 
	}, 4000);
}


//To send to the backend
async function postDriverReport() {
  	await makeRequest(null, null, driverReportURL);
}


async function postStandardReport() {
	//STEP1: UPLOAD IMAGE
	let imageUploadedResult = uploadImage()

	if (!imageUploadedResult) {
		//call method to upload only descripiton
		imageUploadedResult = await makeRequest(null, description, standardReportURL)
	}
}


async function makeRequest(photoURL = null, description, url) {
	var latitude, longitude;
	//STEP2: get location
	
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(async (position) => {
			//Successful action
			latitude = position.coords.latitude;
			longitude = position.coords.longitude;
			
			let results = await buildReportRequest(latitude, longitude, photoURL, description, url)


			try {
				if("msg" in results){
					displayToast("failed", "You must be logged in to report a pothole!")
				} else if("error" in results){
					displayToast("failed", results["error"])
				} else if("message" in results){
					displayToast("success", results["message"])
				}
			} catch (e) {
				displayToast("failed", results["error"])
			}

		}, function(){
			//Insert latitude/longitude error check here.
			if(longitude == null || latitude == null){
				//add display message here
				displayToast("failed", "Unfortunately we couldn't find your coordinates!")
				return;
			}
		})
 	} else {
		displayToast("failed", "unfortunately we couldn't find your coordinates!")
	}
}



async function buildReportRequest(latitude, longitude, photoURL, description = null, url){ 
	var data = {
		"longitude": longitude,
		"latitude": latitude,
	};

	if(description != null){
		data["description"] = description
	}

	if(photoURL != null){
		data["images"] = [photoURL];
	} else {
		data["images"] = []
	}
  
	try {
		let access_token = window.localStorage.getItem("access_token");
	   
		let request = {
                "method" : "POST",
                "headers" : {
                    "Authorization" : `Bearer ${access_token}`,
                    "Content-Type" : "application/json"
                }
        }

        request.body = JSON.stringify(data);
		
		let response = await fetch(url, request);
		let results = await response.json()
		return results;
	} catch (error) {
		return error;
	}
}


// Firebase 
async function uploadImage() {
	//const ref = myStorage.ref();

	//Get the single file input
	const file = document.querySelector('#photo').files[0];

	if (file != null) {
		const fileName = "REPORT - " + new Date().toLocaleString();

		//const imgRef = ref(myStorage, fileName);
		// Create a storage reference from our storage service
		const storageRef = ref(myStorage, fileName);

		const uploadTask = uploadBytesResumable(storageRef, file);

		// Register three observers:
		// 1. 'state_changed' observer, called any time the state changes
		// 2. Error observer, called on failure
		// 3. Completion observer, called on successful completion
		uploadTask.on('state_changed', (snapshot) => {
			// Observe state change events such as progress, pause, and resume
			// Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
			const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
			switch (snapshot.state) {
			case 'paused':
				break;
			case 'running':
				break;
			}
		}, (error) => {
			// Handle unsuccessful uploads
			return false;
		}, () => {
				// Handle successful uploads on complete
				// For instance, get the download URL: https://firebasestorage.googleapis.com/...
				getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
					let description = document.getElementById("descriptionText").value; // get text
					let results = makeRequest(downloadURL, description, standardReportURL)
					return results
				});
		});
		return true
	}
	return false
}

document.getElementById('submit-passenger-report').addEventListener('click', postStandardReport);
document.getElementById('submit-driver-report').addEventListener('click', postDriverReport);
