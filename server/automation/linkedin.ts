import path from "path";

async function takeScreenshot(page: any, mediaDir: string, stepName: string) {
  try {
    const screenshotPath = path.join(mediaDir, `debug_linkedin_${stepName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`[Automation] Debug screenshot saved to ${screenshotPath}. Accessible at /media/debug_linkedin_${stepName}.png`);
  } catch (err: any) {
    console.error(`[Automation] Failed to take debug screenshot for ${stepName}:`, err.message);
  }
}

export async function publishToLinkedIn(page: any, content: string, localMediaPaths: string[], mediaDir: string): Promise<void> {
  console.log(`[Automation] Navigating to LinkedIn feed page...`);
  try {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] LinkedIn navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  await takeScreenshot(page, mediaDir, "1_initial_feed");
  
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("signup") || currentUrl.includes("checkpoint") || currentUrl.includes("signup-wall")) {
    await takeScreenshot(page, mediaDir, "checkpoint_or_login");
    throw new Error("Authentication failed: LinkedIn redirected to a login, signup, or security checkpoint page. Please refresh your session cookies.");
  }
  
  console.log(`[Automation] Clicking "Start a post" trigger...`);
  const triggerSelector = "button.share-box-feed-entry__trigger, .share-box-feed-entry__trigger, button.share-box-trigger, .share-box-trigger, button.share-box__trigger, [data-control-name='share_box'], .share-box-feed-entry__trigger-text";
  
  let triggerClicked = false;
  try {
    await page.waitForSelector(triggerSelector, { timeout: 15000 });
    const triggerElements = await page.$$(triggerSelector);
    if (triggerElements.length > 0) {
      console.log(`[Automation] Found trigger element using selector, clicking...`);
      await triggerElements[0].click();
      triggerClicked = true;
    }
  } catch (err) {
    console.warn(`[Automation] Target selector not found or click timed out:`, err);
  }

  if (!triggerClicked) {
    console.log(`[Automation] Selector-based wait failed. Attempting text-based trigger search via evaluate...`);
    triggerClicked = await page.evaluate(new Function(`
      const elements = Array.from(document.querySelectorAll("button, div[role='button'], span, p"));
      const trigger = elements.find((el) => {
        const text = el.textContent ? el.textContent.toLowerCase() : "";
        const isTargetText = 
          text.includes("start a post") ||
          text.includes("mulai postingan") ||
          text.includes("buat postingan") ||
          text.includes("write something") ||
          text.includes("crear publicación") ||
          text.includes("crear publicacion") ||
          text.includes("commencer un post") ||
          text.includes("beitrag erstellen") ||
          text.includes("criar publicação") ||
          text.includes("criar publicacao") ||
          text.includes("share an update") ||
          text.includes("what's on your mind");
        
        const isTargetClass = el.className && typeof el.className === "string" && (
          el.className.includes("share-box-feed-entry") ||
          el.className.includes("share-box-trigger") ||
          el.className.includes("share-box__trigger")
        );

        return isTargetText || isTargetClass;
      });

      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    `));
  }

  if (!triggerClicked) {
    console.warn(`[Automation] Text-based trigger click fell back, waiting anyway...`);
    try {
      await page.click("button.share-box-feed-entry__trigger");
      triggerClicked = true;
    } catch (desperateErr) {
      console.error(`[Automation] Final fallback trigger click failed:`, desperateErr);
    }
  }
  
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(page, mediaDir, "2_after_trigger_click");
  
  console.log(`[Automation] Locating editor textbox...`);
  const editorSelector = "div.ql-editor, div[role='textbox']";
  await page.waitForSelector(editorSelector, { timeout: 10000 });
  
  await takeScreenshot(page, mediaDir, "3_editor_located");
  
  console.log(`[Automation] Injecting post content...`);
  await page.focus(editorSelector);
  await page.type(editorSelector, content, { delay: 50 });
  
  await new Promise((r) => setTimeout(r, 1500));
  await takeScreenshot(page, mediaDir, "4_after_text_injection");

  if (localMediaPaths.length > 0) {
    await takeScreenshot(page, mediaDir, "5_before_media_upload");
    console.log(`[Automation] Locating LinkedIn file input...`);
    const liFileInputSelector = 'input[type="file"]';
    try {
      await page.waitForSelector(liFileInputSelector, { timeout: 10000 });
      const fileInput = await page.$(liFileInputSelector);
      if (fileInput) {
        console.log(`[Automation] Uploading media to LinkedIn...`);
        await fileInput.uploadFile(...localMediaPaths);
        await new Promise((r) => setTimeout(r, 4000));
        await takeScreenshot(page, mediaDir, "6_after_media_upload");
      }
    } catch (liErr) {
      console.error(`[Automation] Could not find or use file input on LinkedIn:`, liErr);
    }
  }
  
  await takeScreenshot(page, mediaDir, "7_before_post_click");
  
  console.log(`[Automation] Locating and clicking LinkedIn Post button...`);
  const postBtnSelector = "button.share-actions__primary-action, button.artdeco-button--primary, button[id^='ember']";
  
  let liClicked = false;
  try {
    await page.waitForSelector(postBtnSelector, { timeout: 10000 });
    const buttons = await page.$$(postBtnSelector);
    for (const btn of buttons) {
      const text = await page.evaluate(new Function('el', 'return el.textContent ? el.textContent.trim().toLowerCase() : "";'), btn);
      if (text && (text === "post" || text === "publish" || text.includes("post") || text.includes("publish"))) {
        console.log(`[Automation] Clicking LinkedIn Post button via matched handle...`);
        await btn.click();
        liClicked = true;
        break;
      }
    }
  } catch (err) {
    console.warn(`[Automation] Error finding LinkedIn Post button by handle/text:`, err);
  }

  if (!liClicked) {
    console.log(`[Automation] Direct handle click failed or not found, attempting general element click fallback...`);
    liClicked = await page.evaluate(new Function(`
      const buttons = Array.from(document.querySelectorAll("button"));
      const postButton = buttons.find((b) => {
        const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
        const matchesClass = b.classList.contains("share-actions__primary-action") || b.classList.contains("artdeco-button--primary");
        const matchesText = text === "post" || text === "publish" || text.includes("post");
        return matchesClass || matchesText;
      });
      if (postButton) {
        postButton.click();
        return true;
      }
      return false;
    `));
  }
  
  if (!liClicked) {
    console.warn(`[Automation] Post button not explicitly triggered, trying blind click on first matching selector...`);
    try {
      await page.click("button.share-actions__primary-action");
    } catch (blindErr) {
      console.error(`[Automation] Blind click failed:`, blindErr);
    }
  }
  
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(page, mediaDir, "8_after_post_click");
  
  await new Promise((r) => setTimeout(r, 4000));
  console.log(`[Automation] ✅ Successfully published to LinkedIn`);
}
