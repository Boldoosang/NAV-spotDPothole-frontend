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
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4812.0 Mobile Safari/537.36')

  page.on('request', request => {
    requests.push(request.url());
    request.continue();
  });

  await page.goto('https://spotdpoth.web.app/')
  await page.setGeolocation({ latitude: 10.66, longitude: -61.23 });
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

context('End to End Tests', () => {
  //Test 1: Tests that adding a pothole to the map adds a pothole marker to the map
  it('Test 1: Test the addition of potholes to the m ap', async function () {
    this.timeout(config.timeout)

    await page.waitForTimeout(500)

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

    var numMarkers = await page.$$eval('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon', markers => markers.length)

    await page.waitForSelector('#navbar > .list-group > li:nth-child(2) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(2) > a > span')

    await page.waitForSelector('#standard-button')
    await page.click('#standard-button')

    await page.waitForTimeout(500)

    await page.focus('#descriptionText')
    await page.keyboard.type('This is a test report')

    await page.waitForSelector('#submit-passenger-report')
    await page.click('#submit-passenger-report')

    await page.waitForTimeout(500)

    await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
    await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

    await page.waitForTimeout(500)

    var numMarkersAfterAdding = await page.$$eval('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon', markers => markers.length)
    
    assert(numMarkersAfterAdding > numMarkers, 'Number of markers is not greater after adding a report')
  })

  // //Test 2: Tests that editing a pothole description modifies the description that is displayed the potohle offcanvas
  // it('Test 2: Test the editing of a pothole description using the dashboard', async function () {
  //   await page.goto('https://spotdpoth.web.app/')
  //   this.timeout(config.timeout);

  //   await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
  //   await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

  //   await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
  //   await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

  //   await page.waitForTimeout(1000)

  //   await page.waitForSelector('#pills-description-tab')
  //   await page.click('#pills-description-tab')

  //   await page.waitForTimeout(500)

  //   var descriptionTextBefore= await getInnerText('#dashboard-body > #pills-dashboardContent > #pills-descriptionTab > .form-group > .ms-3')

  //   await page.waitForTimeout(500)

  //   await page.waitForSelector('#dashboard-body > #pills-dashboardContent > #pills-descriptionTab > .d-flex > .btn')
  //   await page.click('#dashboard-body > #pills-dashboardContent > #pills-descriptionTab > .d-flex > .btn')

  //   await page.waitForTimeout(500)

  //   await page.click('.text-muted', { clickCount: 3 })
  //   await page.keyboard.type('Test Change Description')

  //   await page.waitForSelector('.collapse > .text-white > .form-group > .d-flex > .btn')
  //   await page.click('.collapse > .text-white > .form-group > .d-flex > .btn')

  //   await page.waitForTimeout(1000)

  //   await page.waitForSelector('#dashboardModal > .modal-dialog > .modal-content > .modal-header > .btn-close')
  //   await page.click('#dashboardModal > .modal-dialog > .modal-content > .modal-header > .btn-close')
    
  //   await page.waitForTimeout(1000)

  //   await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
  //   await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

  //   await page.waitForTimeout(1000)

  //   await page.waitForSelector('#pills-description-tab')
  //   await page.click('#pills-description-tab')

  //   await page.waitForTimeout(500)

  //   var descriptionTextAfter= await getInnerText('#dashboard-body > #pills-dashboardContent > #pills-descriptionTab > .form-group > .ms-3')

  //   assert(descriptionTextBefore != descriptionTextAfter)
  // })

  // // Test 3: Tests that deleting a pothole removes the pothole pin from the map
  // it('Test 3: Test the deletion of potholes from the map', async function () {
  //   this.timeout(config.timeout);

  //   await page.waitForSelector('#navbar > .list-group > li:nth-child(4) > a > span')
  //   await page.click('#navbar > .list-group > li:nth-child(4) > a > span')

  //   await page.waitForTimeout(1000)

  //   var numMarkersBefore = await page.$$eval('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon', markers => markers.length)

  //   await page.waitForSelector('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')
  //   await page.click('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon')

  //   await page.waitForSelector('#pills-delete-tab')
  //   await page.click('#pills-delete-tab')

  //   await page.waitForSelector('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')
  //   await page.click('#dashboard-body > #pills-dashboardContent > #pills-deleteTab > .d-flex > .btn')

  //   await page.waitForSelector('#pills-deleteTab > [id^=deletePotholeReport-] > .text-white > .mt-4 > .btn-danger')
  //   await page.click('#pills-deleteTab > [id^=deletePotholeReport-] > .text-white > .mt-4 > .btn-danger')

  //   await page.waitForTimeout(500)

  //   var numMarkersAfterDeleting = await page.$$eval('#dashboardContent > #dashboardMap > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon', markers => markers.length)

  //   assert(numMarkersAfterDeleting < numMarkersBefore, 'Number of markers is not less after deleting a report')
  // })

  // //Test 4: Tests that upvoting/downvoting a pothole modifies the number of upvotes/downvotes that are displayed in the potohle offcanvas
  // it('Test 4: Test the Upvoting/Downvoting of potholes', async function () {
  //   this.timeout(config.timeout);
    
  //   await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(4)')
  //   await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(4)')
    
  //   await page.waitForTimeout(500)
  //   var voteCount = await getInnerText('.accordion-header > .accordion-button > div > .font-monospace > span')

  //   await page.waitForSelector('div > #reportAccordion > .accordion-item > .accordion-header > .accordion-button')
  //   await page.click('div > #reportAccordion > .accordion-item > .accordion-header > .accordion-button')

  //   await page.waitForSelector('.accordion-body > #votingArea > .my-3 > [id^=castedDownvote-] > .btn')
  //   await page.click('.accordion-body > #votingArea > .my-3 > [id^=castedDownvote-] > .btn')

  //   await page.waitForTimeout(500)
  //   var voteCountAfterDownvote = await getInnerText('.accordion-header > .accordion-button > div > .font-monospace > span')

  //   await page.waitForSelector('#votingArea > .my-3 > [id^=castedUpvote-] > [id^=castedUpvote-] > .bi')
  //   await page.click('#votingArea > .my-3 > [id^=castedUpvote-] > [id^=castedUpvote-] > .bi')

  //   await page.waitForTimeout(500)

  //   var voteCountAfterUpvote = await getInnerText('.accordion-header > .accordion-button > div > .font-monospace > span')

  //   await page.waitForSelector('#votingArea > .my-3 > [id^=castedUpvote-] > [id^=castedUpvote-] > .bi')
  //   await page.click('#votingArea > .my-3 > [id^=castedUpvote-] > [id^=castedUpvote-] > .bi')

  //   await page.waitForTimeout(500)

  //   voteCount = parseInt(voteCount)
  //   voteCountAfterDownvote = parseInt(voteCountAfterDownvote)
  //   voteCountAfterUpvote = parseInt(voteCountAfterUpvote)
    
  //   assert(voteCountAfterUpvote > voteCount , 'Vote count is not greater after upvote')
  //   assert(voteCountAfterDownvote < voteCountAfterUpvote, 'Vote count is not less after downvote')
  // })

  // //Test 5: Tests that changing the username in the profile modal changes the username in the navbar
  // it('Test 5: Test username change', async function () {
  //   this.timeout(config.timeout);
    
  //   await page.waitForSelector('#navbar > .list-group > #profileArea > li > a')
  //   await page.click('#navbar > .list-group > #profileArea > li > a')

  //   var userNameBeforeChange = await getInnerText('#header > .d-flex > .profile > #userNameArea > .text-light')

  //   await page.waitForSelector('.modal-body > #profileAccordion > .accordion-item > #updateProfileName > .accordion-button')
  //   await page.click('.modal-body > #profileAccordion > .accordion-item > #updateProfileName > .accordion-button')

  //   await page.waitForTimeout(500)

  //   await page.waitForSelector('#updateProfile-lastName')
  //   await page.click('#updateProfile-lastName', { clickCount: 3 })
  //   await page.keyboard.type('TesterLastName')

  //   await page.waitForTimeout(500)

  //   await page.waitForSelector('#updateProfile-firstName')
  //   await page.click('#updateProfile-firstName', { clickCount: 3 })
  //   await page.keyboard.type('TesterFirstName')

  //   await page.waitForSelector('#updateProfileButton')
  //   await page.click('#updateProfileButton')

  //   await page.waitForSelector('#profileManagementModal > .modal-dialog > #profileManagementSection > .modal-header > .btn-close')
  //   await page.click('#profileManagementModal > .modal-dialog > #profileManagementSection > .modal-header > .btn-close')

  //   var userNameAfterChange = await getInnerText('#header > .d-flex > .profile > #userNameArea > .text-light')

  //   await page.waitForSelector('.list-group > #profileArea > li > a > span')
  //   await page.click('.list-group > #profileArea > li > a > span')

  //   await page.waitForSelector('#updateProfile-lastName')
  //   await page.click('#updateProfile-lastName', { clickCount: 3 })
  //   await page.keyboard.type('Tester_6')

  //   await page.waitForSelector('#updateProfile-firstName')
  //   await page.click('#updateProfile-firstName', { clickCount: 3 })
  //   await page.keyboard.type('SpotDPothole')

  //   await page.waitForSelector('#updateProfileButton')
  //   await page.click('#updateProfileButton')

  //   await page.waitForTimeout(500)
    
  //   assert(userNameBeforeChange != userNameAfterChange, 'User name is not changed')
  // })

  //Test 6: Tests that changing the password in the profile modal changes the password when logging in.
  it('Test 6: Test Password Change', async function () {
    this.timeout(config.timeout);

    await page.waitForSelector('.list-group > #profileArea > li > a > span')
    await page.click('.list-group > #profileArea > li > a > span')

    await page.waitForSelector('.modal-body > #profileAccordion > .accordion-item > #updatePassword > .accordion-button')
    await page.click('.modal-body > #profileAccordion > .accordion-item > #updatePassword > .accordion-button')

    await page.waitForSelector('#updatePassword-original')
    await page.click('#updatePassword-original', { clickCount: 3 })
    await page.keyboard.type('spotdpotholeTest123')

    await page.waitForSelector('#updatePassword-password')
    await page.click('#updatePassword-password', { clickCount: 3 })
    await page.keyboard.type('spotdpotholeTest123')

    await page.waitForSelector('#updatePassword-confirmPassword')
    await page.click('#updatePassword-confirmPassword', { clickCount: 3 })
    await page.keyboard.type('spotdpotholeTest123')

    await page.waitForSelector('#updatePasswordButton')
    await page.click('#updatePasswordButton')
    
    await page.waitForTimeout(500)

    var confirmation= await getInnerText('.text-white > .form-group > #updatePasswordMessage')

    assert(confirmation == 'Password Updated Successfully!', 'Password is not changed')
  })
})

beforeEach(async function () {
  await page.goto('https://spotdpoth.web.app/')
})

afterEach(async function () {
  requests = []
})

after(async function () {
  await page.close();
  await browser.close();
});

