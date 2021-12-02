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
		div.setAttribute('class', "messsage success show");    
	} else {
		div.setAttribute('class', "message failed show");
	}
  
  	document.getElementById('mainTabContent').appendChild(div);
	// After 3 seconds, remove the show class from DIV
	setTimeout(() => { 
		console.log(id)
		let element = document.getElementById(id);
		element.className = element.className.replace("show", "hide"); 
	}, 3000);
}


//To send to the backend
async function postDriverReport() {
  	let results = await makeRequest(null, null, driverReportURL)
	console.log(results)
    let driverReportOutcome = document.querySelector("#driverReportOutcome")

	try {
		if("msg" in results){
			driverReportOutcome.innerHTML = "<div class='text-danger fw-bold'>You must be logged in to report a pothole!</div>"
		} else if("error" in results){
			driverReportOutcome.innerHTML = `<div class='text-danger fw-bold'>${results["error"]}</div>`
		} else if("message" in results){
			driverReportOutcome.innerHTML = `<div class="text-success fw-bold">${results["message"]}</div>`
		}
	} catch (e) {
		driverReportOutcome.innerHTML = `<div class="text-danger fw-bold text-center">An unknown error has occurred.</div>`
	}
}


async function postStandardReport() {
	//STEP1: UPLOAD IMAGE
	let imageUploadedResult = uploadImage()

	if (!imageUploadedResult) {
		//call method to upload only descripiton
		imageUploadedResult = await makeRequest(null, description, standardReportURL)
	}

	let standardReportOutcome = document.querySelector("#standardReportOutcome")

	try {
		if("msg" in results){
			standardReportOutcome.innerHTML = "<div class='text-danger fw-bold text-center'>You must be logged in to report a pothole!</div>"
		} else if("error" in results){
			standardReportOutcome.innerHTML = `<div class='text-danger fw-bold text-center'>${results["error"]}</div>`
		} else if("message" in results){
			standardReportOutcome.innerHTML = `<div class="text-success fw-bold text-center">${results["message"]}</div>`
		}
	} catch (e) {
		standardReportOutcome.innerHTML = `<div class="text-danger fw-bold text-center">An unknown error has occurred.</div>`
	}
}


async function makeRequest(photoURL = null, description, url) {
	var latitude, longitude;
	//STEP2: get location
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition((position) => {
			//Successful action
			latitude = position.coords.latitude;
			longitude = position.coords.longitude;


			//Insert latitude/longitude error check here.
			if(longitude == null || latitude == null){
				//add display message here
				displayToast("failed", "unfortunately we couldn't find your coordinates!")
				return;
			}

			return buildReportRequest(latitude, longitude, photoURL, description, url)
		}, alert("To obtain your location, permission must be granted first."))
 	}
}



async function buildReportRequest(latitude, longitude, photoURL, description = null, url){
	console.log(latitude, longitude)
  
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
		
	console.log(JSON.stringify(data));
  
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

		console.log(request)
		
		let response = await fetch(url, request);
		let results = await response.json()
  
		console.log("Post Request Results: " + JSON.stringify(results) ); //3. Do something with the message
		return results;
	} catch (error) {
		console.log(`Error: ` + error)
		return error;
	}
}


// Firebase 
async function uploadImage() {
	console.log('Entered')
	//const ref = myStorage.ref();

	//Get the single file input
	const file = document.querySelector('#photo').files[0];

	if (file != null) {
		console.log(file)

		const fileName = "REPORT - " + new Date().toLocaleString();

		//const imgRef = ref(myStorage, fileName);
		// Create a storage reference from our storage service
		const storageRef = ref(myStorage, fileName);

		const uploadTask = uploadBytesResumable(storageRef, file);

		console.log(uploadTask)
		// Register three observers:
		// 1. 'state_changed' observer, called any time the state changes
		// 2. Error observer, called on failure
		// 3. Completion observer, called on successful completion
		uploadTask.on('state_changed', (snapshot) => {
			// Observe state change events such as progress, pause, and resume
			// Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
			const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
			console.log('Upload is ' + progress + '% done');
			switch (snapshot.state) {
			case 'paused':
				console.log('Upload is paused');
				break;
			case 'running':
				console.log('Upload is running');
				break;
			}
		}, (error) => {
			// Handle unsuccessful uploads
			console.log(error)
			return false;
		}, () => {
				// Handle successful uploads on complete
				// For instance, get the download URL: https://firebasestorage.googleapis.com/...
				getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
					console.log('File available at', downloadURL);
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
