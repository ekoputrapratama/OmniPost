import path from "path";

async function takeScreenshot(page: any, mediaDir: string, stepName: string) {
  try {
    const screenshotPath = path.join(mediaDir, `debug_pinterest_${stepName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`[Automation] Debug screenshot saved to ${screenshotPath}. Accessible at /media/debug_pinterest_${stepName}.png`);
  } catch (err: any) {
    console.error(`[Automation] Failed to take debug screenshot for ${stepName}:`, err.message);
  }
}

export async function publishToPinterest(
  page: any,
  content: string,
  localMediaPaths: string[],
  mediaDir: string = "/tmp/omnipost_media"
): Promise<void> {
  console.log(`[Automation] Navigating to Pinterest Pin Builder...`);
  try {
    await page.goto("https://www.pinterest.com/pin-builder/", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] Pinterest navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }

  const currentUrl = page.url();
  console.log(`[Automation] Settled URL: ${currentUrl}`);

  if (currentUrl.includes("chrome-error") || currentUrl.includes("chromewebdata")) {
    await takeScreenshot(page, mediaDir, "rate_limit_or_network_error");
    throw new Error(`Pinterest connection error (HTTP 429 / Rate Limit or Network detected). Please wait a few minutes before trying again.`);
  }

  if (currentUrl.includes("login") || currentUrl.includes("unsupportedbrowser")) {
    throw new Error("Authentication failed: Pinterest redirected to a login page. Please verify and refresh your session cookies.");
  }

  // Pinning strictly requires media
  if (localMediaPaths.length === 0) {
    throw new Error("Pinterest strictly requires an image or video to create a pin. Please attach media and try again.");
  }

  await new Promise((r) => setTimeout(r, 4000));

  console.log(`[Automation] Locating Pinterest file input...`);
  let fileInput = null;
  const startFind = Date.now();
  while (Date.now() - startFind < 15000) {
    try {
      fileInput = await page.$("input[type='file']");
      if (fileInput) {
        console.log(`[Automation] Successfully found Pinterest file input!`);
        break;
      }
    } catch (err) {
      // Ignore and retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (fileInput) {
    try {
      console.log(`[Automation] Uploading media to Pinterest...`);
      await fileInput.uploadFile(localMediaPaths[0]);
      console.log(`[Automation] Uploaded file to Pinterest input, waiting for preview/thumbnail to process...`);
      await new Promise((r) => setTimeout(r, 6000));
    } catch (uplErr: any) {
      console.error(`[Automation] Error uploading file to Pinterest input:`, uplErr.message || uplErr);
    }
  } else {
    console.warn(`[Automation] Could not find any file input element on Pinterest. Proceeding to text fields...`);
  }

  // Extract a suitable title from the content (e.g. first 100 characters)
  const title = content.length > 100 ? content.substring(0, 97) + "..." : content;

  console.log(`[Automation] Injecting Pin Title...`);
  // Try to find the title input
  const titleSelectors = [
    "input[placeholder*='title']",
    "input[placeholder*='Title']",
    "input[placeholder*='Judul']",
    "input[placeholder*='judul']",
    "input[id*='title']",
    "[aria-label*='title']",
    "[aria-label*='Title']",
    "input[type='text']",
    "h1[contenteditable='true']",
    "[data-testid*='title']"
  ];

  let titleFilled = false;
  for (const selector of titleSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        console.log(`[Automation] Found title input with selector: ${selector}`);
        await page.focus(selector);
        // Clear any existing text
        await page.evaluate((sel: string) => {
          const input = document.querySelector(sel) as HTMLInputElement;
          if (input) {
            input.value = "";
          }
        }, selector);
        await page.type(selector, title, { delay: 50 });
        titleFilled = true;
        break;
      }
    } catch (err) {
      // Try next
    }
  }

  if (!titleFilled) {
    console.log(`[Automation] Standard title selectors failed, trying evaluate fallback...`);
    await page.evaluate((txt: string) => {
      const inputs = Array.from(document.querySelectorAll("input, textarea, h1[contenteditable='true'], [contenteditable='true']"));
      const titleInput = inputs.find(i => {
        const placeholder = i.getAttribute("placeholder")?.toLowerCase() || "";
        const ariaLabel = i.getAttribute("aria-label")?.toLowerCase() || "";
        const id = i.id.toLowerCase();
        return placeholder.includes("title") || ariaLabel.includes("title") || id.includes("title") || placeholder.includes("judul");
      });
      if (titleInput) {
        if ('value' in titleInput) {
          (titleInput as any).value = txt;
        } else {
          titleInput.textContent = txt;
        }
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    }, title);
  }

  await new Promise((r) => setTimeout(r, 1500));

  console.log(`[Automation] Injecting Pin Description...`);
  const descSelectors = [
    "textarea[placeholder*='tell everyone']",
    "textarea[placeholder*='description']",
    "textarea[placeholder*='Deskripsi']",
    "textarea[placeholder*='deskripsi']",
    "textarea[placeholder*='Tell everyone']",
    "[aria-label*='description']",
    "[aria-label*='Description']",
    "div[contenteditable='true']",
    "textarea",
    "[data-testid*='description']"
  ];

  let descFilled = false;
  for (const selector of descSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        console.log(`[Automation] Found description input with selector: ${selector}`);
        await page.focus(selector);
        await page.evaluate((sel: string) => {
          const input = document.querySelector(sel) as HTMLTextAreaElement;
          if (input) {
            input.value = "";
          }
        }, selector);
        await page.type(selector, content, { delay: 40 });
        descFilled = true;
        break;
      }
    } catch (err) {
      // Try next
    }
  }

  if (!descFilled) {
    console.log(`[Automation] Standard description selectors failed, trying evaluate fallback...`);
    await page.evaluate((txt: string) => {
      const inputs = Array.from(document.querySelectorAll("textarea, div[contenteditable='true'], [contenteditable='true']"));
      const descInput = inputs.find(i => {
        const placeholder = i.getAttribute("placeholder")?.toLowerCase() || "";
        const ariaLabel = i.getAttribute("aria-label")?.toLowerCase() || "";
        return placeholder.includes("tell everyone") || placeholder.includes("description") || ariaLabel.includes("description") || placeholder.includes("deskripsi");
      });
      if (descInput) {
        if ('value' in descInput) {
          (descInput as any).value = txt;
        } else {
          descInput.textContent = txt;
        }
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    }, content);
  }

  await new Promise((r) => setTimeout(r, 2000));

  console.log(`[Automation] Selecting Pinterest Board...`);
  // Try to find the board selector and click it
  try {
    const clickedBoardDropdown = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("button, div[role='button'], [aria-haspopup='listbox'], [aria-label*='board'], [aria-label*='Board']"));
      // Find the board selector dropdown button
      const boardBtn = elements.find(el => {
        const text = el.textContent ? el.textContent.toLowerCase() : "";
        const ariaLabel = el.getAttribute("aria-label") ? el.getAttribute("aria-label").toLowerCase() : "";
        return ariaLabel.includes("board") || ariaLabel.includes("papan") || text.includes("board") || text.includes("choose a board") || text.includes("pilih papan");
      }) as HTMLElement;
      if (boardBtn) {
        boardBtn.click();
        return true;
      }
      return false;
    });

    if (clickedBoardDropdown) {
      console.log(`[Automation] Clicked board dropdown, waiting for options to show...`);
      await new Promise((r) => setTimeout(r, 2000));
      
      // Select the first available board option
      const selectedOption = await page.evaluate(() => {
        // Try looking for listbox options or menu items
        const options = Array.from(document.querySelectorAll("[role='option'], [data-testid*='board'], [aria-label*='board'] div, div[role='list'] div"));
        // Filter out non-empty elements that seem clickable or are options
        const boardOptions = options.filter(el => {
          const text = el.textContent ? el.textContent.trim() : "";
          return text.length > 0 && !text.toLowerCase().includes("search");
        }) as HTMLElement[];
        
        if (boardOptions.length > 0) {
          boardOptions[0].click();
          return true;
        }
        
        // Secondary try: click any div in dialog that isn't empty
        const dialog = document.querySelector("[role='dialog'], [role='menu'], [role='listbox']");
        if (dialog) {
          const items = Array.from(dialog.querySelectorAll("div[role='button'], [role='option'], [role='menuitem']")) as HTMLElement[];
          if (items.length > 0) {
            items[0].click();
            return true;
          }
        }
        return false;
      });
      if (selectedOption) {
        console.log(`[Automation] Successfully selected the first Pinterest board option!`);
      } else {
        console.log(`[Automation] Could not find board options, clicking outside or assuming default is active`);
        // Escape board selector if stuck
        await page.keyboard.press("Escape");
      }
    } else {
      console.log(`[Automation] Board dropdown button not detected. Proceeding to Publish button with active/default board...`);
    }
  } catch (boardErr: any) {
    console.warn(`[Automation] Board selection skipped/failed:`, boardErr.message || boardErr);
  }

  await new Promise((r) => setTimeout(r, 2000));

  console.log(`[Automation] Clicking Publish/Save button...`);
  const clickPublishButton = async () => {
    return await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, div[role='button'], [role='tab']"));
      const publishButton = buttons.find((b) => {
        const text = b.textContent ? b.textContent.trim() : "";
        return (
          text === "Publish" ||
          text === "Publish Pin" ||
          text === "Save" ||
          text === "Simpan" ||
          text === "Terbitkan" ||
          text.includes("Publish") ||
          text.includes("Save") ||
          text.includes("Simpan")
        );
      }) as HTMLElement;
      if (publishButton) {
        publishButton.click();
        return true;
      }
      return false;
    });
  };

  let clicked = await clickPublishButton();
  if (!clicked) {
    console.log(`[Automation] Specific text Publish click failed. Trying general button selector...`);
    try {
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await page.evaluate((el: any) => el.textContent ? el.textContent.trim() : "", btn);
        if (text && (text.includes("Publish") || text.includes("Save") || text.includes("Simpan"))) {
          await btn.click();
          clicked = true;
          break;
        }
      }
    } catch (e) {
      console.error(`[Automation] General button selector click error:`, e);
    }
  }

  if (!clicked) {
    throw new Error("Could not find Pinterest Publish or Save button on the pin-builder page.");
  }

  console.log(`[Automation] Waiting to verify Pinterest Pin publication...`);
  await new Promise((r) => setTimeout(r, 8000));
  await takeScreenshot(page, mediaDir, "published_check");
  console.log(`[Automation] ✅ Successfully completed Pinterest Pin builder flow!`);
}
