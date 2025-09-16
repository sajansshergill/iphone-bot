const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const product_url = "https://www.stanley1913.com/products/the-quencher-h2-0-flowstate%E2%84%A2-tumbler-40-oz-sale?variant=53972968243560";

async function givePage() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    return { browser, page };
}

async function addToCart(page) {
    await page.goto(product_url);
    await new Promise(r => setTimeout(r, 1500));
    console.log('✅ Page loaded');

    // Accept cookies if the button exists
    await smart_click_with_pause(page, "button[id='onetrust-accept-btn-handler']", 1000);
    console.log('✅ Cookies accepted');

    // add to cart
    await smart_click_with_pause(page, "button[id^='ProductSubmitButton']", 2000);
    console.log('✅ Added to cart');
    await smart_click_with_pause(page, "button[name='checkout']", 2000);
    console.log('✅ Proceeded to checkout');

}

async function billing(page) {
    console.log("📝 Filling billing form...");
    await smart_type_with_pause(page, "input[id='email']", 'flexipreneur@gmail.com');
    await smart_click_with_pause(page, "input[id='marketing_opt_in']", 1000);
    
    //Shipping address
    await smart_type_with_pause(page, "input[id='TextField0']", 'Sajan', 1000);
    await smart_type_with_pause(page, "input[id='TextField1']", 'Shergill', 1000);
    await smart_type_with_pause(page, "input[id='shipping-address1']", '123 Ann St', 1000);
    await smart_type_with_pause(page, "input[id='TextField3']", 'Apt 4B', 1000);
    await smart_type_with_pause(page, "input[id='TextField4']", 'Valley Stream', 1000);
    await smart_type_with_pause(page, "select[id='Select1']", 'New York', 1000);
    await smart_type_with_pause(page, "input[name='phone']", '5513584302', 1000);
    await smart_type_with_pause(page, "input[id='TextField5']", '11580', 1000);
    //await smart_click_with_pause(page, "input[name='sms_marketing_opt_in']", 1000);
    console.log('✅ Shipping address filled');

    await page.evaluate(() => {
        document.querySelector("button[type='submit']").click();
    });
    console.log('✅ Shipping address submitted');
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate(() => {
        document.querySelector("button[type='submit']").click();
    });
    console.log('✅ Billing address submitted');
}

async function cardDetails(page) {
    console.log("💳 Entering card details...");
    await new Promise(r => setTimeout(r, 1500));

    // Card Number iframe and input
    let iframeCardNumber = await page.waitForSelector("iframe[title='Field container for: Card number']");
    let frameCardNumber = await iframeCardNumber.contentFrame();
    await smart_type_with_pause(frameCardNumber, "input[id='number']", '4556159857005627', 1000); 

    // Expiry Date iframe and input
    let iframeCardExpiry = await page.waitForSelector("iframe[title='Field container for: Expiration date (MM / YY)']");
    let frameCardExpiry = await iframeCardExpiry.contentFrame();
    await smart_type_with_pause(frameCardExpiry, "input[id='expiry']", '04 / 29', 1000); 

    // CVV iframe and input
    let iframeCardCvv = await page.waitForSelector("iframe[title='Field container for: Security code']");
    let frameCardCvv = await iframeCardCvv.contentFrame();
    await smart_type_with_pause(frameCardCvv, "input[id='verification_value']", '740', 1000); 

    console.log('✅ Card details entered');

    await smart_click_with_pause(page, "button[type='submit']", 4000);
    console.log('✅ Payment submitted');
}

async function checkout() {
    const { browser, page } = await givePage();
    await addToCart(page);
    await billing(page);
    await cardDetails(page);
}

// Helper Functions
async function smart_click_with_pause(page, selector, pause) {
    await page.waitForSelector(selector);
    await page.evaluate((s) => document.querySelector(s).click(), selector);
    await new Promise(r => setTimeout(r, pause));
}

async function smart_type_with_pause(page, selector, text, pause) {
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.type(selector, text);
    await delay(pause);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

checkout();