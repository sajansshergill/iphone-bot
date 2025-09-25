/**
 * iPhone 17 Pro Max Automated Checkout Script
 * 
 * This script automates the checkout process for iPhone 17 Pro Max on Apple's website
 * with configuration loaded from a JSON file.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const url_17_pro = "https://www.apple.com/shop/buy-iphone/iphone-16";
const FIRST_PAGE_MAX_RETRIES = 3;
let firstPageCurrRetries = 1;
const zipcodeToStoreMap = new Map([
    ['32839', 'R053'],
    ['33130', 'R623'],
    ['32809', 'R143'],
    ['33139', 'R115'],
    ['33132', 'R623']
]);

// Load configuration from JSON file
function loadConfig(configPath = 'config16.json') {
    try {
        const configFile = path.resolve(configPath);
        
        if (!fs.existsSync(configFile)) {
            console.error(`Configuration file not found: ${configFile}`);
            console.log('\nCreating example configuration file...');
            createExampleConfig(configFile);
            console.log(`Please edit ${configFile} with your details and run the script again.`);
            process.exit(1);
        }
        
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);
        
        // Validate the configuration
        validateConfig(config);
        
        console.log('Configuration loaded successfully from:', configFile);
        return config;
        
    } catch (error) {
        console.error('Error loading configuration:', error.message);
        process.exit(1);
    }
}

// Create example configuration file
function createExampleConfig(configPath) {
    const exampleConfig = {
        "product": {
            "color": "black"
        },
        "pickup": {
            "zipcode": "32839"
        },
        "contact": {
            "firstName": "Sajan",
            "lastName": "Shergill",
            "email": "sajanshergill@gmail.com",
            "phone": "5513584335"
        },
        "payment": {
            "cardNumber": "4929222726640311",
            "expiration": "02/29",
            "cvv": "940"
        },
        "billing": {
            "firstName": "Sajan",
            "lastName": "Shergill",
            "address": "One Place Plaza",
            "state": "NY",
            "zipCode": "10038"
        }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
}

// Validate configuration
function validateConfig(config) {
    const requiredFields = [
        'product.color',
        'pickup.zipcode',
        'contact.firstName',
        'contact.lastName', 
        'contact.email',
        'contact.phone',
        'payment.cardNumber',
        'payment.expiration',
        'payment.cvv',
        'billing.firstName',
        'billing.lastName',
        'billing.address',
        'billing.state',
        'billing.zipCode'
    ];
    
    const missing = [];
    
    requiredFields.forEach(field => {
        const keys = field.split('.');
        let current = config;
        
        for (const key of keys) {
            if (!current || !current.hasOwnProperty(key)) {
                missing.push(field);
                break;
            }
            current = current[key];
        }
        
        // Check if the final value is empty or null
        if (current === null || current === undefined || current === '') {
            missing.push(field);
        }
    });
    
    if (missing.length > 0) {
        throw new Error(`Missing or empty required configuration fields: ${missing.join(', ')}`);
    }
    
    // Validate specific values
    const validColors = ['black'];
    if (!validColors.includes(config.product.color.toLowerCase())) {
        throw new Error(`Invalid color: ${config.product.color}. Valid colors: ${validColors.join(', ')}`);
    }
    
    if (!zipcodeToStoreMap.has(config.pickup.zipcode)) {
        throw new Error(`Invalid pickup zipcode: ${config.pickup.zipcode}. Valid zipcodes: ${Array.from(zipcodeToStoreMap.keys()).join(', ')}`);
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(config.contact.email)) {
        throw new Error(`Invalid email format: ${config.contact.email}`);
    }
    
    // Basic phone validation
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = config.contact.phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
        throw new Error(`Invalid phone number: ${config.contact.phone}. Must be 10 digits.`);
    }
    
    console.log('Configuration validation passed ✓');
}

// Map color names to Apple's color values
function getColorValue(colorName) {
    const colorMap = {
        'black': 'black'
    };
    return colorMap[colorName.toLowerCase()] || 'black';
}

async function givePage() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    return { browser, page };
}

async function run() {
    try {
        // Load configuration from JSON file
        const config = loadConfig();
        
        console.log('\n=== Configuration Summary ===');
        console.log(`Product: iPhone 16 Pro Max, ${config.product.color}`);
        console.log(`Pickup: ${config.pickup.zipcode}`);
        console.log(`Contact: ${config.contact.firstName} ${config.contact.lastName}`);
        console.log(`Email: ${config.contact.email}`);
        console.log(`Phone: ${config.contact.phone}`);
        console.log('================================\n');
        
        console.log('Starting automated checkout process...\n');
        
        const { browser, page } = await givePage();
        while(true){
            await page.goto(url_17_pro, { waitUntil: 'domcontentloaded' });
            await add_to_cart(page, config);
            await checkout_pickup(page, config);
            await payment(page, config);
            await billing_details(page, config);
            
            console.log('\nCheckout process completed!');
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        console.error('Error during checkout process:', error.message);
        process.exit(1);
    }
}

async function billing_details(page, config) {
    await new Promise(r => setTimeout(r, 4000));
    
    selector = "input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.billingAddress.address.firstName']";
    await page.waitForSelector(selector);
    await page.type(selector, config.billing.firstName);

    await page.type("input[name='lastName']", config.billing.lastName);
    await page.type("input[name='street']", config.billing.address);

    //Zip code handling
    const input = await page.$("input[name='postalCode']");
    await input.click({clickCount: 3});
    await input.type(config.billing.zipCode);
    
    await new Promise(r => setTimeout(r, 5000));
    await page.click('#rs-checkout-continue-button-bottom');
    await smart_click_with_pause(page, "button[data-autom='continue-button-label']", 5000);
    await new Promise(r => setTimeout(r, 5000));
    await page.click('#rs-checkout-continue-button-bottom');
    await smart_click_with_pause(page, "button[data-autom='continue-button-label']", 5000);
}

async function add_to_cart(page, config) {
    console.log(`add_to_cart method url ${page.url()}`);
    
    // Select iPhone 17 Pro Max (6.9 inch screen)
    await smart_click_with_pause(page, "input[data-autom='dimensionScreensize6_7inch']", 0);
    
    // Select color based on config
    const colorValue = getColorValue(config.product.color);
    await smart_click_with_pause(page, `input[value='${colorValue}']`, 0);
    
    // Select storage (default to 256GB if not specified)
    const storage = config.product.storage || '256gb';
    await smart_click_with_pause(page, `input[data-autom='dimensionCapacity${storage}']`, 0);
    
    // Trade-in option
    const tradeInOption = config.options?.tradeIn ? 'choose-tradeIn' : 'choose-noTradeIn';
    await smart_click_with_pause(page, `input[data-autom='${tradeInOption}']`, 1000);
    
    // Buy option (fixed)
    await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 2000);
    
    // Carrier option
    const carrier = config.options?.carrier || 'unlocked';
    const carrierMap = {
        'unlocked': 'UNLOCKED/US',
        'verizon': 'VERIZON/US',
        'att': 'ATT/US',
        'tmobile': 'TMOBILE/US'
    };
    await smart_click_with_pause(page, `input[data-autom='carrierModel${carrierMap[carrier]}']`, 2000);
    
    // AppleCare option
    const applecareOption = config.options?.applecare ? 'applecare' : 'noapplecare';
    await smart_click_with_pause(page, `input[data-autom='${applecareOption}']`, 1000);
    
    // Add to cart
    await smart_click_with_pause(page, "button[data-autom='add-to-cart']", 3000);
    await smart_click_with_pause(page, "button[data-autom='proceed']", 3000);
    await smart_click_with_pause(page, "button[data-autom='checkout']", 1000);
    
    // Guest checkout (fixed)
    await smart_click_with_pause(page, "button[id='signIn.guestLogin.guestLogin']", 1000);

    // Pickup configuration
    await smart_click_with_pause(page, "button[aria-checked='false']", 1000);
    await smart_click_with_pause(page, "button[data-autom='fulfillment-pickup-store-search-button']", 1000);

    await page.waitForSelector("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']");
    await page.click("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type("input[id='checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput']", config.pickup.zipcode);
    await smart_click_with_pause(page, "button[id='checkout.fulfillment.pickupTab.pickup.storeLocator.search']", 5000);
    console.log("Using pickup zip code: " + config.pickup.zipcode);
    await smart_click_with_pause(page, `input[value='${zipcodeToStoreMap.get(config.pickup.zipcode)}']`, 5000);
    await new Promise(r => setTimeout(r, 10000));

    const dropdown = "select#checkout\\.fulfillment\\.pickupTab\\.pickup\\.timeSlot\\.dateTimeSlots\\.timeSlotValue";
    await page.click(dropdown);
    
    // Select the first available option
    const firstValue = await page.$eval(dropdown, el => el.options[1].value);
    console.log("Selected time slot: " + firstValue);
    await page.select(dropdown, firstValue);

    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 1000);
}

async function checkout_pickup(page, config) {
    await new Promise(r => setTimeout(r, 4000));
    
    selector = "input[id='checkout.pickupContact.selfPickupContact.selfContact.address.firstName']";
    await page.waitForSelector(selector);
    await page.type(selector, config.contact.firstName);

    await page.type("input[name='lastName']", config.contact.lastName);
    await page.type("input[name='emailAddress']", config.contact.email);
    await new Promise(r => setTimeout(r, 1000));
    
    // Clean phone number (remove non-digits)
    const cleanPhone = config.contact.phone.replace(/\D/g, '');
    await page.type("input[name='fullDaytimePhone']", cleanPhone);
    await new Promise(r => setTimeout(r, 1000));
    
    await page.click('#rs-checkout-continue-button-bottom');
    await smart_click_with_pause(page, "button[data-autom='continue-button-label']", 2000);
}

async function payment(page, config) {
    console.log(`payment method url ${page.url()}`);
    
    // Select credit card payment
    await smart_click_with_pause(page, "label[id='checkout.billing.billingoptions.credit_label']", 1000);

    // Fill payment details from config
    const cardSelector = "input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.cardNumber']";
    await page.waitForSelector(cardSelector);
    await page.type(cardSelector, config.payment.cardNumber);
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.expiration']", config.payment.expiration);
    await new Promise(r => setTimeout(r, 1000));
    
    await page.type("input[id='checkout.billing.billingOptions.selectedBillingOptions.creditCard.cardInputs.cardInput-0.securityCode']", config.payment.cvv);
    await new Promise(r => setTimeout(r, 1000));
    
    // Continue to billing address
    await smart_click_with_pause(page, "button[data-autom='continue-button-label']", 3000);
    await smart_click_with_pause(page, "button[id='rs-checkout-continue-button-bottom']", 2000);
}

// Helper Function (unchanged from original)
async function smart_click_with_pause(page, selector, pause, maxRetries = 3) {
    console.log(page.url());
    console.log("waiting for selector, " + selector);
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries}: waiting for selector, ${selector}`);
            
            await page.waitForSelector(selector, { timeout: 10000 });
            
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element ${selector} not found after waitForSelector`);
            }
            
            await page.evaluate((s) => {
                const el = document.querySelector(s);
                if (!el) {
                    throw new Error(`Element ${s} not found in DOM`);
                }
                el.click();
            }, selector);
            
            await new Promise(r => setTimeout(r, pause));
            
            console.log(`Successfully clicked ${selector} on attempt ${attempt} \n`);
            return;
            
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempt}/${maxRetries} failed for selector ${selector}:`, error.message);
            
            if (attempt === maxRetries) {
                console.error(`All ${maxRetries} attempts failed for selector ${selector}. Retrying for entire page ${page.url()}`);
                const currUrl = page.url();
                
                if(currUrl.includes(url_17_pro) && firstPageCurrRetries < FIRST_PAGE_MAX_RETRIES){
                    console.log("Retrying first page");
                    await page.goto(url_17_pro);
                    firstPageCurrRetries += 1;
                    await add_to_cart(page, config);
                }
                throw new Error(`Failed to click ${selector} after ${maxRetries} attempts. Last error: ${error.message}`);
            }
            
            const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Waiting ${retryDelay}ms before retry...`);
            await new Promise(r => setTimeout(r, retryDelay));
        }
    }
}

// Start the process
run();
