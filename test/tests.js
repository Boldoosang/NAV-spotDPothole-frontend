const puppeteer = require('puppeteer');
const {expect, asserty, assert} = require('chai');
const config = require('./config.json');
// import fetch from 'node-fetch';
fetch = require('node-fetch');

let browser;
let page;
let requests = [];

before(async function(){
    this.timeout(config.timeout);
    browser = await puppeteer.launch(config);
    [page] = await browser.pages();
  
    await page.emulateMediaType("screen");
    await page.setRequestInterception(true);
  
    page.on('request', request => {
      requests.push(request.url());
      request.continue();
    });
  
    await page.goto('http://127.0.0.1:5500/public/')
  });

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

context('Home Screen Tests', () => {
    it('Test 1: Check That offcanvas opens and closes', async () => {
        await page.waitForTimeout(500)
        await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')
        await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')

        let offcanvas = await getHTML('#offcanvasReport')

        assert(offcanvas.includes('offcanvas offcanvas-end show'), "Offcanvas should be open")

        await page.waitForSelector('#offcanvasReport > .offcanvas-header > .btn-close')
        await page.click('#offcanvasReport > .offcanvas-header > .btn-close')

        offcanvas = await getHTML('#offcanvasReport')

        assert(!offcanvas.includes('offcanvas offcanvas-end show'), "Offcanvas should be closed")
        await page.waitForTimeout(500)
    })

    it('Test 2: Check that The offcanvas contains constituency data', async () => {
        await page.waitForTimeout(500)
        await page.waitForSelector('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')
        await page.click('#mapContent > #map > .leaflet-pane > .leaflet-pane > .leaflet-marker-icon:nth-child(1)')

        let url = requests.find(a => a.includes('https://project-caigual.herokuapp.com/'))

        const response = await fetch(url);
        const body = await response.json();

        let offcanvas = await getHTML('#councillorInformation')

        assert(offcanvas.includes(body[0].name), "Offcanvas should contain the name of the councillor")
        assert(offcanvas.includes(body[0].address), "Offcanvas should contain the address of the councillor")
        assert(offcanvas.includes(body[0].email), "Offcanvas should contain the email address of the councillor")
        assert(offcanvas.includes(body[0].phone), "Offcanvas should contain the phone number of the councillor")
        await page.waitForTimeout(500)
    })

    it('Test 3: Check that the constituency leaderboard displays', async () => {
        await page.waitForTimeout(500)
        await page.waitForSelector('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')
        await page.click('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')

        let leaderboard = await getHTML('#constLeaderboard')
        let result = leaderboard.includes("RANK") && leaderboard.includes("CONSTITUENCY") && leaderboard.includes("NUMBER OF POTHOLES") && leaderboard.includes("CONSTITUENCY LEADER")
        assert(result)
        await page.waitForTimeout(500)
    })

    it('Test 4: Check that the report leaderboard displays', async () => {
        await page.waitForTimeout(500)
        await page.waitForSelector('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')
        await page.click('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')

        await page.waitForSelector('#pills-reportLeaderboard-tab')
        await page.click('#pills-reportLeaderboard-tab')

        let leaderboard = await getHTML('#reportLeaderboard')
        let result = leaderboard.includes("#") && leaderboard.includes("Pothole ID") && leaderboard.includes("Number of Reports") && leaderboard.includes("Constituency")
        assert(result)
        await page.waitForTimeout(500)
    })

    it('Test 5: Check that the councillor information loads when button pressed', async () => {
        await page.waitForTimeout(100)

        await page.waitForSelector('#constLeaderboard > tbody:nth-child(2) > tr > td > .btn')
        await page.click('#constLeaderboard > tbody:nth-child(2) > tr > td > .btn')

        await page.waitForTimeout(100)

        let url = requests.find(a => a.includes('https://project-caigual.herokuapp.com/'))

        const response = await fetch(url);
        const body = await response.json();

        let infoModal = await getHTML('#councillorInfoModal > .modal-dialog > .modal-content > .modal-body') 

        assert(infoModal.includes(body[0].name), "Modal should contain the name of the councillor")
        assert(infoModal.includes(body[0].address), "Modal should contain the address of the councillor")
        assert(infoModal.includes(body[0].email), "Modal should contain the email address of the councillor")
        assert(infoModal.includes(body[0].phone), "Modal should contain the phone number of the councillor")
        await page.waitForTimeout(500)
    })

    it('Test 6: Check that clicking on the pothole ID opens the correct councillor info', async () => {
      await page.waitForTimeout(500)
      await page.waitForSelector('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')
      await page.click('#wrapper > #sidebar-wrapper > .list-group > .list-group-item:nth-child(3)')

      await page.waitForSelector('#pills-reportLeaderboard-tab')
      await page.click('#pills-reportLeaderboard-tab')

      await page.waitForSelector('.card > #reportLeaderboard > tbody:nth-child(2) > tr > .text-primary')
      await page.click('.card > #reportLeaderboard > tbody:nth-child(2) > tr > .text-primary')

      let url = requests.find(a => a.includes('https://spotdpothole.herokuapp.com//api/reports/pothole/'))

      console.log(url)
      
      assert(true)
    })
})

after(async () => {
    await browser.close();
  });