// functions/test.js

const puppeteer = require ('puppeteer');
const fs = require('fs');

// Functions handling cookie management
const saveCookies = async (page) => {
    const cookies = await page.cookies();
        fs.writeFile('cookie.json', JSON.stringify(cookies, null, 2), (err) => {
            if (err) {
              console.error('Error saving cookies:', err);
            } else {
              console.log('Cookies saved successfully.');
            } 
    });
}
const loadCookies = async (page) => {
    try {
        fs.access('cookie.json', (err) => {
            if (err) {
                console.error('File does not exist or cannot be accessed');
                return false;
            } else {
                console.log('File exists and can be accessed');
                fs.readFile('cookie.json', (err, data) => {
                    if(err) {
                        console.error('File cannot be read', err);
                        return false;
                    } else {
                        const cookies = JSON.parse(data)
                        console.log('Cookies loaded successfully', cookies);
                        return cookies;
                    }
                });
            };
        });
    } catch (error) {
        console.error('Error while loading cookies', error);
        return false;
    };
};

exports.handler = async (event, context) => {
    
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const cookies = await loadCookies(page);
        console.log('Are there any cookies?', cookies)

        await page.goto('https://www.linguee.fr/');

        // NEEDS TO CHAIN THE EXECUTION OF LOADCOOKIES BEFORE THE SAVEDCOOKIES IS EXECUTED
        cookies
        .then((cookies) => {
            if(cookies) {

            }
        })
        if(!cookies) {
            await page.waitForSelector('#accept-choices');
            await saveCookies(page);
        } else {
            await page.setCookie(...cookies);
        }
    
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
