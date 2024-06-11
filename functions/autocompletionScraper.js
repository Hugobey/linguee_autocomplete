// functions/test.js

const puppeteer = require ('puppeteer');
const fs = require('fs');

// Handling cookie management
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
const loadCookies = (page) => {
    return new Promise (async (resolve, reject) => {
        try {
            fs.access('cookie.json', (err) => {
                if (err) {
                    console.error('File does not exist or cannot be accessed');
                    reject(err);
                    return false;
                } else {
                    console.log('File exists and can be accessed');
                    fs.readFile('cookie.json', (err, data) => {
                        if(err) {
                            console.error('File cannot be read', err);
                            reject(err);
                            return false;
                        } else {
                            const cookies = JSON.parse(data)
                            resolve(cookies);
                            return cookies;
                        }
                    });
                };
            });
        } catch (error) {
            console.error('Error while loading cookies', error);
            reject(error);
            return false;
        };
    });
};

exports.handler = async (event, context) => {

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.linguee.fr/');        
        // const cookies = await loadCookies(page);
        // console.log('Are there any cookies?', cookies)
        loadCookies(page)
        .then(async (cookies) => {
            if(cookies) {
                console.log('Cookies in chained promise', cookies)
                if(!cookies) {
                    await page.waitForSelector('#accept-choices');
                    await page.click('#accept-choices');
                    await saveCookies(page);
                    console.log('Send to saveCookie function')
                } else {
                    await page.setCookie(...cookies);
                    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
                    console.log('Cookies loaded from files')
                };
            };
        })

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
