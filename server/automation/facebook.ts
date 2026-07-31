export async function publishToFacebook(page: any, content: string, localMediaPaths: string[]): Promise<void> {
  console.log(`[Automation] Navigating to Facebook home page...`);
  try {
    await page.goto("https://www.facebook.com/", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] Facebook navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  const currentUrl = page.url();
  if (currentUrl.includes("login") || currentUrl.includes("checkpoint") || currentUrl.includes("recover") || currentUrl.includes("unsupportedbrowser")) {
    throw new Error("Authentication failed: Facebook redirected to a login, security checkpoint, browser verification, or recovery page. Please refresh your session cookies.");
  }
  
  console.log(`[Automation] Clicking compose post trigger...`);
  await page.waitForSelector("div[role='button']", { timeout: 15000 });
  
  // 1. Locate and click the trigger box with translation-friendly handles
  let postTrigger = null;
  try {
    const buttons = await page.$$("div[role='button'], div[role='link']");
    for (const btn of buttons) {
      const text = await page.evaluate(new Function('el', 'return el.textContent || "";'), btn);
      if (text && (
        text.includes("What's on your mind") ||
        text.includes("Apa yang Anda pikirkan") ||
        text.includes("Apa yang dipikirkan") ||
        text.includes("pikirkan") ||
        text.includes("pensando") ||
        text.includes("piensas") ||
        text.includes("voulez-vous") ||
        text.includes("düşünüyorsun") ||
        text.includes("nghĩ gì") ||
        text.includes("isip mo") ||
        text.includes("بم تفكر") ||
        text.includes("Create a post") ||
        text.includes("Create post") ||
        text.includes("Buat postingan") ||
        text.includes("Buat Postingan") ||
        text.includes("Write something") ||
        text.includes("Tulis sesuatu")
      )) {
        postTrigger = btn;
        break;
      }
    }
  } catch (err) {
    console.error(`[Automation] Error finding trigger button with handle:`, err);
  }

  if (postTrigger) {
    console.log(`[Automation] Clicking compose post trigger using Puppeteer handle...`);
    await postTrigger.click();
  } else {
    console.log(`[Automation] Direct trigger text match with handle failed, executing evaluate click fallback...`);
    await page.evaluate(new Function(`
      const buttons = Array.from(document.querySelectorAll("div[role='button'], div[role='link']"));
      const postButton = buttons.find((b) => {
        const text = b.textContent || "";
        return (
          text.includes("What's on your mind") ||
          text.includes("Apa yang Anda pikirkan") ||
          text.includes("Apa yang dipikirkan") ||
          text.includes("pikirkan") ||
          text.includes("pensando") ||
          text.includes("piensas") ||
          text.includes("voulez-vous") ||
          text.includes("düşünüyorsun") ||
          text.includes("nghĩ gì") ||
          text.includes("isip mo") ||
          text.includes("بم تفكر") ||
          text.includes("Create a post") ||
          text.includes("Create post") ||
          text.includes("Buat postingan") ||
          text.includes("Buat Postingan") ||
          text.includes("Write something") ||
          text.includes("Tulis sesuatu")
        );
      });
      if (postButton) {
        postButton.click();
      }
    `));
  }
  
  await new Promise((r) => setTimeout(r, 3000));
  
  console.log(`[Automation] Locating Facebook compose textbox...`);
  // Use multi-selector fallback to find any active post editor text fields
  const fbEditorSelector = "div[role='textbox'], div[contenteditable='true'], [aria-label*='mind'], [aria-label*='pikirkan'], [aria-label*='thinking'], [aria-label*='post']";
  await page.waitForSelector(fbEditorSelector, { timeout: 15000 });
  
  console.log(`[Automation] Injecting post content...`);
  await page.focus(fbEditorSelector);
  await page.type(fbEditorSelector, content, { delay: 50 });
  
  await new Promise((r) => setTimeout(r, 1500));
  if (localMediaPaths.length > 0) {
    console.log(`[Automation] Uploading media requested. Attempting to click Photo/Video trigger button first...`);
    try {
      await page.evaluate(new Function(`
        const dialog = document.querySelector("div[role='dialog']");
        const parent = dialog || document;
        const elements = Array.from(parent.querySelectorAll("div, button, span, [role='button']"));
        const mediaBtn = elements.find((el) => {
          const text = el.textContent ? el.textContent.toLowerCase() : "";
          const ariaLabel = el.getAttribute("aria-label") ? el.getAttribute("aria-label").toLowerCase() : "";
          const isMatch = (
            text.includes("photo/video") ||
            text.includes("photo") ||
            text.includes("video") ||
            text.includes("foto/video") ||
            text.includes("foto") ||
            text.includes("media") ||
            ariaLabel.includes("photo") ||
            ariaLabel.includes("video") ||
            ariaLabel.includes("foto") ||
            ariaLabel.includes("media")
          );
          return isMatch;
        });
        if (mediaBtn) {
          const clickable = mediaBtn.closest("div[role='button']") || mediaBtn.closest("button") || mediaBtn;
          clickable.click();
          console.log("Clicked Facebook photo/video trigger button successfully");
        } else {
          console.log("Could not find Facebook photo/video trigger button via text scan");
        }
      `));
      await new Promise((r) => setTimeout(r, 3000));
    } catch (mediaBtnErr) {
      console.error(`[Automation] Error clicking Photo/Video trigger:`, mediaBtnErr);
    }

    console.log(`[Automation] Locating Facebook file input...`);
    let fileInput = null;
    const startFind = Date.now();
    while (Date.now() - startFind < 12000) {
      try {
        // Try to query file input inside the dialog first to avoid matching background/sidebar file inputs
        fileInput = await page.$("div[role='dialog'] input[type='file']");
        if (!fileInput) {
          // Try input with accept image/video
          fileInput = await page.$("input[type='file'][accept*='image'], input[type='file'][accept*='video']");
        }
        if (!fileInput) {
          // General fallback
          fileInput = await page.$("input[type='file']");
        }
        if (fileInput) {
          console.log(`[Automation] Successfully found Facebook file input!`);
          break;
        }
      } catch (err) {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (fileInput) {
      try {
        console.log(`[Automation] Uploading media to Facebook...`);
        await fileInput.uploadFile(...localMediaPaths);
        console.log(`[Automation] Uploaded file(s) to Facebook input, waiting for preview/thumbnail to process...`);
        await new Promise((r) => setTimeout(r, 6000));
      } catch (fbErr: any) {
        console.error(`[Automation] Error uploading file to Facebook input:`, fbErr.message || fbErr);
      }
    } else {
      console.error(`[Automation] Could not find any file input element on Facebook within timeout.`);
    }
  }
  
  // Wait for the publish button to become enabled (signaling that the media upload is finished)
  if (localMediaPaths.length > 0) {
    console.log(`[Automation] Waiting for Facebook Post button to be enabled (upload finished)...`);
    const readyStart = Date.now();
    while (Date.now() - readyStart < 15000) {
      const disabledStatus = await page.evaluate(new Function(`
        const dialog = document.querySelector("div[role='dialog']");
        const parent = dialog || document;
        const buttons = Array.from(parent.querySelectorAll("div[role='button']"));
        const publishButton = buttons.find((b) => {
          const text = b.textContent ? b.textContent.trim() : "";
          return (
            text === "Post" ||
            text === "Posting" ||
            text === "Kirim" ||
            text === "Bagikan" ||
            text === "Publicar" ||
            text === "Publier" ||
            text === "Share" ||
            text === "Publish" ||
            text.includes("Post") ||
            text.includes("Posting") ||
            text.includes("Kirim")
          );
        });
        if (publishButton) {
          return publishButton.getAttribute("aria-disabled") === "true";
        }
        return true;
      `));
      if (!disabledStatus) {
        console.log(`[Automation] Facebook Post button is now enabled!`);
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`[Automation] Locating and clicking Post/Publish button...`);
  const clickPublishButton = async () => {
    return await page.evaluate(new Function(`
      const dialog = document.querySelector("div[role='dialog']");
      const parent = dialog || document;
      const buttons = Array.from(parent.querySelectorAll("div[role='button']"));
      const publishButton = buttons.find((b) => {
        const text = b.textContent ? b.textContent.trim() : "";
        const isMatch = (
          text === "Post" ||
          text === "Posting" ||
          text === "Kirim" ||
          text === "Bagikan" ||
          text === "Publicar" ||
          text === "Publier" ||
          text === "Share" ||
          text === "Publish" ||
          text.includes("Post") ||
          text.includes("Posting") ||
          text.includes("Kirim")
        );
        return isMatch;
      });
      if (publishButton) {
        // Remove disabled attribute if present to ensure the click goes through
        const isDisabled = publishButton.getAttribute("aria-disabled") === "true";
        if (isDisabled) {
          publishButton.removeAttribute("aria-disabled");
          publishButton.setAttribute("aria-disabled", "false");
        }
        publishButton.click();
        return true;
      }
      return false;
    `));
  };

  let clicked = await clickPublishButton();
  if (!clicked) {
    console.log(`[Automation] Target-based click failed. Trying general selectors...`);
    try {
      const buttons = await page.$$("div[role='dialog'] div[role='button']");
      for (const btn of buttons) {
        const text = await page.evaluate(new Function('el', 'return el.textContent ? el.textContent.trim() : "";'), btn);
        if (text && (
          text === "Post" ||
          text === "Posting" ||
          text === "Publish" ||
          text === "Kirim" ||
          text.includes("Post") ||
          text.includes("Posting")
        )) {
          await btn.click();
          clicked = true;
          break;
        }
      }
    } catch (e) {
      console.error(`[Automation] General selectors click error:`, e);
    }
  }

  console.log(`[Automation] Waiting to verify Facebook post publication...`);
  await new Promise((r) => setTimeout(r, 6000));

  let dialogOpen = await page.evaluate(new Function('return !!document.querySelector("div[role=\'dialog\']");'));
  if (dialogOpen) {
    console.log(`[Automation] Composer dialog is still open. Trying to trigger Post/Publish button again...`);
    await clickPublishButton();
    await new Promise((r) => setTimeout(r, 6000));
    dialogOpen = await page.evaluate(new Function('return !!document.querySelector("div[role=\'dialog\']");'));
  }

  if (dialogOpen) {
    throw new Error("Facebook compose dialog failed to close. The post may be incomplete, blocked, or the Post button was unresponsive.");
  }
  
  console.log(`[Automation] ✅ Successfully published to Facebook (composer closed)`);
}
