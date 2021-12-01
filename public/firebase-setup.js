// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-analytics.js";


import { firebaseConfig } from "./credentials.js";


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Get a reference to the storage service, which is used to create references in your storage bucket
const myStorage = getStorage();


//To send to the backend


async function postDriverReport() {

  const backendurl = "http://spotdpothole.herokuapp.com" + "/api/reports/driver"
  
    //call method to upload only descripiton: makeRequest( photoURL, BackendURL)
    makeRequest(null, backendurl)
 
  

}


async function postStandardReport() {

  //STEP1: UPLOAD IMAGE
  let imageCheck = uploadImage()

  if (imageCheck == false) {
    //call method to upload only descripiton
    const url = "http://spotdpothole.herokuapp.com" + "/api/reports/standard"
    makeRequest(null, url)
  }
  

}


async function makeRequest(photoURL = null, url) {

  var latitude;
  var longitude;
  //STEP2: get location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      //Successful action
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;


    }, alert("To obtain your location, permission must be granted first."))

    

    let description = document.getElementById("descriptionText").value; // get text

    const data = {
      "longitude": longitude,
      "latitude": latitude,
      "description": description,
      "images": []
    };

    if( photoURL != null){
      data["images"] = [photoURL];
    }
      

    console.log( JSON.stringify(data) );

    try {
      let access_token = window.localStorage.getItem("access_token");
     

      let request = {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${access_token}`,
          
        },
        "body":JSON.stringify(data)
      }
      


      
      let response = await fetch(url, request);
      let results = await response.json()

      //console.log("Post Request Results: " + JSON.stringify(results) ); //3. Do something with the message
    }
    catch (error) {
     // console.log(`Error: ` + error)
      
    }

  }//end of if

}


// Firebase 
function uploadImage() {
  console.log('Entered')
  //const ref = myStorage.ref();

  //Get the single file input
  const file = document.querySelector('#photo').files[0];

  if (file != null) {
    console.log(file)

    const fileName = new Date() + '-' + file.name

    //const imgRef = ref(myStorage, fileName);
    // Create a storage reference from our storage service
    const storageRef = ref(myStorage, fileName);

    const uploadTask = uploadBytesResumable(storageRef, file);

    console.log(uploadTask)
    // Register three observers:
    // 1. 'state_changed' observer, called any time the state changes
    // 2. Error observer, called on failure
    // 3. Completion observer, called on successful completion
    uploadTask.on('state_changed',
      (snapshot) => {
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
      },
      (error) => {
        // Handle unsuccessful uploads
      },
      () => {
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);

          //send the image to be backend
          const backendurl = "http://spotdpothole.herokuapp.com" + "/api/reports/standard"
          makeRequest(downloadURL, backendurl)
        });
      }
    );

    return true
  }
  return false
}

document.getElementById('submit-passenger-report').addEventListener('click', postStandardReport);
document.getElementById('submit-driver-report').addEventListener('click', postDriverReport);
