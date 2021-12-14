// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-app.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.5.0/firebase-analytics.js";

// Imports firebase credentials for connecting to firebase storage app
import { firebaseConfig } from "./credentials.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Get a reference to the storage service, which is used to create references in your storage bucket
const myStorage = getStorage(app);

//Facilitates the submission of a standard report for processing at the backend.
async function postStandardReport() {
	//Handles both cases of standard reports with images, and without.
	await handleStandardReport()
}

// Handles the submission of a standard pothole report for both image and non-image cases.
async function handleStandardReport() {
	//Get the single file input
	const file = document.querySelector('#photo').files[0];

	//If a valid file was uploaded, upload it to firebase.
	if (file != null) {
		//Determines if the file is not an image.
		console.log(file.type)
		if(!(['image/png', 'image/jpeg', 'image/gif', 'image/jpg'].includes(file.type))){
			alert("This file is not an image!")
			return;
		}

		//Sets the name of the file
		const fileName = "REPORT IMG - " + new Date().toLocaleString();

		// Create a storage reference from our storage service
		const storageRef = ref(myStorage, fileName);
		const uploadTask = uploadBytesResumable(storageRef, file);

		console.log(uploadTask)
		// Register three observers:
		// 1. 'state_changed' observer, called any time the state changes
		// 2. Error observer, called on failure
		// 3. Completion observer, called on successful completion

		//Get the upload progress text area.
		let uploadProgress = document.querySelector("#uploadProgress")

		await uploadTask.on('state_changed', await async function(snapshot) {
			// Observe state change events such as progress, pause, and resume

			// Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
			const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
			
			//Based on the state of uploading, update the upload progress text area.
			switch (snapshot.state) {
				case 'paused':
					uploadProgress.innerHTML = `<strong>UPLOAD PAUSED:</strong> Upload is ${progress}% done!`
					break;
				case 'running':
					uploadProgress.innerHTML = `<strong>UPLOAD RUNNING:</strong> Upload is ${progress}% done!`
					break;
			}
		}, await async function(error) {
		// Handle unsuccessful uploads
			//If there was an error in uploading the files, display the error in the upload progress text area.
			uploadProgress.innerHTML = `<strong>ERROR UPLOADING FILE: ${error}</strong>`
		}, await async function() {
		// Handle successful uploads on complete
			//If the file was successfully uploaded, display the success message in the upload progress text area.
			uploadProgress.innerHTML = `<strong>FILE SUCCESSFULLY UPLOADED</strong>`

			//Gets the download URL and description from the report, builds the report, and submits the report.
			let finalFileURL = await getDownloadURL(uploadTask.snapshot.ref)
			let description = document.getElementById("descriptionText").value; // get text
			console.log(finalFileURL)
			await buildReport(finalFileURL, description, STANDARD_REPORT_URL)
		});
	} else {
	//If no image was provided in the standard report, file the report without an image. 
		//Gets the report description from the report.
		let description = document.getElementById("descriptionText").value;
		//Sends a request with the description to the standardReport endpoint.
		await buildReport(null, description, STANDARD_REPORT_URL)
	}
}


//Carries out bootstrapping tasks 
function main(){
	//Attaches on event listener to the passenger/standard report button.
    document.getElementById('submit-passenger-report').addEventListener('click', postStandardReport);
}

//Once the DOM has loaded, carry out bootstrapping tasks.
window.addEventListener('DOMContentLoaded', main);