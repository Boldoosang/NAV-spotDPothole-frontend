let username
const SERVER = "https://spotdpothole.herokuapp.com"

async function sendRequest(url, method, data){
    try {
        let token = window.localStorage.getItem('access_token')

        let options = {
                "method" : method,
                "headers" : {
                "Content-Type" : "application/json",
                "Authorization" : `JWT ${token}`
            }
        }

        if(data)
            options.body = JSON.stringify(data)

        let response = await fetch(url, options)

        let result = await response.json()
            

        return result
    } catch (e) {
        console.log(e)
    }
}


function logout(){
    accessToken = window.localStorage.getItem("access_token");

    if(accessToken){
        window.localStorage.removeItem('access_token');
        console.log("Succesfully logged out!")
    } else 
        console.log("You were not logged in!")
    
    identifyUserContext()

    window.location = `/`
}

async function login(event){
    event.preventDefault();

    let form = event.target;

    let loginDetails = {
        "email" : form.elements["InputEmail"].value,
        "password" : form.elements["InputPassword"].value
    }

    form.reset();

    let result = await sendRequest(SERVER + "/login", "POST", loginDetails);
    //let messageArea = document.querySelector("#userActionMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
       // messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        window.localStorage.setItem("access_token", result["access_token"]);
        //messageArea.innerHTML = `<b class="text-success text-center">Login successful!</b>`
        //window.location = "/"
    }
}


async function register(event){
    event.preventDefault();

    let form = event.target;

    console.log(form.elements["agreeToS"])

    let registrationDetails = {
        "email" : form.elements["InputEmail"].value,
        "firstName" : form.elements["InputFirstName"].value,
        "lastName" : form.elements["InputLastName"].value,
        "password" : form.elements["InputPassword"].value,
        "confirmPassword" : form.elements["InputConfirm"].value,
        "agreeToS" : form.elements["agreeToS"].checked
    }

    console.log(registrationDetails)

    form.reset();

    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    //let messageArea = document.querySelector("#userActionMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
        //messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        //messageArea.innerHTML = `<b class="text-success text-center">Registration successful!</b>`
    }

}

window.addEventListener('DOMContentLoaded', event => {
    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }
});
