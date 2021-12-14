/* Install npm install puppeteer mocha chai --save-dev
           puppeteer: browser automation tool (used for chronium browsers)
           mocha: Test runner & reporter
           chai: Testing library ( providdes keywords like assert & expect to check variables)  
  To run test call "mocha" 
*/

const puppeteer = require('puppeteer');
const {expect, assert } = require('chai');

/* Constants */
const config = require('./config.json');
const host = 'https://spotdpothole.web.app/';
const frontendURL = "https://spotdpothole.justinbaldeo.com"

/* Global Variables */
let browser;
let page;
let requests = [];
let responses = [];
const iPhone = puppeteer.devices['iPhone 6'];

//Tells mocha to run this before doing the test
beforeEach(async function () {

    browser = await puppeteer.launch(config);
    //page = await browser.newPage();
    [page] = await browser.pages()

    
    setPageListeners()
    
    
    await page.goto( frontendURL, { waitUntil: 'networkidle0'});
    
    
  });


  async function setPageListeners(){
    const context = browser.defaultBrowserContext();
    //context.clearPermissionOverrides();
    context.overridePermissions( frontendURL, ['geolocation']);


    await page.setGeolocation({latitude: 10.8, longitude: -61.8});

    await page.emulateMediaType("screen");  
    //await page.emulate(iPhone);
    
    
    
    await page.setRequestInterception(true);

    page.on('request', request => {
      //let value = {"url": request.url(), "response": JSON.stringify(request.response()) }
      requests.push( request.url() );
      request.continue();
    });

    //page.on('console', (msg) => console.log('PAGE LOG:', JSON.stringify(msg) ));

    /*page.on("response", response =>{
      
      responses.push( {"body": response.url()  , "status": response.status()}  )
      
    })  */
  }


  function getHTML(selector){
    return page.evaluate(selector=>{
      try{
        return document.querySelector(selector).outerHTML;
      }catch(e){
        return null;
      }
    }, selector);
  }
  
  function getInnerText(a) {
    return page.evaluate(a => document.querySelector(a).innerText, a)
  }
  
  function checkElements(a) {
    for (let [b, c] of Object.entries(a)) it(`Should have ${b}`, async () => {
        expect(await page.$(c)).to.be.ok
    })
  }

  async function LoginUser(username, password){
    await page.waitForSelector('#wrapper > #sidebar-wrapper > .position-absolute > #userContextGroup > .list-group-item')
      await page.click('#wrapper > #sidebar-wrapper > .position-absolute > #userContextGroup > .list-group-item')

      await page.waitForTimeout(500)

      await page.focus('#InputEmail')
      await page.keyboard.type(username)

      await page.focus('#InputPassword')
      await page.keyboard.type(password)

      await page.waitForSelector('#loginButton')
      await page.click('#loginButton')

  }



  async function addInputToField(selector, input, page){
    await page.evaluate( (htmlElement, page) => {
      /*Remove required field from text input */
      document.querySelector(htmlElement).removeAttribute('required');
      document.querySelector(htmlElement).click()//.select();
      
    }, selector, page);
    if( input)
    await page.keyboard.type(input)

  }


context("The frontend test suite", async ()=>{

  describe("Login Test", ()=>{
    it("Test 1: Check to see if login was successful", async( )=>{

      //let loginButtonWrapper = await getHTML('div#userContextGroup')
      //console.log(loginButtonWrapper)
      
      
      var accessToken1;
      
      accessToken1 = await page.evaluate(() => {
            return localStorage.getItem("access_token");
          });
            
      await LoginUser( 'tester3@yahoo.com' ,'121233');
      
      await page.waitForTimeout(3000)

      var accessTokenObj = await page.evaluate(() => {
          return localStorage.getItem("access_token");
        });
      
      console.log(`Access token before: ${accessToken1} \n vs after ${accessTokenObj}`)
      return assert.notEqual( accessTokenObj, accessToken1, "No access token detected. Login Unsuccessful")
      
    })//end of login

  

  });


  
  describe('Leaderboard Page Test', async ()=>{

    it('Test 2: Constituency Leaderboard Populated', async ()=>{

      //check count of table
      const rowCountBefore = await page.$$eval('#constLeaderboard > tbody ', (row) => row.length);
      
      //Open side bar & click leaderboard
      await page.click('#sidebarToggle')
      page.waitForTimeout(1000)
      await page.waitForSelector('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')
      await page.click('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')
      
      page.waitForTimeout(4000)
      //wait for Tab Selector of constitency Leaderboard to show
      const rowCountAfter = await page.$$eval('#constLeaderboard > tbody ', (row) => row.length)
       

      
       console.log(`Row Count Before: ${rowCountBefore} vs Row Count After: ${rowCountAfter}\t\t`)
       //expect(rowCountBefore < rowCountAfter)
       return assert( rowCountBefore < rowCountAfter , "detected no rows added to table")
    } );


    it("Test 3: Report Leaderboard Populated", async()=>{

      //check count of table
      const rowCountBefore = await page.$$eval('#reportLeaderboard > tbody ', (rows) => rows.length);
      
      
      
      //Click report leaderboard Tab
      //await page.click('button[id="pills-reportLeaderboard-tab"]')
      const button = await page.$('button[id="pills-reportLeaderboard-tab"]' );  //get's html element
      await button.evaluate( b => b.click() )   //trigger html element click via javascript

      const rowCountAfter =  await page.$$eval('#reportLeaderboard > tbody ', (rows) => rows.length)
       

      
       console.log(`Row Count Before: ${rowCountBefore} vs Row Count After: ${rowCountAfter}\t\t`)
       //expect(rowCountBefore < rowCountAfter)
       return assert( rowCountBefore < rowCountAfter , "Report Leaderboard Table was not populated")
    });
    
  })// end of Leaderboard Test
  

  describe("Report Page Test", ()=>{
    
    it("Test 4: Submit Driver Report", async()=>{
        await LoginUser( 'tester3@yahoo.com' ,'121233');
        [page] = await browser.pages()

        //await setPageListeners()

        await page.waitForTimeout(1000)

        //Open side bar & click "Leaderboard" in side bar
        //await page.click('#sidebarToggle')

        //await page.mainFrame().tap('a[data-bs-target="#mainTab-report"]')
        await page.click('#wrapper > #sidebar-wrapper > .list-group > a[data-bs-target="#mainTab-report"]')
        
        
        await page.click('#sidebarToggle')

        await page.waitForTimeout(1000)
        //select driver option
        let driverButton = "#mainTab-report > #reportContent > #driver-button"
        //wait for Report Tab to be Display & click driver Button
        
        await page.click(driverButton)
        

        await page.waitForTimeout(500)

        let modalBody = "#driverReportModal > .modal-dialog > .modal-content > .modal-body > #driverSubmitReport > .accordion-item"
        let submitButton = modalBody + " > #submit-driver-prereport"
        let confirmButton = modalBody + " > #flush-collapseOne > #submit-driver-report"
        
        await page.click(submitButton)
        await page.waitForTimeout(500)
        await page.click(confirmButton)
        
        //await page.waitForTimeout(2500)
        let responseStat, requestUrl;
        [responseStat, requestUrl] = await page.waitForResponse(response => {  return  response.status()}  ).then( (status)=>{ console.log(status["_status"]); return [status["_status"], status["_url"]] } )
          
        //console.log("Request Response:" + responseStat)
        assert( requestUrl == "https://spotdpothole.herokuapp.com//api/reports/driver" , "Request to Send Co ordinates present" )
        
        let message = ".message"
        //assert().deepEqual( {"msg":"Not enough segments"}, JSON.stringify(requests["response"]) , "Cant submit without login")
        //await page.waitForTimeout(10000)
        
        //let displayMessage = await getInnerText(message)
        //console.log(`\n\nReturn Messae ${ JSON.stringify(displayMessage)}`)
        //console.log( JSON.stringify(responses))
        let errormessage = "Unfortunately we couldn't find your coordinates!"
        let successMessage = "Successfully added pothole report to database!"
        return assert( responseStat==201 || responseStat==200 , "Driver Report failed!")
        
    })
  

    it("Test 5: Submit Passenger Report ", async()=>{
      await LoginUser( 'tester3@yahoo.com' ,'121233');
        [page] = await browser.pages()
        //await setPageListeners()
        await page.waitForTimeout(1000)

        await page.waitForSelector('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(2)')
        await page.click('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(2)')

        await page.waitForTimeout(500)

        await page.waitForSelector('#mainTab-report > #reportContent > #standard-button')
        await page.click('#mainTab-report > #reportContent > #standard-button')

        let modal = "#standardReportModal > .modal-dialog > .modal-content"
        let descriptionInput = modal + " > .modal-body > #standardReport > #description > #descriptionText";
        
        await page.waitForTimeout(500)

        await page.waitForSelector(descriptionInput)
        await page.click(descriptionInput)

        await page.focus('#InputPassword')
        await page.keyboard.type('New Pothole from e2e test ')

        let button = modal + " > .modal-footer > #submit-passenger-report"
        await page.waitForSelector(button)
        await page.click(button)

        let responseStat;
        responseStat = await page.waitForResponse(response => {  return  response.status()}  ).then( (status)=>{return status["_status"]} )
          
        //console.log("Request Response:" + responseStat)
        return assert( responseStat==201 || responseStat==200 , "Passenger Report failed!")
    })

});


describe("Home Page Test", ()=>{

  it("Check pothole info displays on click of pin", async ()=>{


    await page.waitForSelector('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(1)')
    await page.click('body > #wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(1)')

    await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(7)')
    await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(7)')

    await page.waitForSelector('div > #reportAccordion > .accordion-item > #heading-77 > .accordion-button')
    await page.click('div > #reportAccordion > .accordion-item > #heading-77 > .accordion-button')

    await page.waitForSelector('strong > .table > tbody > tr:nth-child(1) > td')
    //await page.click('strong > .table > tbody > tr:nth-child(1) > td')

    let reporter = await getHTML('strong > .table > tbody > tr:nth-child(1) > td')
    console.log(`The reportee's name: ${reporter}`)
    return assert( reporter != '', "No information found for pothole report")
  })
})


});

  //To be Executed after test
  afterEach(async function (){
    await browser.close();
  });
