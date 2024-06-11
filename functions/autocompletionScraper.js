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
const loadCookies = () => {
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

let page, browser;

exports.handler = async (event, context) => {
    return new Promise ((resolve, reject) => {
        try {     
            loadCookies()
            .then(async (cookies) => {
                console.log('Cookies in chained promise')
                browser = await puppeteer.launch({
                    headless: true // Remove graphic interface
                });
                page = await browser.newPage();
                if(browser && page){
                    if(!cookies) {
                        await page.goto('https://www.linguee.fr/');
                        await page.waitForSelector('#accept-choices');
                        await page.click('#accept-choices');
                        await saveCookies(page);
                        console.log('Send to saveCookie function');
                    } else {
                        await page.setCookie(...cookies);
                        await page.goto('https://www.linguee.fr/');   
                        // await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
                        console.log('Cookies loaded from files')
                    };
                };
            })
            .then(async () => {
                await page.waitForSelector('#queryinput');
                await page.focus('#queryinput');
                await page.type('#queryinput', 'dust');
                await page.waitForSelector('.autocompletion_item.sourceIsLang2.isForeignTerm')
                
                try {
                    const data = await page.evaluate(() => {
                        const itemDiv = document.querySelector('.autocompletion_item.sourceIsLang2.isForeignTerm');
                        const textArray = [];

                        if(itemDiv) {
                            const autocompletionDiv = itemDiv.querySelector('.autocompletion');
                            if(autocompletionDiv){
                                const divs = autocompletionDiv.querySelectorAll('div')
                                divs.forEach(div => {
                                    textArray.push(div.textContent.trim())
                                })
                            }
                        }
                        return textArray;
                    })
                    console.log("AHA", data)
                } catch (err) {
                    console.error('An error has occured while converting div into text', err)
                };

                await page.screenshot({path: 'screenshot.png', fullPage:true})
                await browser.close();

                resolve({
                    statusCode: 200,
                    body: JSON.stringify({ message: 'Sending data with success!'})
                });
            })
            .catch((error) => {
                console.error('Error while chaining cookies', error)
            })
    
        } catch (err) {
            console.error('An error occured while running the script', err);
            reject({
                statusCode: 500,
                body: JSON.stringify({ error: err.message})
            })
        }
    });
};
