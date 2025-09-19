/**
 * iPhone 16 Pickup Script (stops after store selection)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const url_16 = "https://www.apple.com/shop/buy-iphone/iphone-16";

// Reuse the same STORE_MAP + helpers as the 17 Pro script:
const STORE_MAP = {
  "orlando-milenia": { citySearch: "Orlando, FL", matchers: ["Apple Millenia", "4200 Conroy"] },
  "orlando-florida-mall": { citySearch: "Orlando, FL", matchers: ["Apple Florida Mall", "8001 S Orange Blossom"] },
  "miami-brickell": { citySearch: "Miami, FL", matchers: ["Apple Brickell City Centre", "701 S Miami Ave"] },
  "miami-lincoln": { citySearch: "Miami Beach, FL", matchers: ["Apple Lincoln Road", "1021 Lincoln Road"] },
  "miami-worldcenter": { citySearch: "Miami, FL", matchers: ["Apple Miami Worldcenter", "100 NE Eighth"] },
};

function ask(q){ return new Promise(r => rl.question(q, a => r(a.trim()))); }

async function smart_click_with_pause(page, selector, pauseMs, maxRetries = 3) {
  let last;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      await page.evaluate((s)=>{ const el=document.querySelector(s); if(!el) throw new Error("not found"); el.click(); }, selector);
      if (pauseMs) await new Promise(r=>setTimeout(r, pauseMs));
      return;
    } catch(e){ last=e; await new Promise(r=>setTimeout(r, Math.min(1000*Math.pow(2,i-1), 5000))); }
  }
  throw last || new Error(`Failed clicking ${selector}`);
}

async function clickByText(page, selector, includesText, timeout=8000){
  await page.waitForSelector(selector, { timeout });
  const ok = await page.$$eval(selector, (els, txt)=>{
    txt = txt.toLowerCase();
    for (const el of els) {
      const t = (el.innerText||el.textContent||"").toLowerCase();
      if (t.includes(txt)) { el.click(); return true; }
    }
    return false;
  }, includesText);
  if (!ok) throw new Error(`No ${selector} contains "${includesText}"`);
}

async function openPickupFinder(page){
  const tries = [
    "button[data-autom='rf-pickup-tab']",
    "button#rf-tab-pickup",
    "button[aria-controls*='pickup']",
    "button[data-autom='check-availability']",
    "a[data-autom='check-availability']"
  ];
  for (const sel of tries) { try { await smart_click_with_pause(page, sel, 800, 1); return; } catch {} }
  try { await clickByText(page, "button, a", "pick up"); return; } catch {}
  try { await clickByText(page, "button, a", "pickup"); return; } catch {}
  try { await clickByText(page, "button, a", "check availability"); return; } catch {}
  throw new Error("Could not open pickup UI");
}

async function searchCity(page, q){
  const sels = [
    "input[aria-label='Search for a store']",
    "input[type='search']",
    "input[placeholder*='city']",
    "input[placeholder*='ZIP']",
  ];
  for (const s of sels) {
    try {
      await page.waitForSelector(s, { timeout: 5000 });
      await page.click(s, { clickCount: 3 });
      await page.type(s, q);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      return;
    } catch {}
  }
  const any = await page.$("input");
  if (!any) throw new Error("No search input found");
  await any.click({ clickCount: 3 });
  await page.type("input", q);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
}

async function selectStore(page, matchers){
  const ok = await page.evaluate((matchers)=>{
    function n(s){ return (s||"").replace(/\s+/g,' ').trim().toLowerCase(); }
    const cards = Array.from(document.querySelectorAll("[data-autom*='store-card'], .rf-pickup-store, li, div")).filter(el=>{
      const t = n(el.innerText||el.textContent);
      return matchers.every(m=>t.includes(n(m)));
    });
    for (const card of cards) {
      const btn = Array.from(card.querySelectorAll("button, a")).find(b=>{
        const t = n(b.innerText||b.textContent);
        return t.includes("select") || t.includes("choose") || t.includes("pick up here") || t.includes("add to bag");
      });
      if (btn) { btn.click(); return true; }
    }
    return false;
  }, matchers);
  if (!ok) throw new Error("Store card / select button not found");
  await page.waitForTimeout(1200);
}

async function configure_iPhone16(page, colorChoice = "black") {
  // The iPhone 16 page has different data-autom keys; we click by text where necessary
  // Pick base iPhone 16 (not Plus)
  try { await smart_click_with_pause(page, "input[data-autom='dimensionScreensize6_1inch']", 0, 1); } catch {}
  // Color (fallback to text if needed)
  try { await clickByText(page, "label, button, span", colorChoice, 4000); } catch {}
  // 128GB default (or 256 if needed)
  const storageTries = [
    "input[data-autom='dimensionCapacity128gb']",
    "input[data-autom='dimensionCapacity256gb']"
  ];
  for (const s of storageTries) { try { await smart_click_with_pause(page, s, 0, 1); break; } catch {} }

  // No trade-in
  try { await smart_click_with_pause(page, "input[data-autom='choose-noTradeIn']", 500, 1); } catch {}
  // Full price
  try { await smart_click_with_pause(page, "input[data-autom='purchaseGroupOptionfullprice']", 800, 1); } catch {}
  // Unlocked
  try { await smart_click_with_pause(page, "input[data-autom='carrierModelUNLOCKED/US']", 800, 1); } catch {}
  // No AppleCare
  try { await smart_click_with_pause(page, "input[data-autom='noapplecare']", 500, 1); } catch {}
}

async function run(){
  const pickupKey = (await ask('Pickup store key (e.g., miami-brickell): ')).toLowerCase();
  if (!STORE_MAP[pickupKey]) {
    console.log("Unknown key. Options:\n - " + Object.keys(STORE_MAP).join("\n - "));
    process.exit(1);
  }
  rl.close();

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url_16, { waitUntil: 'domcontentloaded' });

  await configure_iPhone16(page);
  await openPickupFinder(page);
  await searchCity(page, STORE_MAP[pickupKey].citySearch);
  await selectStore(page, STORE_MAP[pickupKey].matchers);

  console.log(`✅ iPhone 16 pickup selected for "${pickupKey}". Stopping here.`);
  // await browser.close();
}
run();
