const puppeteer = require ('puppeteer');
const fs = require('fs');

// COOKIES
const saveCookies = async (page) => {
    const cookies = await page.cookies();
        fs.writeFile('cookie.json', JSON.stringify(cookies, null, 2), (err) => {
            if (err) {
              console.error('Error saving cookies:', err);
            } else {
              console.log('Cookies saved successfully.');
            } 
    });
};
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

// FETCH DIV
const fetchDataFromDivs= async (page) => {
    return page.evaluate(() => {
        const autoCompletionDiv = document.querySelector('.autocompletion');

        if(autoCompletionDiv){
            const itemDivs = autoCompletionDiv.querySelectorAll('.autocompletion_item');
            totalDivs = itemDivs
            return Array.from(itemDivs).map(itemDiv => {

                if (itemDiv) {
                    const mainRowDiv = itemDiv.querySelector('.main_row');
                    let mainWord = null;
                    let wordTypes = [];
        
                    if (mainRowDiv) {
                        const mainItemDiv = mainRowDiv.querySelector('.main_item');
                        mainWord = mainItemDiv ? mainItemDiv.innerText.trim() : null;
        
                        const wordTypeDivs = mainRowDiv.querySelectorAll('.main_wordtype');
                        wordTypes = Array.from(wordTypeDivs).map(div => div.innerText.trim());
                    };
        
                    const translationRows = itemDiv.querySelectorAll('.translation_row.line.singleline');
                    const translationTexts = Array.from(translationRows).map(row => row.innerText.trim());
        
                    return {
                        mainRow: {
                            mainWord,
                            wordTypes
                        },
                        translations: translationTexts
                    };
                };
            })
        }
        return []
    });
};

const mainFunction = (query) => {
    return new Promise ((resolve, reject) => {
        try {     
            loadCookies()
            .then(async (cookies) => {
                console.log('Cookies in chained promise')
                browser = await puppeteer.launch({
                    headless: true // Remove graphic interface
                });
                page = await browser.newPage();

                if(browser && page){  // load the page et browser before the cookies
                    if(!cookies) {
                        await page.goto('https://www.linguee.fr/');
                        await page.waitForSelector('#accept-choices');
                        await page.click('#accept-choices');
                        await saveCookies(page);
                        console.log('Send to saveCookie function');
                    } else {
                        await page.setCookie(...cookies);
                        await page.goto('https://www.linguee.fr/');   
                        console.log('Cookies loaded from files')
                    };
                };
            })
            .then(async () => {
                await page.waitForSelector('#queryinput');
                await page.focus('#queryinput');
                await page.type('#queryinput', `${query}`);
                await page.waitForSelector('.autocompletion_item')
                
                try {
                    const translationData = await fetchDataFromDivs(page);
                    console.log('Fetched translation data:', translationData);
                    resolve(translationData);
                    // await page.screenshot({path: 'screenshot.png', fullPage:true})
                    await browser.close();

                } catch (err) {
                    console.error('An error has occured while converting div into text', err)
                    reject (err);
                };
            })
            .catch((error) => {
                console.error('Error while chaining cookies', error)
                reject(error);
            })
    
        } catch (err) {
            console.error('An error occured while running the script', err);
            reject({
                statusCode: 500,
                body: JSON.stringify({ error: err.message})
            })
        }
    });
}

let page, browser;

exports.handler = async (event, context) => {
    
    try {
        const query = event.queryStringParameters.query;
        if(!query) {
            return {
                statusCode: 400, 
                body: JSON.stringify({error: 'Query parameter required!'})
            };
        };
        mainFunction(query);
        return {
            statusCode: 200,
            body: JSON.stringify(`Success! Autocompletion query param: ${query}`)
        };

    } catch(err) {
        console.error('Error occured', err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: 'Internal Server Error' })
        };
    };
};
