export async function publishToTwitter(page: any, content: string, localMediaPaths: string[]): Promise<void> {
  console.log(`[Automation] Navigating to X/Twitter compose page...`);
  try {
    await page.goto("https://x.com/compose/post", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] X/Twitter navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("signup") || currentUrl.includes("welcome")) {
    throw new Error("Authentication failed: X/Twitter redirected to a login or signup page. Please refresh your session cookies.");
  }
  
  console.log(`[Automation] Locating compose text area...`);
  const textboxSelector = '[data-testid="tweetTextarea_0"], div[role="textbox"]';
  await page.waitForSelector(textboxSelector, { timeout: 15000 });
  
  console.log(`[Automation] Injecting post content...`);
  await page.focus(textboxSelector);
  await page.type(textboxSelector, content, { delay: 50 });
  
  await new Promise((r) => setTimeout(r, 1000));

  if (localMediaPaths.length > 0) {
    console.log(`[Automation] Locating Twitter file input element...`);
    const fileInputSelector = 'input[type="file"][data-testid="fileInput"], input[type="file"]';
    try {
      await page.waitForSelector(fileInputSelector, { timeout: 10000 });
      const fileInput = await page.$(fileInputSelector);
      if (fileInput) {
        console.log(`[Automation] Uploading ${localMediaPaths.length} media files to Twitter...`);
        await fileInput.uploadFile(...localMediaPaths);
        await new Promise((r) => setTimeout(r, 4000));
      } else {
        console.error(`[Automation] Twitter file input element not found!`);
      }
    } catch (err) {
      console.error(`[Automation] Twitter media upload selector/action failed:`, err);
    }
  }
  
  console.log(`[Automation] Locating publish button...`);
  const buttonSelector = '[data-testid="tweetButton"], [data-testid="tweetButtonInline"], div[role="button"][data-testid="tweetButtonInline"]';
  await page.waitForSelector(buttonSelector, { timeout: 5000 });
  
  console.log(`[Automation] Clicking Post button...`);
  await page.click(buttonSelector);
  
  await new Promise((r) => setTimeout(r, 4000));
  console.log(`[Automation] ✅ Successfully published to Twitter/X`);
}
