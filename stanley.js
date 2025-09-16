const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const product_url = "https://www.stanley1913.com/products/the-quencher-h2-0-flowstate%E2%84%A2-tumbler-40-oz-sale?variant=53972968243560";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function givePage() {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  return { browser, page };
}

async function addToCart(page) {
  console.log("🔗 Navigating to product...");
  await page.goto(product_url, { waitUntil: 'domcontentloaded' });

  try {
    await page.click("#onetrust-accept-btn-handler");
  } catch {}

  await page.waitForSelector("button[id^='ProductSubmitButton']", { visible: true });
  await page.click("button[id^='ProductSubmitButton']");
  await delay(2000);
}

async function goToCheckout(browser, page) {
  console.log("🛒 Going to checkout...");

  const pagesBefore = await browser.pages();

  await page.waitForSelector("button.c-btn.c-btn--dark.u-full.cart__checkout", { visible: true });

  // Start navigation & monitor new page (if any)
  await Promise.all([
    page.click("button.c-btn.c-btn--dark.u-full.cart__checkout"),
    delay(2000),
  ]);

  let newPage;
  const pagesAfter = await browser.pages();

  // Look for new tab or fallback to same page
  newPage = pagesAfter.find(p => !pagesBefore.includes(p)) || page;

  try {
    await newPage.bringToFront();
    await newPage.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 });
    console.log("✅ Checkout page loaded.");
  } catch (err) {
    console.log("⚠️ Possibly inline redirect. Continuing on same page...");
  }

  return newPage;
}

async function fillBilling(page) {
  console.log("📝 Filling billing form...");

  await page.type("input[id='email']", 'test@gmail.com');
  await delay(500);
  // Uncheck "Email me with news and offers" checkbox if it's selected
  try {
    await page.waitForSelector("input[name='checkout[buyer_accepts_marketing]']", { visible: true });
    const isChecked = await page.$eval("input[name='checkout[buyer_accepts_marketing]']", el => el.checked);

    if (isChecked) {
      await page.click("input[name='checkout[buyer_accepts_marketing]']");
      console.log("📭 Unchecked 'Email me with news and offers'");
    } else {
      console.log("✅ Checkbox was already unchecked");
    }
  } catch (e) {
    console.log("⚠️ Could not find the marketing checkbox:", e.message);
  }

  await page.type("input[id='TextField0']", 'Sajan');
  await page.type("input[id='TextField1']", 'Shergill');
  await delay(500);
  await page.type("input[id='shipping-address1']", 'Corbin Avenue Jersey City');
  await delay(500);
  await page.type("input[id='TextField3']", 'Apartment 1000');
  await page.type("input[id='TextField4']", 'Jersey City');
  await delay(500);
  await page.type("input[id='TextField5']", '07306');
  await page.type("input[id='TextField6']", '5513584302');

  try {
    await page.waitForSelector("button[type='submit']", { visible: true });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button[type="submit"]')];
        const target = buttons.find(btn => btn.innerText.includes('Continue to shipping'));
        if (target) target.click();
      }),
    ]);
    console.log("✅ Clicked 'Continue to shipping' and navigated.");
  } catch (e) {
    console.log("❌ Failed at 'Continue to shipping':", e.message);
  }
}

async function fillBillingContinue(page) {
  console.log("➡️ Attempting to click 'Continue to payment'...");

  try {
    await page.waitForSelector("button[type='submit']", { visible: true, timeout: 10000 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click("button[type='submit']"),
    ]);
    console.log("✅ Clicked 'Continue to payment' and navigated.");
  } catch (e) {
    console.log("❌ Error at 'Continue to payment':", e.message);
  }
}

async function cardDetails(page) {
  console.log("💳 Typing card info...");

  try {
    await page.waitForSelector('input[id="number"]', { visible: true });
    await page.type('input[id="number"]', '4242424242424242');
    await page.type('input[id="expiry"]', '0329');
    await page.type('input[id="verification_value"]', '321');
    await page.type('input[name="name"]', 'Sajan Shergill');

    await page.waitForSelector('button[type="submit"]', { visible: true });
    await page.click('button[type="submit"]');

    console.log("✅ Payment form submitted.");
  } catch (e) {
    console.log("❌ Failed to fill payment:", e.message);
  }
}

async function checkout() {
  const { browser, page } = await givePage();
  await addToCart(page);
  const checkoutPage = await goToCheckout(browser, page);
  await fillBilling(checkoutPage);
  await fillBillingContinue(checkoutPage);
  await cardDetails(checkoutPage);

  // Close the browser or keep it open for debugging
  // await browser.close();
}

checkout();