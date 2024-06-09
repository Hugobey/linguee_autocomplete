// functions/test.js

const puppeteer = require ('puppeteer');

exports.handler = async (event, context) => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://www.linguee.fr/');
        const divInput = await page.focus('.lQueryHeader__input_container')
        console.log('HERE', '');

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
