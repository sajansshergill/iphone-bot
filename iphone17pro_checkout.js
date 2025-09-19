/**
 * iPhone 17 Pro Max Automated Checkout (Delivery or Pickup)
 * - Adds a robust Pickup path with store selection by city/address
 * - Keeps your Delivery path as-is
 *
 * Usage tip:
 *   - When asked, choose fulfillment: delivery / pickup
 *   - If pickup, choose one of the predefined store keys when prompted
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const readline = require('readline');

puppeteer.use(StealthPlugin());

const url_17_pro = "https://www.apple.com/shop/buy-iphone/iphone-17-pro";
const FIRST_PAGE_MAX_RETRIES = 3;
let firstPageCurrRetries = 1;

// --------------------------
// Store Map (Orlando / Miami)
// --------------------------
/**
 * You can extend this with as many cities/stores as you want.
 * Keys are what the user types (pickupStoreKey), each maps to a list of "matchers".
 * We match by store name + a distinctive piece of the address (robust if Apple formats differently).
 */
const STORE_MAP = {
  "orlando-milenia": {
    citySearch: "Orlando, FL",
    matchers: ["Apple Millenia", "4200 Conroy"],
  },
  "orlando-florida-mall": {
    citySearch: "Orlando, FL",
    matchers: ["Apple Florida Mall", "8001 S Orange Blossom"],
  },
  "miami-brickell": {
    citySearch: "Miami, FL",
    matchers: ["Apple Brickell City Centre", "701 S Miami Ave"],
  },
  "miami-lincoln": {
    citySearch: "Miami Beach, FL",
    matchers: ["Apple Lincoln Road", "1021 Lincoln Road"],
  },
  "miami-worldcenter": {
    citySearch: "Miami, FL",
    matchers: ["Apple Miami Worldcenter", "100 NE Eighth"],
  },
};

// ---------------------
// Readline + validation
// ---------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askQuestion(q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

function validateColor(color) {
  const validColors = ['silver', 'cosmic orange', 'deep blue'];
  return validColors.includes(color.toLowerCase());
}
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; return re.test(email);
}
function validatePhone(phone) {
  const digits = phone.replace(/\D/g, ''); return /^\d{10}$/.test(digits);
}
function getColorValue(colorName) {
  const colorMap = { 'silver': 'silver', 'cosmic orange': 'cosmicorange', 'deep blue': 'deepblue' };
  return colorMap[colorName.toLowerCase()] || 'deepblue';
}

// ---------------------------------------------
// New helpers: resilient text / button clicking
// ---------------------------------------------
async function clickByText(page, selector, includesText, opts = {}) {
  const { timeout = 10000, exact = false, clickParentSelector = null } = opts;
  await page.waitForSelector(selector, { timeout });
  const found = await page.$$eval(selector, (els, text, exact, clickParentSelector) => {
    function normalize(s){ return s.replace(/\s+/g,' ').trim(); }
    const target = text.toLowerCase();
    for (const el of els) {
      const label = normalize(el.innerText || el.textContent || "");
      const cmp = label.toLowerCase();
      const matched = exact ? (cmp === target) : cmp.includes(target);
      if (matched) {
        const clickable = clickParentSelector ? el.closest(clickParentSelector) || el : el;
        clickable.click();
        return true;
      }
    }
    return false;
  }, includesText, exact, clickParentSelector);
  if (!found) throw new Error(`No element with text "${includesText}" under ${selector}`);
}

async function smart_click_with_pause(page, selector, pauseMs, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      const el = await page.$(selector);
      if (!el) throw new Error(`Element ${selector} not found after waitForSelector`);
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) throw new Error(`Element ${s} not found in DOM`);
        el.click();
      }, selector);
      if (pauseMs) await new Promise(r => setTimeout(r, pauseMs));
      return;
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) {
        const currUrl = page.url();
        if (currUrl.includes(url_17_pro) && firstPageCurrRetries < FIRST_PAGE_MAX_RETRIES) {
          await page.goto(url_17_pro, { waitUntil: 'domcontentloaded' });
          firstPageCurrRetries += 1;
        }
        throw new Error(`Failed clicking ${selector}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
    }
  }
}

// -----------------------
// New: Pickup flow helpers
// -----------------------
async function openPickupFinder(page) {
  // On recent Apple flows, after configuring the device there’s either:
  //  - A “Pick up” / “Pickup” tab or toggle
  //  - A “Check availability” / “Check another store” link/button
  // We try multiple fallbacks:
  const candidates = [
    // tab/toggle
    "button[data-autom='rf-pickup-tab']",
    "button#rf-tab-pickup",
    "button[aria-controls*='pickup']",
    // link/buttons
    "button[data-autom='check-availability']",
    "a[data-autom='check-availability']",
    "button:has(span:contains('Check availability'))", // :has() not widely supported in querySelector, kept for completeness if Playwright. We fall back to text click below.
  ];

  for (const sel of candidates) {
    try { await smart_click_with_pause(page, sel, 1000, 1); return; } catch {}
  }

  // Fallback: click any button/link containing “pick up” or “check availability”
  try { await clickByText(page, "button, a", "pick up", { timeout: 5000 }); return; } catch {}
  try { await clickByText(page, "button, a", "pickup", { timeout: 5000 }); return; } catch {}
  try { await clickByText(page, "button, a", "check availability", { timeout: 5000 }); return; } catch {}

  throw new Error("Could not open Pickup finder UI.");
}

async function searchCityForPickup(page, cityQuery) {
  // Apple usually shows a search input in the pickup modal/panel
  const searchSelectors = [
    "input[aria-label='Search for a store']",
    "input[name='search']",
    "input[type='search']",
    "input[placeholder*='city']",
    "input[placeholder*='ZIP']",
  ];
  let success = false;
  for (const sel of searchSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      await page.click(sel, { clickCount: 3 });
      await page.type(sel, cityQuery);
      await page.keyboard.press('Enter');
      success = true;
      break;
    } catch {}
  }
  if (!success) {
    // Text-based fallback: focus the first input and type
    const anyInput = await page.$("input");
    if (!anyInput) throw new Error("No pickup search input found.");
    await anyInput.click({ clickCount: 3 });
    await page.type("input", cityQuery);
    await page.keyboard.press('Enter');
  }
  // Wait for results to load
  await page.waitForTimeout(2000);
}

async function selectStoreByMatchers(page, matchers) {
  /**
   * We look for store cards that contain both the store name and a distinctive piece of the address.
   * Then we click the “Select” / similar button inside that card.
   */
  const result = await page.evaluate((matchers) => {
    function normalize(str){ return (str || "").replace(/\s+/g,' ').trim().toLowerCase(); }
    const cards = Array.from(document.querySelectorAll("[data-autom*='store-card'], .rf-pickup-store, li, div"))
      .filter(el => {
        const t = normalize(el.innerText || el.textContent);
        // Must include *all* matchers (AND)
        return matchers.every(m => t.includes(normalize(m)));
      });

    for (const card of cards) {
      // Find a “Select”, “Choose”, or similar CTA
      const btn = card.querySelector("button, a");
      if (!btn) continue;
      const label = normalize(btn.innerText || btn.textContent);
      if (label.includes("select") || label.includes("choose") || label.includes("pick up here") || label.includes("add to bag")) {
        btn.click();
        return true;
      }
      // If the first button isn't usable, try any clickable descendants
      const b2 = Array.from(card.querySelectorAll("button, a")).find(b => {
        const l = normalize(b.innerText || b.textContent);
        return l.includes("select") || l.includes("choose") || l.includes("pick up here") || l.includes("add to bag");
      });
      if (b2) { b2.click(); return true; }
    }
    return false;
  }, matchers);

  if (!result) throw new Error(`Could not find a matching store card for: ${matchers.join(" + ")}`);

  // Allow next UI to settle
  await new Promise(r => setTimeout(r, 1500));
}

// -------------------
// Main flow functions
// -------------------
async function givePage() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox'],
    // slowMo: 20, // enable if needed
  });
  const page = await browser.newPage();
  await page.goto(url_17_pro, { waitUntil: 'domcontentloaded' });
  return { browser, page };
}

async function add_to_cart(page, userInputs) {
  // 17 Pro Max 6.9"
  await smart_click_with_pause(page, "input[data-autom='dimensionScreensize6_9inch']", 0);

  // Color
  const colorValue = getColorValue(userInputs.color);
  await smart_click_with_pause(page, `input[value='${colorValue}']`, 0);

  // Storage 256GB
  await smart_click_with_pause(page, "input[data-autom='dimensionCapacity256gb']", 0);

  // No trade-in
  await smart_click_with_pause(page, "input[data-autom='choose-noTradeIn']", 500);

  // Full price
  await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 800);

  // Unlocked / Connect later
  await smart_click_with_pause(page, "input[data-autom='carrierModelUNLOCKED/US']", 800);

  // AppleCare: none
  await smart_click_with_pause(page, "input[data-autom='noapplecare']", 500);
}

async function do_delivery_checkout(page, userInputs) {
  // Add to cart and proceed to delivery checkout as in your original:
  await smart_click_with_pause(page, "button[data-autom='add-to-cart']", 2000);
  await smart_click_with_pause(page, "button[data-autom='proceed']", 2000);
  await smart_click_with_pause(page, "button[data-autom='checkout']", 1000);

  // Guest checkout
  await smart_click_with_pause(page, "button#signIn\\.guestLogin\\.guestLogin", 800);
  await smart_click_with_pause(page, "button#rs-checkout-continue-button-bottom", 800);

  // Shipping page (same as your original):
  const first = "input#checkout\\.shipping\\.addressSelector\\.newAddress\\.address\\.firstName";
  await page.waitForSelector(first);
  await page.type(first, userInputs.firstName);
  await page.type("input[name='lastName']", userInputs.lastName);
  await page.type("input[name='street']", userInputs.address);
  const zipInput = await page.$("input[name='postalCode']");
  await zipInput.click({ clickCount: 3 });
  await zipInput.type(userInputs.zipCode);
  await page.type("input[name='emailAddress']", userInputs.email);
  await page.waitForTimeout(500);
  await page.type("input[name='fullDaytimePhone']", userInputs.phone.replace(/\D/g, ''));
  await page.click('#rs-checkout-continue-button-bottom');
  // Sometimes Apple prompts to use the suggested address
  try { await smart_click_with_pause(page, "button[data-autom='use-Existing-address']", 1500, 1); } catch {}
  // ... then payment (same as your original)
}

async function do_pickup_flow(page, userInputs) {
  // Instead of adding to cart for delivery, we open the Pickup selector first
  await openPickupFinder(page);

  // Search by city derived from chosen store key
  const storeCfg = STORE_MAP[userInputs.pickupStoreKey];
  if (!storeCfg) throw new Error(`Unknown pickupStoreKey "${userInputs.pickupStoreKey}". Valid keys: ${Object.keys(STORE_MAP).join(", ")}`);

  await searchCityForPickup(page, storeCfg.citySearch);

  // Pick the exact store based on name + address matchers
  await selectStoreByMatchers(page, storeCfg.matchers);

  // At this point Apple typically takes you to a bag page or confirms store.
  // We stop here by design (“go through the flow until pickup”).
  console.log(`✅ Pickup store selected for "${userInputs.pickupStoreKey}". Stopping before payment as requested.`);
}

// --------------------
// Collect user inputs
// --------------------
async function collectUserInputs() {
  console.log('=== iPhone 17 Pro Max Checkout Configuration ===\n');

  const userInputs = {};

  // fulfillment
  let mode;
  do {
    mode = await askQuestion('Fulfillment (delivery/pickup): ');
    mode = (mode || "").toLowerCase();
  } while (!["delivery", "pickup"].includes(mode));
  userInputs.fulfillmentMode = mode;

  // Color
  let color;
  do {
    color = await askQuestion('Choose color (silver, cosmic orange, deep blue): ');
    if (!validateColor(color)) console.log('Invalid color. Choose: silver, cosmic orange, deep blue');
  } while (!validateColor(color));
  userInputs.color = color.toLowerCase();

  if (mode === "pickup") {
    console.log('\n=== Pickup Store ===');
    console.log('Store keys:\n - ' + Object.keys(STORE_MAP).join('\n - '));
    let key;
    do {
      key = await askQuestion('Enter pickupStoreKey from the list above: ');
    } while (!STORE_MAP[key]);
    userInputs.pickupStoreKey = key;
    // We stop after store selection; no personal data required for this step.
    return userInputs;
  }

  // Delivery path (your original questions)
  console.log('\n=== Shipping Information ===');
  userInputs.firstName = await askQuestion('First Name: ');
  userInputs.lastName  = await askQuestion('Last Name: ');
  userInputs.address   = await askQuestion('Street Address: ');
  userInputs.state     = await askQuestion('State (2 letters): ');
  userInputs.zipCode   = await askQuestion('ZIP Code: ');

  let email;
  do {
    email = await askQuestion('Email Address: ');
    if (!validateEmail(email)) console.log('Invalid email format.');
  } while (!validateEmail(email));
  userInputs.email = email;

  let phone;
  do {
    phone = await askQuestion('Phone Number (10 digits): ');
    if (!validatePhone(phone)) console.log('Invalid phone number.');
  } while (!validatePhone(phone));
  userInputs.phone = phone.replace(/\D/g, '');

  console.log('\n=== Payment Information ===');
  userInputs.cardNumber = await askQuestion('Card Number: ');
  userInputs.expiration = await askQuestion('Expiration Date (MM/YY): ');
  userInputs.cvv        = await askQuestion('CVV: ');

  console.log('\n=== Billing Address ===');
  const sameAsShipping = (await askQuestion('Use same address for billing? (y/n): ')).toLowerCase();
  if (sameAsShipping === 'y' || sameAsShipping === 'yes') {
    userInputs.billingFirstName = userInputs.firstName;
    userInputs.billingLastName  = userInputs.lastName;
    userInputs.billingAddress   = userInputs.address;
    userInputs.billingState     = userInputs.state;
    userInputs.billingZipCode   = userInputs.zipCode;
  } else {
    userInputs.billingFirstName = await askQuestion('Billing First Name: ');
    userInputs.billingLastName  = await askQuestion('Billing Last Name: ');
    userInputs.billingAddress   = await askQuestion('Billing Street Address: ');
    userInputs.billingState     = await askQuestion('Billing State (2 letters): ');
    userInputs.billingZipCode   = await askQuestion('Billing ZIP Code: ');
  }

  return userInputs;
}

// -------------
// Entrypoint(s)
// -------------
async function run() {
  const userInputs = await collectUserInputs();
  rl.close();

  const { browser, page } = await givePage();
  try {
    await add_to_cart(page, userInputs);

    if (userInputs.fulfillmentMode === "pickup") {
      await do_pickup_flow(page, userInputs);
    } else {
      // Your original delivery+payment path
      await do_delivery_checkout(page, userInputs);
      // ... then your payment(page, userInputs) if you want to finish
      // Left out intentionally to keep parity with the original outline
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    // Keep browser open so you can see where the flow ended
    // await browser.close();
  }
}

run();
