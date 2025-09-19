const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const url_16 = "https://www.apple.com/shop/buy-iphone/iphone-16";

async function givePage() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    await page.goto(url_16, { waitUntil: 'domcontentloaded' });
    return { browser, page };
}

async function run() {
    const { browser, page } = await givePage();
    await add_to_cart(page);
    await pickup(page);
    await payment(page);
}

async function add_to_cart(page) {

    await smart_click_with_pause(page, "input[data-autom='dimensionScreensize6_7inch']", 0);
    await smart_click_with_pause(page, "input[value='black']", 0);
    await smart_click_with_pause(page, "input[data-autom='dimensionCapacity256gb']", 0);
    await smart_click_with_pause(page, "input[data-autom='choose-noTradeIn']", 1000);
    await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 2000);
    await smart_click_with_pause(page, "input[data-autom='carrierModelUNLOCKED/US']", 2000);
    await smart_click_with_pause(page, "input[data-autom='acptl']", 1000);
    await smart_click_with_pause(page, "input[data-autom='acptl_annually']", 3000);
    await smart_click_with_pause(page, "button[value='add-to-cart']", 3000);
    await smart_click_with_pause(page, "button[data-autom='proceed']", 3000);
    await smart_click_with_pause(page, "button[data-autom='checkout']", 1000);
    await smart_click_with_pause(page, "button[id='signIn.guestLogin.guestLogin']", 3000);
    await smart_click_with_pause(page, "button[aria-checked='false']", 1000);
    await smart_click_with_pause(page, "button[data-autom='fulfillment-pickup-store-search-button']", 1000);

    await page.waitForSelector("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']");
    await page.click("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']", { clickCount: 3 }); // select all
    await page.keyboard.press("Backspace"); // clear
    await page.type("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']", "32839"); // type new value
    await smart_click_with_pause(page, "button[id='checkout.fulfillment.pickupTab.pickup.storeLocator.search']", 5000);

    await smart_click_with_pause(page, "input[value='R053']", 5000);
    await new Promise(r => setTimeout(r, 10000));
    // await smart_click_with_pause(page, '#checkout\.fulfillment\.pickupTab\.pickup\.timeSlot\.dateTimeSlots\.timeSlotValue', 3000);
    // await page.keyboard.press('ArrowDown'); // Move to first real option
    // await page.keyboard.press('Enter');

    const dropdown = "select#checkout\\.fulfillment\\.pickupTab\\.pickup\\.timeSlot\\.dateTimeSlots\\.timeSlotValue";
    await page.click(dropdown);
    
    // Select the first option (index 0)
    const firstValue = await page.$eval(dropdown, el => el.options[1].value);
    console.log("Selected value: " + firstValue);
    await page.select(dropdown, firstValue);

    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 1000);
    
}

async function pickup(page) {
    await new Promise(r => setTimeout(r, 3000));
    
    selector = "input[id='checkout.shipping.addressSelector.newAddress.address.firstName']";
    await page.waitForSelector(selector);
    await page.type(selector, "Sajan");

    //await page.type("input[id='checkout.shipping.addressSelector.newAddress.address.firstName']", 'Sajan');
    //await page.type("input[name='firstName']", 'Sajan');

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

async function shipping(page) {
    // await new Promise(r => setTimeout(r, 1000));
    
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
async function smart_click_with_pause(page, selector, pause) {
    console.log("selector is " + selector);
    // await page.delay(selector)
    await page.waitForSelector(selector);
    await page.evaluate((s) => document.querySelector(s).click(), selector);
    await new Promise(r => setTimeout(r, pause));
}

run();