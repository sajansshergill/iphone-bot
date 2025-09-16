// stanley_to_payment_puppeteer.js
// Run: npm i puppeteer
// then: node stanley_to_payment_puppeteer.js
import puppeteer from "puppeteer";

const PRODUCT_URL = "https://www.stanley1913.com/products/the-quencher-h2-0-flowstate%E2%84%A2-tumbler-40-oz-sale?variant=53972968243560";
const VARIANT_ID  = "53972968243560";
const QTY = 1;

const customer = {
  email: "sajansshergill@gmail.com",
  first: "Sajan",
  last: "Shergill",
  address1: "123 Ann St",
  address2: "Apt 4B",
  city: "Valley Stream",
  province: "New York",     // must match dropdown text/value
  country: "United States", // must match dropdown text/value
  zip: "11580",
  phone: "5513584302",
};

const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

async function typeAny(page, selectors, value) {
  for (const s of selectors) {
    try {
      await page.waitForSelector(s, { timeout: 3000 });
      await page.focus(s);
      await page.evaluate(sel => { const n = document.querySelector(sel); if (n) n.value=""; }, s); //evaluate clear
      await page.type(s, value, { delay: 15 });
      return true;
    } catch {}
  }
  return false;
}

async function selectAny(page, selectors, value) {
  for (const s of selectors) {
    try {
      await page.waitForSelector(s, { timeout: 3000 });
      // evaluate the below code in page context
      // try native select
      const ok = await page.evaluate((sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const opts = Array.from(el.options||[]);
        const byText = opts.find(o => (o.text||"").trim().toLowerCase() === val.toLowerCase());
        const byVal  = opts.find(o => (o.value||"").trim().toLowerCase() === val.toLowerCase());
        const pick = byText || byVal;
        if (!pick) return false;
        el.value = pick.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, s, value);
      if (ok) return true;
    } catch {}
  }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });
  const [page] = await browser.pages();

  // 1) Load the product page
  await page.goto(PRODUCT_URL, { waitUntil: "networkidle2", timeout: 90000 }); //no need of waitUntil, evaluate this 
  //no need of try
  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", { timeout: 4000 });
    await page.click("#onetrust-accept-btn-handler");
  } catch {}
  console.log("✅ Product page open");

///

  // 2) Add to cart (fast) via in-page fetch
  const add = await page.evaluate(async ({ id, qty }) => {
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ id: String(id), quantity: qty })
    });
    const data = await res.json().catch(()=> ({}));
    return { status: res.status, title: data?.title || "" };
  }, { id: VARIANT_ID, qty: QTY });
  console.log("🛒 Add-to-cart:", add.status, add.title);

  // 3) Go straight to checkout; ask to skip Shop Pay
  await page.goto("https://www.stanley1913.com/checkout?skip_shop_pay=true&locale=en-US",
                  { waitUntil: "networkidle2", timeout: 90000 });
  console.log("➡️  Checkout opened:", page.url());

  // 4) Fill contact + shipping (selectors can vary per theme)
  await typeAny(page, ["#checkout_email","input#email","input[name='checkout[email]']"], customer.email);
  await typeAny(page, ["#checkout_shipping_address_first_name","input#TextField0","input[name='checkout[shipping_address][first_name]']"], customer.first);
  await typeAny(page, ["#checkout_shipping_address_last_name","input#TextField1","input[name='checkout[shipping_address][last_name]']"], customer.last);
  await typeAny(page, ["#checkout_shipping_address_address1","input#shipping-address1","input[name='checkout[shipping_address][address1]']"], customer.address1);
  await typeAny(page, ["#checkout_shipping_address_address2","input#TextField3","input[name='checkout[shipping_address][address2]']"], customer.address2);
  await typeAny(page, ["#checkout_shipping_address_city","input#TextField4","input[name='checkout[shipping_address][city]']"], customer.city);
  await selectAny(page, ["#checkout_shipping_address_country","select[name='checkout[shipping_address][country]']"], customer.country);
  await selectAny(page, ["#checkout_shipping_address_province","select#Select1","select[name='checkout[shipping_address][province]']"], customer.province);
  await typeAny(page, ["#checkout_shipping_address_zip","input#TextField5","input[name='checkout[shipping_address][zip]']"], customer.zip);
  await typeAny(page, ["#checkout_shipping_address_phone","input[name='checkout[shipping_address][phone]']","input[name='phone']"], customer.phone);
  console.log("📦 Shipping form filled");

  // 5) Continue to shipping method (submit contact step)
  try {
    await page.waitForSelector("button[type='submit'], button[name='button']", { timeout: 12000 });
    await Promise.all([
      page.click("button[type='submit'], button[name='button']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 })
    ]);
  } catch(e) { console.log("ℹ️ First continue click skipped:", e.message); }

  // Some themes need the submit twice (contact -> address validation -> shipping)
  if (!/shipping/i.test(page.url()) && !/payment/i.test(page.url())) {
    try {
      await Promise.all([
        page.click("button[type='submit'], button[name='button']"),
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 })
      ]);
    } catch {}
  }
  console.log("🧭 After contact submit:", page.url());

  // 6) Choose first shipping rate (if needed) and continue to payment
  if (!/payment/i.test(page.url())) {
    try {
      // sometimes rates render lazy; give it a moment
      try { await page.waitForSelector("input[name='checkout[shipping_rate][id]']", { timeout: 12000 }); }
      catch { await wait(1500); }
      const hadRate = await page.$("input[name='checkout[shipping_rate][id]']");
      if (hadRate) {
        await page.evaluate(() => {
          const el = document.querySelector("input[name='checkout[shipping_rate][id]']");
          if (el) el.click();
        });
        await wait(400);
      }
      await Promise.all([
        page.click("button[type='submit'], button[name='button']"),
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 })
      ]);
    } catch (e) {
      // many stores auto-advance without explicit shipping selection
      console.log("ℹ️ Shipping selection step skipped/auto-advanced:", e.message);
    }
  }

  // 7) Done: should be on payment step now
  console.log("✅ Final URL:", page.url());
  if (/payment/i.test(page.url())) {
    console.log("✅ Landed on PAYMENT. (Do NOT script card entry.)");
  } else {
    console.log("ℹ️ Not on payment yet—tell me what you see, I’ll tune selectors for your theme.");
  }
})();


// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());

// const PRODUCT_URL = "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-30-oz?variant=53972718780776"

// var cookies = "";

// async function givePage(){
//     const browser = await puppeteer.launch({headless: false});
//     const page = await browser.newPage();
//     return page;
// }

// async function parseCookies(page){
//     const cookies = await page.cookies();
//     let cookieList = "";
//     for(let i = 0; i < cookies.length; i++){
//         let cookie = cookies[i];
//         let cookieString = cookie.name + "=" + cookie.value;
//         if(i != (cookies.length - 1)){
//             cookieString = cookieString + "; ";
//         }
//         cookieList = cookieList + cookieString;
//     }
//     console.log(cookieList);
//     return cookieList;
// }

// async function add_to_cart(page){
//     await page.waitForSelector('button[name="add"]');
//     cookies = await parseCookies(page);

//     const ID = await page.evaluate(() => {
//         return document.querySelector("input[name='id']").getAttribute("value");
//     })

//     const sectionID = await page.evaluate(() => {
//         return document.querySelector("input[name='section-id']").getAttribute("value");
//     })

//     const prodID = await page.evaluate(() => {
//         return document.querySelector("input[name='product-id']").getAttribute("value");
//     })

//     await page.evaluate( async (cookies, PRODUCT_URL, ID, sectionID, prodID) => {
//         let response = await fetch("https://www.stanley1913.com/cart/add", {
//             "headers": {
//             "accept": "application/javascript",
//             "content-type": "multipart/form-data; boundary=----WebKitFormBoundaryXXtAjYliOTrIf4da",
//             "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"",
//             "sec-ch-ua-mobile": "?0",
//             "sec-ch-ua-platform": "\"macOS\"",
//             "x-requested-with": "XMLHttpRequest",
//             "cookie": cookies,
//             "Referer": PRODUCT_URL,
//             "Referrer-Policy": "strict-origin-when-cross-origin"
//             },
//             "body": `------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"form_type\"\r\n\r\nproduct\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"utf8\"\r\n\r\n✓\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"id\"\r\n\r\n${ID}\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"properties[Shipping]\"\r\n\r\n\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"product-id\"\r\n\r\n${prodID}\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"section-id\"\r\n\r\n${sectionID}\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"quantity\"\r\n\r\n1\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"sections\"\r\n\r\ncart-notification-product,cart-notification-button,cart-icon-bubble\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da\r\nContent-Disposition: form-data; name=\"sections_url\"\r\n\r\n/products/clean-slate-quencher-h20-flowstate-tumbler-30-oz-soft-rain\r\n------WebKitFormBoundaryXXtAjYliOTrIf4da--\r\n`,
//             "method": "POST"
//         });
//     }, cookies, PRODUCT_URL, ID, sectionID, prodID);

// }

// async function get_shipping_token(page){
//     let response = await page.evaluate(async (cookies, PRODUCT_URL) => {
//             let response = await fetch("https://www.stanley1913.com/cart.js", {
//                 "headers": {
//                   "accept": "*/*",
//                   "accept-language": "en-US,en;q=0.9",
//                   "priority": "u=1, i",
//                   "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"",
//                   "sec-ch-ua-mobile": "?0",
//                   "sec-ch-ua-platform": "\"macOS\"",
//                   "sec-fetch-dest": "empty",
//                   "sec-fetch-mode": "cors",
//                   "sec-fetch-site": "same-origin",
//                   "cookie": cookies,
//                   "Referer": PRODUCT_URL,
//                   "Referrer-Policy": "strict-origin-when-cross-origin"
//                 },
//                 "body": null,
//                 "method": "GET"
//               });

//             response = await response.json();
//             return response;
//     }, cookies, PRODUCT_URL);

    
//     let token = response.token.split("?")[0];
//     console.log(token)
//     let shipping_url = "https://www.stanley1913.com/checkouts/cn/" + token + "/information"
//     await page.goto(shipping_url)
// }

// async function run(){
//     const page = await givePage();
//     await page.goto(PRODUCT_URL);
//     await add_to_cart(page);
//     await get_shipping_token(page);
//     console.log('Done');
// }

// run();