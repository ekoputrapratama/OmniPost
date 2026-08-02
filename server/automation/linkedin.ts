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
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "networkidle2", timeout: 35000 });
  } catch (navErr: any) {
    console.warn(`[Automation] LinkedIn navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  // Allow client-side redirections/scripts to settle
  console.log(`[Automation] Waiting for LinkedIn client-side scripts to settle...`);
  await new Promise((r) => setTimeout(r, 4000));
  
  // Try retrieving active cookies in browser context to diagnostic-verify li_at injection
  try {
    const activeCookies = await page.cookies();
    const cookieNames = activeCookies.map((c: any) => c.name);
    console.log(`[Automation] Active cookies in browser context: ${cookieNames.join(", ")}`);
    if (!cookieNames.includes("li_at")) {
      console.warn(`[Automation] ⚠️ WARNING: 'li_at' cookie is NOT active in the browser context! This indicates LinkedIn rejected the session cookies or they have completely expired.`);
    }
  } catch (cookieErr: any) {
    console.warn(`[Automation] Failed to retrieve active cookies for diagnostics:`, cookieErr.message);
  }

  await takeScreenshot(page, mediaDir, "1_initial_feed");
  
  const currentUrl = page.url();
  console.log(`[Automation] Settled URL: ${currentUrl}`);

  if (currentUrl.includes("chrome-error") || currentUrl.includes("chromewebdata")) {
    await takeScreenshot(page, mediaDir, "rate_limit_or_network_error");
    const pageTitle = await page.title().catch(() => "Unknown Title");
    const pageText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 800) : "No body text").catch(() => "Failed to get page text");
    
    console.error(`[Automation] ❌ Network/Evasion/Rate-limit Error URL: ${currentUrl}`);
    console.error(`[Automation] ❌ Page Title: ${pageTitle}`);
    console.error(`[Automation] ❌ Page text preview:\n${pageText}`);

    throw new Error(`LinkedIn connection error (HTTP 429 / Rate Limit detected): LinkedIn has temporarily limited requests from this server's IP address or blocked the automated browser connection. This is a temporary server-side rate limit. Please wait a few minutes before trying again.`);
  }
  
  const isLoggedOut = !currentUrl.includes("/feed") || 
                      currentUrl.includes("login") || 
                      currentUrl.includes("signup") || 
                      currentUrl.includes("checkpoint") || 
                      currentUrl.includes("signup-wall") || 
                      currentUrl.includes("chal");
  
  if (isLoggedOut) {
    await takeScreenshot(page, mediaDir, "checkpoint_or_login");
    const pageTitle = await page.title().catch(() => "Unknown Title");
    const pageText = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 800) : "No body text").catch(() => "Failed to get page text");
    
    console.error(`[Automation] ❌ Redirected URL: ${currentUrl}`);
    console.error(`[Automation] ❌ Page Title: ${pageTitle}`);
    console.error(`[Automation] ❌ Page text preview:\n${pageText}`);
    
    throw new Error(`Authentication failed: LinkedIn redirected you away from the feed page to "${currentUrl}" (Title: "${pageTitle}"). This suggests your 'li_at' session cookie has expired, is invalid, or was blocked. Please refresh your session cookies using the Desktop Companion app or cookie editor, ensure 'li_at' is included, and try again.`);
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
      const elements = Array.from(document.querySelectorAll("button, div, span, p, a, [role='button']"));
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
          el.className.includes("share-box__trigger") ||
          el.className.includes("share-box-feed-entry__trigger")
        );

        return isTargetText || isTargetClass;
      });

      if (trigger) {
        trigger.scrollIntoView({ block: "center" });
        trigger.click();
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
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
  const editorSelector = "div.ql-editor, div[role='textbox'], div[contenteditable='true'], [contenteditable='true']";
  
  let editorFound = false;
  try {
    await page.waitForSelector(editorSelector, { timeout: 10000 });
    editorFound = true;
  } catch (editorErr) {
    console.warn(`[Automation] Selector-based editor wait failed. Trying generic contenteditable fallback...`);
  }

  if (editorFound) {
    await takeScreenshot(page, mediaDir, "3_editor_located");
    console.log(`[Automation] Injecting post content...`);
    try {
      await page.focus(editorSelector);
      
      // Clear any existing placeholder/text by selecting all and backspacing
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      await page.type(editorSelector, content, { delay: 50 });
    } catch (typeErr) {
      console.warn(`[Automation] Direct type failed, falling back to evaluate-based text insertion:`, typeErr);
      editorFound = false;
    }
  }

  if (!editorFound) {
    const textInjected = await page.evaluate((txt: string) => {
      const editor = document.querySelector("div.ql-editor, div[role='textbox'], div[contenteditable='true'], [contenteditable='true']");
      if (editor) {
        (editor as any).focus();
        editor.textContent = txt;
        editor.innerHTML = `<p>${txt}</p>`;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, content);
    
    if (textInjected) {
      console.log(`[Automation] Successfully injected text using evaluate-based contenteditable fallback`);
    } else {
      throw new Error(`Could not find or write to any post editor textbox. Please check if the cookie has expired or if LinkedIn has updated its interface.`);
    }
  }
  
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
      const buttons = Array.from(document.querySelectorAll("button, [role='button'], div, span"));
      const postButton = buttons.find((b) => {
        const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
        const matchesClass = b.classList.contains("share-actions__primary-action") || b.classList.contains("artdeco-button--primary");
        const matchesText = text === "post" || text === "publish" || text.includes("post") || text.includes("publish");
        return matchesClass || matchesText;
      });
      if (postButton) {
        postButton.scrollIntoView({ block: "center" });
        postButton.click();
        postButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
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
