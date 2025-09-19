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
    await smart_click_with_pause(page, "button[id='checkout.fulfillment.pickupTab.pickup.storeLocator.search']", 2000);

    //await smart_click_with_pause(page, "button[id='checkout.fulfillment.pickupTab.pickup.timeSlot.dateTimeSlots.timeSlotValue']", 1000);
    await smart_click_with_pause('#checkout\.fulfillment\.pickupTab\.pickup\.timeSlot\.dateTimeSlots\.timeSlotValue');
    await page.keyboard.press('ArrowDown'); // Move to first real option
    await page.keyboard.press('Enter');
    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 1000);
    
}

async function pickup(page) {
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
    await page.waitForSelector(selector);
    await page.evaluate((s) => document.querySelector(s).click(), selector);
    await new Promise(r => setTimeout(r, pause));
}

run();

// /**
//  * iPhone 17 Pro Max Automated Checkout Script
//  * 
//  * This script automates the checkout process for iPhone 17 Pro Max on Apple's website
//  * with user-provided customization and shipping/payment details.
//  */

// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const readline = require('readline');

// puppeteer.use(StealthPlugin());

// const url_17_pro = "https://www.apple.com/shop/buy-iphone/iphone-17-pro";
// const FIRST_PAGE_MAX_RETRIES = 3;
// let firstPageCurrRetries = 1;

// // Create readline interface for user input
// const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
// });

// // Helper function to prompt user for input
// function askQuestion(question) {
//     return new Promise((resolve) => {
//         rl.question(question, (answer) => {
//             resolve(answer.trim());
//         });
//     });
// }

// // Helper function to validate color choice
// function validateColor(color) {
//     const validColors = ['silver', 'cosmic orange', 'deep blue'];
//     return validColors.includes(color.toLowerCase());
// }

// // Helper function to validate email format
// function validateEmail(email) {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return emailRegex.test(email);
// }

// // Helper function to validate phone number (basic validation)
// function validatePhone(phone) {
//     const phoneRegex = /^\d{10}$/;
//     return phoneRegex.test(phone.replace(/\D/g, ''));
// }

// // Collect user inputs
// async function collectUserInputs() {
//     console.log('=== iPhone 17 Pro Max Checkout Configuration ===\n');
    
//     const userInputs = {};
    
//     // Color selection
//     let color;
//     do {
//         color = await askQuestion('Choose color (silver, cosmic orange, deep blue): ');
//         if (!validateColor(color)) {
//             console.log('Invalid color. Please choose from: silver, cosmic orange, deep blue');
//         }
//     } while (!validateColor(color));
//     userInputs.color = color.toLowerCase();
    
//     console.log('\n=== Shipping Information ===');
    
//     // Shipping details
//     userInputs.firstName = await askQuestion('First Name: ');
//     userInputs.lastName = await askQuestion('Last Name: ');
//     userInputs.address = await askQuestion('Street Address: ');
//     userInputs.state = await askQuestion('State (2 letters): ');
//     userInputs.zipCode = await askQuestion('ZIP Code: ');
    
//     // Email validation
//     let email;
//     do {
//         email = await askQuestion('Email Address: ');
//         if (!validateEmail(email)) {
//             console.log('Invalid email format. Please enter a valid email address.');
//         }
//     } while (!validateEmail(email));
//     userInputs.email = email;
    
//     // Phone validation
//     let phone;
//     do {
//         phone = await askQuestion('Phone Number (10 digits): ');
//         if (!validatePhone(phone)) {
//             console.log('Invalid phone number. Please enter 10 digits.');
//         }
//     } while (!validatePhone(phone));
//     userInputs.phone = phone.replace(/\D/g, ''); // Remove non-digits
    
//     console.log('\n=== Payment Information ===');
    
//     // Payment details
//     userInputs.cardNumber = await askQuestion('Card Number: ');
//     userInputs.expiration = await askQuestion('Expiration Date (MM/YY): ');
//     userInputs.cvv = await askQuestion('CVV: ');
    
//     console.log('\n=== Billing Address ===');
//     const sameAsShipping = await askQuestion('Use same address for billing? (y/n): ');
    
//     if (sameAsShipping.toLowerCase() === 'y' || sameAsShipping.toLowerCase() === 'yes') {
//         userInputs.billingFirstName = userInputs.firstName;
//         userInputs.billingLastName = userInputs.lastName;
//         userInputs.billingAddress = userInputs.address;
//         userInputs.billingState = userInputs.state;
//         userInputs.billingZipCode = userInputs.zipCode;
//     } else {
//         userInputs.billingFirstName = await askQuestion('Billing First Name: ');
//         userInputs.billingLastName = await askQuestion('Billing Last Name: ');
//         userInputs.billingAddress = await askQuestion('Billing Street Address: ');
//         userInputs.billingState = await askQuestion('Billing State (2 letters): ');
//         userInputs.billingZipCode = await askQuestion('Billing ZIP Code: ');
//     }
    
//     return userInputs;
// }

// // Map color names to Apple's color values
// function getColorValue(colorName) {
//     const colorMap = {
//         'silver': 'silver',
//         'cosmic orange': 'cosmicorange',
//         'deep blue': 'deepblue'
//     };
//     return colorMap[colorName] || 'deepblue';
// }

// async function givePage() {
//     const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
//     const page = await browser.newPage();
//     await page.goto(url_17_pro, { waitUntil: 'domcontentloaded' });
//     return { browser, page };
// }

// async function run() {
//     try {
//         // Collect user inputs first
//         const userInputs = await collectUserInputs();
//         rl.close();
        
//         console.log('\nStarting automated checkout process...\n');
        
//         const { browser, page } = await givePage();
//         await add_to_cart(page, userInputs);
//         await shipping(page, userInputs);
//         await payment(page, userInputs);
        
//         console.log('\nCheckout process completed!');
        
//     } catch (error) {
//         console.error('Error during checkout process:', error);
//         rl.close();
//     }
// }

// async function add_to_cart(page, userInputs) {
//     console.log(`add_to_cart method url ${page.url()}`);
    
//     // Select iPhone 17 Pro Max (6.9 inch screen)
//     await smart_click_with_pause(page, "input[data-autom='dimensionScreensize6_9inch']", 0);
    
//     // Select color based on user input
//     const colorValue = getColorValue(userInputs.color);
//     await smart_click_with_pause(page, `input[value='${colorValue}']`, 0);
    
//     // Select 256GB storage (fixed)
//     await smart_click_with_pause(page, "input[data-autom='dimensionCapacity256gb']", 0);
    
//     // No trade-in (fixed)
//     await smart_click_with_pause(page, "input[data-autom='choose-noTradeIn']", 1000);
    
//     // Buy option (fixed)
//     await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 2000);
    
//     // Connect later carrier option (fixed)
//     await smart_click_with_pause(page, "input[data-autom='carrierModelUNLOCKED/US']", 2000);
    
//     // No AppleCare coverage (fixed)
//     await smart_click_with_pause(page, "input[data-autom='noapplecare']", 1000);
    
//     // Add to cart
//     await smart_click_with_pause(page, "button[data-autom='add-to-cart']", 3000);
//     await smart_click_with_pause(page, "button[data-autom='proceed']", 3000);
//     await smart_click_with_pause(page, "button[data-autom='checkout']", 1000);
    
//     // Guest checkout (fixed)
//     await smart_click_with_pause(page, "button[id='signIn.guestLogin.guestLogin']", 1000);
//     await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 1000);
// }

// async function shipping(page, userInputs) {
//     console.log(`shipping method url ${page.url()}`);
    
//     // Wait for shipping form and fill with user inputs
//     const selector = "input[id='checkout.shipping.addressSelector.newAddress.address.firstName']";
//     await page.waitForSelector(selector);
//     await page.type(selector, userInputs.firstName);

//     await page.type("input[name='lastName']", userInputs.lastName);
//     await page.type("input[name='street']", userInputs.address);

//     // Handle ZIP code
//     const zipInput = await page.$("input[name='postalCode']");
//     await zipInput.click({clickCount: 3});
//     await zipInput.type(userInputs.zipCode);

//     await page.type("input[name='emailAddress']", userInputs.email);
//     await new Promise(r => setTimeout(r, 1000));
//     await page.type("input[name='fullDaytimePhone']", userInputs.phone);
//     await new Promise(r => setTimeout(r, 1000));
    
//     // Continue to next step
//     await page.click('#rs-checkout-continue-button-bottom');
//     await smart_click_with_pause(page, "button[data-autom='use-Existing-address']", 2000);
// }

// async function payment(page, userInputs) {
//     console.log(`payment method url ${page.url()}`);
    
//     // Select credit card payment
//     await smart_click_with_pause(page, "label[id='checkout.billing.billingoptions.credit_label']", 1000);

//     // Fill payment details with user inputs
//     const cardSelector = "input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.cardNumber']";
//     await page.waitForSelector(cardSelector);
//     await page.type(cardSelector, userInputs.cardNumber);
//     await new Promise(r => setTimeout(r, 1000));
    
//     await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.expiration']", userInputs.expiration);
//     await new Promise(r => setTimeout(r, 1000));
    
//     await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.securityCode']", userInputs.cvv);
//     await new Promise(r => setTimeout(r, 1000));
    
//     // Continue to billing address
//     await smart_click_with_pause(page, "button[data-autom='continue-button-label']", 3000);

//     await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 2000);
    
// }

// // Helper Function (unchanged from original)
// async function smart_click_with_pause(page, selector, pause, maxRetries = 3) {
//     console.log(page.url());
//     console.log("waiting for selector, " + selector);
//     let lastError;
    
//     for (let attempt = 1; attempt <= maxRetries; attempt++) {
//         try {
//             console.log(`Attempt ${attempt}/${maxRetries}: waiting for selector, ${selector}`);
            
//             await page.waitForSelector(selector, { timeout: 10000 });
            
//             const element = await page.$(selector);
//             if (!element) {
//                 throw new Error(`Element ${selector} not found after waitForSelector`);
//             }
            
//             await page.evaluate((s) => {
//                 const el = document.querySelector(s);
//                 if (!el) {
//                     throw new Error(`Element ${s} not found in DOM`);
//                 }
//                 el.click();
//             }, selector);
            
//             await new Promise(r => setTimeout(r, pause));
            
//             console.log(`Successfully clicked ${selector} on attempt ${attempt} \n`);
//             return;
            
//         } catch (error) {
//             lastError = error;
//             console.warn(`Attempt ${attempt}/${maxRetries} failed for selector ${selector}:`, error.message);
            
//             if (attempt === maxRetries) {
//                 console.error(`All ${maxRetries} attempts failed for selector ${selector}. Retrying for entire page ${page.url()}`);
//                 const currUrl = page.url();
                
//                 if(currUrl.includes(url_17_pro) && firstPageCurrRetries < FIRST_PAGE_MAX_RETRIES){
//                     console.log("Retrying first page");
//                     await page.goto(url_17_pro);
//                     firstPageCurrRetries += 1;
//                     await add_to_cart(page, selector, pause);
//                 }
//                 throw new Error(`Failed to click ${selector} after ${maxRetries} attempts. Last error: ${error.message}`);
//             }
            
//             const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
//             console.log(`Waiting ${retryDelay}ms before retry...`);
//             await new Promise(r => setTimeout(r, retryDelay));
//         }
//     }
// }

// // Start the process
// run();