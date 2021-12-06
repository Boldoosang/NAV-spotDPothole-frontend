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

const login = require('./../public/index.js');

test('adds 1 + 2 to equal 3', () => {
  expect(login(1, 2)).toBe(3);
});
