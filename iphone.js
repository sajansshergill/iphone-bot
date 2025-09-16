const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const url_16 = "https://www.apple.com/shop/buy-iphone/iphone-17";

async function givePage() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    await page.goto(url_16, { waitUntil: 'domcontentloaded' });
    return { browser, page };
}

async function run() {
    const { browser, page } = await givePage();
    await add_to_cart(page);
    await shipping(page);
    await payment(page);
}

async function add_to_cart(page) {
    console.log(`add_to_cart method url ${page.url()}`);
    await smart_click_with_pause(page, "input[value='black']", 0);
    await smart_click_with_pause(page, "input[data-autom='dimensionCapacity256gb']", 0);
    await smart_click_with_pause(page, "input[data-autom='choose-noTradeIn']", 1000);
    await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 2000);
    await smart_click_with_pause(page, "input[data-autom='carrierModelUNLOCKED/US']", 2000);
    await smart_click_with_pause(page, "input[data-autom='acptl']", 1000);
    await smart_click_with_pause(page, "input[data-autom='acptl_annually']", 3000);
    await smart_click_with_pause(page, "button[data-autom='add-to-cart']", 3000);
    await smart_click_with_pause(page, "button[data-autom='proceed']", 3000);
    await smart_click_with_pause(page, "button[data-autom='checkout']", 1000);
    await smart_click_with_pause(page, "button[id='signIn.guestLogin.guestLogin']", 1000);
    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 1000);
    
}

async function add_to_bag(page){

}

async function guest_login_and_checkout(page){

}



async function shipping(page) {
    // await new Promise(r => setTimeout(r, 1000));
    console.log(`shipping method url ${page.url()}`);
    selector = "input[id='checkout.shipping.addressSelector.newAddress.address.firstName']";
    await page.waitForSelector(selector);
    await page.type(selector, "Sajan");

    await page.type("input[name='lastName']", 'Shergill');
    await page.type("input[name='street']", '8204 Baltimore Avenue');

    //Zip code handling
    const input = await page.$("input[name='postalCode']");
    await input.click({clickCount: 3});
    await input.type('10038');

    await page.type("input[name='emailAddress']", 'sajansshergill@gmail.com');
    await new Promise(r => setTimeout(r, 1000));
    await page.type("input[name='fullDaytimePhone", '5513584335');
    await new Promise(r => setTimeout(r, 1000));
    await page.click('#rs-checkout-continue-button-bottom');
    await smart_click_with_pause(page, "button[data-autom='use-Existing-address']", 2000);

}

async function payment(page) {
    console.log(`payment method url ${page.url()}`);
    await smart_click_with_pause(page, "label[id='checkout.billing.billingoptions.credit_label']", 1000);

    selector = "input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.cardNumber']"
    await page.waitForSelector(selector);
    await page.type(selector, "4929222726640311");
    await new Promise(r => setTimeout(r, 1000));
    await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.expiration']", "02/29");
    await new Promise(r => setTimeout(r, 1000));
    await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.securityCode']", "940");
    await new Promise(r => setTimeout(r, 1000));
    await page.click("button[id='rs-checkout-continue-button-bottom']");

    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 2000);
    
    await smart_click_with_pause(page, "input[id='checkout.review.placeOrder.termsAndConditions.productTerms0.termsCheckbox']", 1000);
    await smart_click_with_pause(page, "input[id='checkout.review.placeOrder.termsAndConditions.appleCarePlusLighteningTermsAnnual0.termsCheckbox']", 1000);


    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 2000);
}

//Helper Function
async function smart_click_with_pause(page, selector, pause, maxRetries = 3) {
    console.log(page.url())
    console.log("waiting for selector, " + selector)
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries}: waiting for selector, ${selector}`);
            
            // Wait for selector to be present
            await page.waitForSelector(selector, { timeout: 10000 });
            
            // Verify element is still present and clickable before clicking
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element ${selector} not found after waitForSelector`);
            }
            
            // Click the element
            await page.evaluate((s) => {
                const el = document.querySelector(s);
                if (!el) {
                    throw new Error(`Element ${s} not found in DOM`);
                }
                el.click();
            }, selector);
            
            // Pause after successful click
            await new Promise(r => setTimeout(r, pause));
            
            console.log(`Successfully clicked ${selector} on attempt ${attempt} \n`);
            return; // Success - exit the function
            
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${maxRetries} failed for selector ${selector}:`, error.message);
            
            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed for selector ${selector}. Retrying for entire page ${page.url}`);
                // TODO: retry the entire page. Fill out ifs. 
                const currUrl = page.url();
                if(currUrl.includes("https://www.apple.com/shop/buy-iphone/iphone-17")){

                }
                else if(currUrl.includes("https://www.apple.com/shop/bag")){

                }
                else if(currUrl.includes("https://secure7.store.apple.com/shop/signIn")){

                }
                else if(currUrl.includes("https://secure7.store.apple.com/shop/checkout?_s=Shipping-init")){

                }
                else if(currUrl.includes("https://secure7.store.apple.com/shop/checkout?_s=Billing-init")){

                }
                throw new Error(`Failed to click ${selector} after ${maxRetries} attempts. Last error: ${error.message}`);
            }
            
            // Wait before retrying (exponential backoff)
            const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(r => setTimeout(r, retryDelay));
        }
    }
}

run();