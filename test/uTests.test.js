/** 
    * @jest-environment jsdom
    */


/*const puppeteer = require('puppeteer');
const {expect, assert } = require('chai');
const config = require('./config.json');
const host = 'https://spotdpothole.web.app/';

let browser;
let page;
let requests = [];

let loginDetails = {
            "email" : "tester3@yahoo.com",
            "password" : "121233"
        }

beforeEach(async function() {
    browser = await puppeteer.launch(config);
    [page] = await browser.pages();
    await page.setRequestInterception(true);
    page.on('request', request => {
        requests.push(request.url());
        request.continue();
    });
    await page.goto(host);
});

async function LoginUser(email, password){
    await page.waitForSelector('#wrapper > #sidebar-wrapper > .position-absolute > #userContextGroup > .list-group-item')
    await page.click('#wrapper > #sidebar-wrapper > .position-absolute > #userContextGroup > .list-group-item')

    await page.waitForTimeout(500)

    await page.focus('#InputEmail')
    await page.keyboard.type(email)

    await page.focus('#InputPassword')
    await page.keyboard.type(password)

    await page.waitForSelector('#loginButton')
    await page.click('#loginButton')
}

context('Method Testing',()=>{
    it('Test 1: sendRequest function returns a json response', async function(){
        let result;
        result = await page.evaluate(() => {
            return sendRequest(SERVER + "/login", "POST", loginDetails);
        })
        assert(result.includes(JSON),"JSON object not returned")
    })


    it('Test 2: login function works is successful', async function(){
        LoginUser(loginDetails.email, loginDetails.password);
        accessToken1 = await page.evaluate(() => {
            return localStorage.getItem("access_token");
        })
        assert(accessToken1,"should return an access token")
    })


    it('Test 3: logout function removes access token', async function(){
        LoginUser(loginDetails.email, loginDetails.password);
        var accessToken1;

        await page.evaluate(() => {
            logout();
        })
        accessToken1 = await page.evaluate(() => {
            return localStorage.getItem("access_token");
        })
        assert(!accessToken1,"should not return an access token")
    })


    it('Test 4: identifyUser successfully returns a user', async function(){
        let user = await page.evaluate(() => {
            return identifyUser();
        })
        assert(!user.includes({"error" : "User is not logged in or session has expired!"}), "should return a user") 
    })


    it('Test 5: register function successfully registers a user', async function(){
        
    })
})

after(async function(){
    await browser.close();
  }); */
const fetch = require('jest-fetch-mock');
const {getCouncillorData, getReports, sendRequest, logout, login} = require('./../public/index.js');
const { DRIVER_REPORT_URL } = require('../public/constants.js');

test('Test Get Councillor Data', async () => {
    //console.log(await getCouncillorData(2020,''));
    let result = await getCouncillorData(2020,'');
    console.log(result);
});

test ('Test sendRequest with get' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testGet', 'GET')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

test ('Test sendRequest with POST' , async () => {
    let result = await sendRequest('https://spotdpothole3613.free.beeceptor.com/testPost', 'POST')

    expect(result).toStrictEqual({
        "status": "Awesome!"
      })
})

test ('Test logout' , async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem')

    logout()

    expect(getItem).toHaveBeenCalled()
})

test('Function getReports produces report data on a pothole', async () => {
    console.log(await getReports(1));
    expect(getReports(1).toBeNull);
});

test('Function login sucessfully returns a token', async () =>{
    //const setItem = jest.spyOn(Storage.prototype, 'setItem')

    //login();

    //expect(setItem).toHaveBeenCalled()
});
