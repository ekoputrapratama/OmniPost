import path from "path";

async function takeScreenshot(page: any, mediaDir: string, stepName: string) {
  try {
    const screenshotPath = path.join(mediaDir, `debug_twitter_${stepName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`[Automation] Debug screenshot saved to ${screenshotPath}. Accessible at /media/debug_twitter_${stepName}.png`);
  } catch (err: any) {
    console.error(`[Automation] Failed to take debug screenshot for ${stepName}:`, err.message);
  }
}

export async function publishToTwitter(page: any, content: string, localMediaPaths: string[], mediaDir: string): Promise<void> {
  console.log(`[Automation] Navigating to X/Twitter compose page...`);
  try {
    await page.goto("https://x.com/compose/post", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] X/Twitter navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  await takeScreenshot(page, mediaDir, "1_navigated");

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
  await takeScreenshot(page, mediaDir, "2_content_injected");

  if (localMediaPaths.length > 0) {
    console.log(`[Automation] Locating Twitter file input element...`);
    const fileInputSelector = 'input[type="file"][data-testid="fileInput"], input[type="file"]';
    try {
      await page.waitForSelector(fileInputSelector, { timeout: 10000 });
      const fileInput = await page.$(fileInputSelector);
      if (fileInput) {
        console.log(`[Automation] Uploading ${localMediaPaths.length} media files to Twitter...`);
        await fileInput.uploadFile(...localMediaPaths);
        await new Promise((r) => setTimeout(r, 5000));
        await takeScreenshot(page, mediaDir, "3_media_uploaded");
      } else {
        console.error(`[Automation] Twitter file input element not found!`);
      }
    } catch (err) {
      console.error(`[Automation] Twitter media upload selector/action failed:`, err);
    }
  }
  
  console.log(`[Automation] Locating publish button...`);
  const buttonSelector = '[data-testid="tweetButton"], [data-testid="tweetButtonInline"], div[role="button"][data-testid="tweetButtonInline"]';
  await page.waitForSelector(buttonSelector, { timeout: 10000 });

  if (localMediaPaths.length > 0) {
    console.log(`[Automation] Media uploaded. Waiting for X/Twitter upload processing to complete (checking button disabled state)...`);
    // Wait for the button to be enabled (aria-disabled !== "true"). 
    // We poll every 2 seconds for up to 90 seconds.
    let isReady = false;
    for (let attempt = 1; attempt <= 45; attempt++) {
      const isDisabled = await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (!btn) return true;
        return btn.getAttribute("aria-disabled") === "true";
      }, buttonSelector);

      if (!isDisabled) {
        console.log(`[Automation] X/Twitter publish button is now active (aria-disabled != true)! Upload/processing complete.`);
        isReady = true;
        break;
      }

      console.log(`[Automation] Publish button is disabled (uploading/processing)... attempt ${attempt}/45`);
      await new Promise((r) => setTimeout(r, 2000));
      if (attempt % 5 === 0) {
        await takeScreenshot(page, mediaDir, `upload_progress_attempt_${attempt}`);
      }
    }
    if (!isReady) {
      console.warn(`[Automation] Warning: X/Twitter publish button remained disabled after 90 seconds. Proceeding to click anyway.`);
    }
  }
  
  await takeScreenshot(page, mediaDir, "4_before_publish");

  console.log(`[Automation] Clicking Post button...`);
  await page.click(buttonSelector);
  
  await new Promise((r) => setTimeout(r, 4000));
  await takeScreenshot(page, mediaDir, "5_final_result");
  console.log(`[Automation] ✅ Successfully published to Twitter/X`);
}
