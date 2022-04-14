const puppeteer = require('puppeteer');
const devices = puppeteer.devices;

const { expect, asserty, assert } = require('chai');
const config = require('./config.json');
// import fetch from 'node-fetch';
fetch = require('node-fetch');

let browser;
let page;
let requests = [];

before(async function () {
  this.timeout(config.timeout);
  browser = await puppeteer.launch(config);
  const context = browser.defaultBrowserContext();

  context.clearPermissionOverrides();
  context.overridePermissions('https://spotdpoth.web.app/', ['geolocation']);

  [page] = await browser.pages();

  await page.setRequestInterception(true);
  await page.setCacheEnabled(false);
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36')

  page.on('request', request => {
    requests.push(request.url());
    request.continue();
  });

  browser.on('targetcreated', async (target) => {
    const client = await target.createCDPSession()
    await client.send('Network.enable')
    client.on('Network.requestWillBeSent', params => {
      requests.push(params.request.url)
    })
  })

  await page.goto('https://spotdpoth.web.app/')
  await page.setGeolocation({ latitude: 10.69, longitude: -61.23 });
});

function getHTML(selector) {
  return page.evaluate(selector => {
    try {
      return document.querySelector(selector).outerHTML;
    } catch (e) {
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

context('Integration Testing', () => {
  //Assertion Test 1: This test checks if the login button generates the correct request when pressed
  it('Test 1: Test that the login button generates the correct request', async function () {
    this.timeout(config.timeout)

    await page.waitForSelector('.list-group > #userContextGroup > li > a')
    await page.click('.list-group > #userContextGroup > li > a > span')

    await page.waitForTimeout(500)

    await page.focus('#InputEmail')
    await page.keyboard.type('spotdpothole-tester6@justinbaldeo.com')

    await page.focus('#InputPassword')
    await page.keyboard.type('spotdpotholeTest123')

    await page.waitForSelector('#loginButton')
    await page.click('#loginButton')

    await page.waitForTimeout(500)

    assert(requests.includes('https://spotdpothole.herokuapp.com/login'), "Request should contain the correct URL")
  })

  //Test 2: Create a driver report and test that it generates the appropriate request
  it('Test 2: Test Driver Report', async function () {
    this.timeout(config.timeout);
    
    await page.waitForSelector('#navbar > .list-group > li:nth-child(2) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(2) > a > span')

    await page.waitForTimeout(200)

    await page.waitForSelector('#driver-button')
    await page.click('#driver-button')

    await page.waitForTimeout(200)

    await page.waitForSelector('#submit-driver-prereport')
    await page.click('#submit-driver-prereport')

    await page.waitForTimeout(200)

    await page.waitForSelector('#submit-driver-report')
    await page.click('#submit-driver-report')

    await page.waitForTimeout(5500)

    assert(requests.includes("https://spotdpothole.herokuapp.com/api/reports/driver"), "A request to the driver report endpoint should have been made")
  })

    //Assertion Test 3: This test checks that the offcanvas opens and closes when the relevant elements are clicked
    it('Test 3: Check That offcanvas opens and closes', async function () {
      this.timeout(config.timeout);
  
      await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')
      await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')

      await page.waitForTimeout(200)
  
      let offcanvas = await getHTML('#offcanvasReport')
      assert(offcanvas.includes('offcanvas offcanvas-end show'), "Offcanvas should be open")
  
      await page.waitForTimeout(500)
  
      await page.waitForSelector('#offcanvasReport > .offcanvas-header > .btn-close')
      await page.click('#offcanvasReport > .offcanvas-header > .btn-close')
  
      offcanvas = await getHTML('#offcanvasReport')

      await page.waitForTimeout(500)
  
      assert(!offcanvas.includes('offcanvas offcanvas-end show'), "Offcanvas should be closed")
    })
  
    // //Assertion Test 4: Checks that the offcanvas displays the correct data.
    it('Test 4: Check that The offcanvas contains constituency data', async function () {
      this.timeout(config.timeout);
  
      await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')
      await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')
  
      await page.waitForTimeout(500)
  
      let url = requests.slice().reverse().find(a => a.includes('https://project-caigual.herokuapp.com/'))
  
      const response = await fetch(url);
      const body = await response.json();

      await page.waitForTimeout(200)
  
      let offcanvas = await getHTML('#councillorInformation')

      await page.waitForTimeout(200)
  
      assert(offcanvas.includes(body[0].name), "Offcanvas should contain the name of the councillor")
      assert(offcanvas.includes(body[0].address), "Offcanvas should contain the address of the councillor")
      assert(offcanvas.includes(body[0].email), "Offcanvas should contain the email address of the councillor")
      assert(offcanvas.includes(body[0].phone), "Offcanvas should contain the phone number of the councillor")

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#offcanvasReport > .offcanvas-header > .btn-close')
      await page.click('#offcanvasReport > .offcanvas-header > .btn-close')
    })
  
    //Assertion Test 5: Checks that the constituency leaderboard displays
    it('Test 5: Check that the constituency leaderboard displays', async function () {
      this.timeout(config.timeout);

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#navbar > .list-group > li:nth-child(5) > a > span')
      await page.click('#navbar > .list-group > li:nth-child(5) > a > span')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#pills-constLeaderboard-tab')
      await page.click('#pills-constLeaderboard-tab')
  
      await page.waitForTimeout(1000)
  
      let leaderboard = await getHTML('#constLeaderboard')
      let result = leaderboard.includes("RANK") && leaderboard.includes("CONSTITUENCY") && leaderboard.includes("NUMBER OF POTHOLES") && leaderboard.includes("CONSTITUENCY LEADER")
      assert(result)
    })
  
    // //Assertion Test 6: Checks that the report leaderboard displays
    it('Test 6: Check that the report leaderboard displays', async function () {
      this.timeout(config.timeout);

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#navbar > .list-group > li:nth-child(5) > a > span')
      await page.click('#navbar > .list-group > li:nth-child(5) > a > span')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('.d-flex > #navbar > .list-group > li:nth-child(5) > a')
      await page.click('.d-flex > #navbar > .list-group > li:nth-child(5) > a')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#pills-reportLeaderboard-tab')
      await page.click('#pills-reportLeaderboard-tab')
  
      await page.waitForTimeout(1000)
  
      let leaderboard = await getHTML('#reportLeaderboard')
      assert(leaderboard.includes("POTHOLE ID"), "leaderboard should display an ID")
      assert(leaderboard.includes("NUMBER OF REPORTS"), "leaderboard should display a number of reports")
      assert(leaderboard.includes("CONSTITUENCY"), "leaderboard should display a constituency")
    })
  
    //Assertion Test 7: Checks that the councillor information modal loads when the relevant data is pressed
    it('Test 7: Check that the councillor information loads when button pressed', async function () {
      this.timeout(config.timeout);
  
      await page.waitForSelector('#navbar > .list-group > li:nth-child(5) > a > span')
      await page.click('#navbar > .list-group > li:nth-child(5) > a > span')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#pills-constLeaderboard-tab')
      await page.click('#pills-constLeaderboard-tab')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#constLeaderboard > tbody > #fstPlaceRow > td > .btn')
      await page.click('#constLeaderboard > tbody > #fstPlaceRow > td > .btn')
  
      await page.waitForTimeout(2000)
  
      let url = requests.slice().reverse().find(a => a.includes('https://project-caigual.herokuapp.com/'))
  
      const response = await fetch(url);
  
      const body = await response.json();
  
      let infoModal = await getHTML('#councillorInfoModal > .modal-dialog > .modal-content > .modal-body')

      await page.waitForTimeout(200)
  
      assert(infoModal.includes(body[0].name), "Modal should contain the name of the councillor")
      assert(infoModal.includes(body[0].address), "Modal should contain the address of the councillor")
      assert(infoModal.includes(body[0].email), "Modal should contain the email address of the councillor")
      assert(infoModal.includes(body[0].phone), "Modal should contain the phone number of the councillor")
    })
  
    //Assertion Test 8: Checks that clicking on the pothole ID opens the correct councillor info in the offcanvas
    it('Test 8: Check that clicking on the pothole ID opens the correct councillor info', async function () {
      this.timeout(config.timeout);
  
      await page.waitForSelector('#navbar > .list-group > li:nth-child(5) > a > span')
      await page.click('#navbar > .list-group > li:nth-child(5) > a > span')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('#pills-reportLeaderboard-tab')
      await page.click('#pills-reportLeaderboard-tab')

      await page.waitForTimeout(200)
  
      await page.waitForSelector('.card > #reportLeaderboard > tbody > #fstPlaceRow > .text-dark')
      await page.click('.card > #reportLeaderboard > tbody > #fstPlaceRow > .text-dark')
  
      let url = requests.slice().reverse().find(a => a.includes('https://project-caigual.herokuapp.com/'))
  
      const response = await fetch(url);
      const body = await response.json();
  
      let offcanvas = await getHTML('#offcanvasReport')
  
      assert(offcanvas.includes(body[0].name), "Offcanvas should contain the name of the councillor")
      assert(offcanvas.includes(body[0].address), "Offcanvas should contain the address of the councillor")
      assert(offcanvas.includes(body[0].email), "Offcanvas should contain the email address of the councillor")
      assert(offcanvas.includes(body[0].phone), "Offcanvas should contain the phone number of the councillor")
  
      await page.waitForSelector('#offcanvasReport > .offcanvas-header > .btn-close')
      await page.click('#offcanvasReport > .offcanvas-header > .btn-close')
    })

  //Test 9: Check that the dashboard modal contains the correct elements
  it('Test 9: Test that the dashboard modal displays correctly', async function () {
    this.timeout(config.timeout);

    await page.waitForTimeout(200)

    await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

    await page.waitForTimeout(500)

    await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
    await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

    await page.waitForTimeout(2000)

    let potholeModal = await getHTML('.d-flex > #dashboardModal > .modal-dialog > .modal-content')

    assert(potholeModal.includes("Your Report"), "Modal should contain the text 'Your Report'")
    assert(potholeModal.includes("Images"), "Modal should contain the text 'Images'")
    assert(potholeModal.includes("Description"), "Modal should contain the text 'Description'")
    assert(potholeModal.includes("Delete"), "Modal should contain the text 'Delete'")
  })

  //Test 10: Check that deleting a driver report generates the correct request
  it('Test 10: Test Delete Driver Report', async function(){
    await page.goto('https://spotdpoth.web.app/')
    this.timeout(config.timeout);

    await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

    await page.waitForTimeout(500)

    await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
    await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

    await page.waitForTimeout(200)

    await page.waitForSelector('#pills-delete-tab')
    await page.click('#pills-delete-tab')

    await page.waitForTimeout(200)

    await page.waitForSelector('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')
    await page.click('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')

    await page.waitForTimeout(200)

    await page.waitForSelector('#pills-deleteTab > .mt-4 > .text-white >.mt-4 > .btn-danger')
    await page.click('#pills-deleteTab > .mt-4 > .text-white >.mt-4 > .btn-danger')

    await page.waitForTimeout(500)
    
    assert(requests.includes("https://spotdpothole.herokuapp.com/api/potholes"), "A request to the pothole endpoint should have been made")
  })

  //Test 11: Check that generating a standard report generates the correct request
  it('Test 11: Test Standard Report', async function () {
    this.timeout(config.timeout);

    await page.waitForSelector('#navbar > .list-group > li:nth-child(2) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(2) > a > span')

    await page.waitForSelector('#standard-button')
    await page.click('#standard-button')

    await page.waitForTimeout(1000)

    await page.focus('#descriptionText')
    await page.keyboard.type('This is a test report')

    await page.waitForSelector('#submit-passenger-report')
    await page.click('#submit-passenger-report')

    await page.waitForTimeout(5500)

    assert(requests.includes("https://spotdpothole.herokuapp.com/api/reports/standard"), "A request to the standard report endpoint should have been made")
  })

  //Test 12: Check that deleting a standard report generates the correct request
  it('Test 12: Test Delete Standard Report', async function(){
    await page.goto('https://spotdpoth.web.app/')
    this.timeout(config.timeout);

    await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

    await page.waitForTimeout(500)

    await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
    await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

    await page.waitForSelector('#pills-delete-tab')
    await page.click('#pills-delete-tab')

    await page.waitForSelector('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')
    await page.click('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')

    await page.waitForSelector('#pills-deleteTab > .mt-4 > .text-white >.mt-4 > .btn-danger')
    await page.click('#pills-deleteTab > .mt-4 > .text-white >.mt-4 > .btn-danger')

    await page.waitForTimeout(500)

    assert(requests.includes("https://spotdpothole.herokuapp.com/api/potholes"), "A request to the pothole endpoint should have been made")
  })
})

beforeEach(async function () {
  await page.goto('https://spotdpoth.web.app/')
  await page.setViewport({ width: 1920, height: 937 })
})

afterEach(async function () {
  requests = []
})

after(async function () {
  await page.close();
  await browser.close();
});

