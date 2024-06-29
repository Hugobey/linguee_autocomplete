// const puppeteer = require('puppeteer')
import chromium from '@sparticuz/chromium';
// import chromium from 'chromium';
import puppeteer from 'puppeteer-core';
// const { headless } = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const https = require('https')


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
    const cookiesFilePath = path.join(process.cwd(),'functions/data/cookies/cookie.json') 
    console.log('Cookie path', cookiesFilePath);
    return new Promise ((resolve, reject) => {
        try {
            fs.access(cookiesFilePath, fs.constants.R_OK, (err) => {
                if (err) {
                    console.error('File does not exist or cannot be accessed', err);
                    reject(err);
                } else {
                    fs.readFile(cookiesFilePath, async (err, data) => {
                        if(err) {
                            console.error('File cannot be read', err);
                            reject(err);
                        } else {
                            const cookies = JSON.parse(data)
                            resolve(cookies);
                        }
                    });
                };
            });
        } catch (error) {
            console.error('Error while loading cookies', error);
            reject(error);
        };
    });
};

// FETCH DIV
const fetchDataFromDivs = async (page) => {
    try {
        return page.evaluate(async () => {
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
    } catch (err) {
        console.error('Error while fetching data from Divs', err)
        return err
    };
};

const mainFunction = async (query) => {
    return new Promise (async (resolve, reject) => {
        let browser = null; let page = null;
        try {     
            await loadCookies()
            .then(async (cookies) => {
                try {
                    const executable = await chromium.executablePath()
                    console.log('OUTPUT', executable)
                    console.log('Environnnement is', process.env.NODE_ENV, )
                        browser = await puppeteer.launch({
                            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],                            
                            defaultViewport: chromium.defaultViewport,
                            executablePath: process.env.NODE_ENV === 'development'
                            ?'/Applications/Chromium.app/Contents/MacOS/Chromium'
                            : await chromium.executablePath(),
                            headless: chromium.headless,
                            ignoreHTTPSErrors: true,
                        });
                } catch(error) {
                    console.error('Error in browser config', error);
                    reject(error)
                }
                page = await browser.newPage();
                console.log(`page is ${page !== undefined}, browser is ${browser !== undefined}`, 'Cookies', cookies)

                if(browser && page){  // load the page and browser before fetching cookies
                    console.log('Entering browser and page condition')
                    if(!cookies) {
                        await page.goto('https://www.linguee.fr/');
                        await page.waitForSelector('#accept-choices');
                        await page.click('#accept-choices');
                        await saveCookies(page);
                        console.log('Send to saveCookie function');
                    } else {
                        console.log('Setting cookies to page')
                        await page.setCookie(...cookies);
                        console.log('Cookies set succesfully')
                        await page.goto('https://www.linguee.fr/');
                        console.log('reached Linguee website')
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
                    // await page.screenshot({path: 'screenshot.png', fullPage:true})
                    resolve(translationData);
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
            reject(err)
        }
    });
};

exports.handler = async (event, context, callback) => {
    
    try {

        const query = event.queryStringParameters.query;
        if(!query) {
            // return {
            //     statusCode: 400, 
            //     body: JSON.stringify({error: 'Query parameter required!'}),
            //     headers: {
            //         'Content-Type': 'application/json'
            //     }
            // };
            callback(null, {
                statusCode: 400, 
                body: JSON.stringify({error: 'Query parameter required!'}),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return;
        };

        const data = await mainFunction(query);
        if(data);
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify({
        //         message: `Success! Autocompletion query param: ${query}`,
        //         data: data,
        //     }),
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }
        // };
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({
                message: `Success! Autocompletion query param: ${query}`,
                data: data,
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        }); 

    } catch(err) {
        console.error('Error occured', err);
        // return {
        //     statusCode: 500,
        //     body: JSON.stringify({error: 'Internal Server Error' }),
        //     headers: {
        //         'Content-Type': 'application/json'
        //     }
        // };
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({error: 'Internal Server Error' }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
    };
};
