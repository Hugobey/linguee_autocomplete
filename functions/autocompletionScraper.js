// functions/test.js

const puppeteer = require ('puppeteer');
const fs = require('fs');

exports.handler = async (event, context) => {

    // Functions handling cookie management
    const saveCookies = async (page) => {
        try {
            // const cookies = await page.cookies();
            fs.writeFile('cookie.json', JSON.stringify(await page.cookies(), null, 2))
            return true
        } catch (error) {
            console.error('Error saving cookies');
        }
    };
    const loadCookies = async (page) => {
        try {
            if(fs.existsSync('cookie.json')){
                const cookies = JSON.parse(fs.readFile('cookie.json'));
                await page.saveCookies(...cookies)
            } else {
                return false
            }
        } catch (error) {
            console.error('Error while loading cookies', error)
        };
    };

    // Puppeteer scraping
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('https://www.linguee.fr/');

        const areThereCookies = await loadCookies(page);
        console.log('Cookies', areThereCookies)

        if(!areThereCookies) {
            await page.waitForSelector('#accept-choices');
            await saveCookies(page);
            console.log('Saving cookies...')
        } else {
            await loadCookies(page);
            console.log('Loading cookies...')
        };
    
        await page.click('#accept-choices');
        await page.waitForSelector('#queryinput');
        await page.focus('#queryinput');
        await page.type('#queryinput', 'dust');

        await page.waitForSelector('.autocompletion_item.sourceIsLang2.isForeignTerm')

        await page.screenshot({path: 'screenshot.png', fullPage:true})

        await browser.close();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Sending data with success!'})
        };
    } catch (err) {
        console.error('An error occured while running the script', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message})
        };
    }
};
