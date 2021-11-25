let username
const SERVER = "https://spotdpothole.herokuapp.com"

async function sendRequest(url, method, data){
    try {
        let access_token = window.localStorage.getItem("access_token");

        let request = {
            "method" : method,
            "headers" : {
                "Authorization" : `Bearer ${access_token}`
            }
        }

        if (data){
            request = {
                "method" : method,
                "headers" : {
                    "Authorization" : `Bearer ${access_token}`,
                    "Content-Type" : "application/json"
                }
            }
            request.body = JSON.stringify(data);
        }


        let response = await fetch(url, request);
        let results = await response.json()

        if("msg" in results){
            if(results["msg"] == "Signature verification failed" || results["msg"] == "Token has expired"){
                window.localStorage.removeItem('access_token');
                console.log("Session has expired!")
                window.location = "/"
                return;
            }
        }

        return results;
    } catch (e){
        console.log(e)
        return {"error" : "An unexpected error has occurred!"};
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
    let messageArea = document.querySelector("#userLoginMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        window.localStorage.setItem("access_token", result["access_token"]);
        messageArea.innerHTML = `<b class="text-success text-center">Login successful!</b>`
        //window.location = "/"
    }
}


async function register(event){
    event.preventDefault();

    let form = event.target;

    console.log(form.elements["agreeToS"])

    let registrationDetails = {
        "email" : form.elements["regInputEmail"].value,
        "firstName" : form.elements["regInputFirstName"].value,
        "lastName" : form.elements["regInputLastName"].value,
        "password" : form.elements["regInputPassword"].value,
        "confirmPassword" : form.elements["regInputConfirm"].value,
        "agreeToS" : form.elements["regAgreeToS"].checked
    }

    console.log(registrationDetails)

    form.reset();

    let result = await sendRequest(SERVER + "/register", "POST", registrationDetails);
    let messageArea = document.querySelector("#userRegisterMessage")

    if("error" in result || "msg" in result){
        console.log("Error")
        messageArea.innerHTML = `<b class="text-danger text-center">${result["error"]}</b>`
    } else {
        console.log("Success")
        messageArea.innerHTML = `<b class="text-success text-center">Registration successful!</b>`
    }

}

window.addEventListener('DOMContentLoaded', event => {

    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
            document.body.classList.toggle('sb-sidenav-toggled');
        }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});


async function loadReports(potholeID){
    potholeID = 87
    let potholeReports = await sendRequest(SERVER + "/api/reports/pothole/" + potholeID, "GET")
    let allReportsContainer = document.querySelector("#reportAccordion")

    let allReportsAccordions = ""
    
    try {
        potholeReports = potholeReports.sort((a, b) => {
            if (a.potholeID < b.potholeID)
                return 1;                
            else
                return -1;
        })

        for(report of potholeReports){
            console.log(report)
            allReportsAccordions += 
            `<div class="accordion-item">
                <h2 class="accordion-header" id="headingOne">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                    ReportID: ${report.reportID} reported by <Insert Name of Reporter>
                </button>
                </h2>
                <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                    <div class="accordion-body">
                        <strong>This is the first item's accordion body.</strong> It is shown by default, until the collapse plugin adds the appropriate classes that we use to style each element. These classes control the overall appearance, as well as the showing and hiding via CSS transitions. You can modify any of this with custom CSS or overriding our default variables. It's also worth noting that just about any HTML can go within the <code>.accordion-body</code>, though the transition does limit overflow.
                    </div>
                </div>
            </div>`
        }
    } catch(e){
        allReportsAccordions = `<p>No reports for this pothole!</p>`
    }

    allReportsContainer.innerHTML = allReportsAccordions
}

loadReports(1)

