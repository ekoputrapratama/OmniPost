import path from "path";

async function takeScreenshot(page: any, mediaDir: string, stepName: string) {
  try {
    const screenshotPath = path.join(mediaDir, `debug_tiktok_${stepName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`[Automation] Debug screenshot saved to ${screenshotPath}. Accessible at /media/debug_tiktok_${stepName}.png`);
  } catch (err: any) {
    console.error(`[Automation] Failed to take debug screenshot for ${stepName}:`, err.message);
  }
}

async function handleUploadHoverAndClick(page: any, mediaDir: string, hasImage: boolean) {
  console.log(`[Automation] Attempting to hover over 'Upload' or 'Create' buttons to activate submenus...`);
  
  // Find candidates via page.evaluate (safer coordinate-based mouse hover)
  const candidates = await page.evaluate(() => {
    const elList = Array.from(document.querySelectorAll("div, span, button, a, li, p, h1, h2, h3"));
    return elList
      .map((el: any) => {
        const text = el.textContent ? el.textContent.trim() : "";
        const rect = el.getBoundingClientRect();
        return {
          text,
          tagName: el.tagName.toLowerCase(),
          visible: rect.width > 0 && rect.height > 0,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })
      .filter(c => {
        if (!c.visible) return false;
        const txtLower = c.text.toLowerCase();
        return (
          txtLower === "upload" ||
          txtLower === "create" ||
          (txtLower.includes("upload") && txtLower.length < 15) ||
          (txtLower.includes("create") && txtLower.length < 15)
        );
      });
  });

  console.log(`[Automation] Found ${candidates.length} hover candidates:`, JSON.stringify(candidates));

  let clicked = false;
  for (const c of candidates) {
    try {
      console.log(`[Automation] Moving mouse to hover candidate '${c.text}' at (${c.x}, ${c.y})`);
      await page.mouse.move(c.x, c.y);
      await new Promise((r) => setTimeout(r, 1500));
      await takeScreenshot(page, mediaDir, `hover_${c.text.replace(/\s+/g, '_')}`);

      // Now see if submenu items with "video", "photo", "image", "upload video", "upload photo" have appeared
      const submenuClicked = await page.evaluate((isImage: boolean) => {
        const subtexts = isImage 
          ? ["photo", "image", "upload photo", "upload image", "post", "video", "upload video"] 
          : ["video", "upload video", "post", "photo", "image", "upload photo"];
        
        const elements = Array.from(document.querySelectorAll("div, span, button, a, li, p"));
        const target = elements.find((el: any) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
          if (text === "upload" || text === "create") return false;
          return subtexts.includes(text) || subtexts.some(t => text === t || text.includes(t));
        }) as HTMLElement;

        if (target) {
          target.click();
          return { clickedText: target.textContent?.trim() };
        }
        return null;
      }, hasImage);

      if (submenuClicked) {
        console.log(`[Automation] ✅ Successfully clicked submenu item: "${submenuClicked.clickedText}"`);
        clicked = true;
        break;
      }
    } catch (err: any) {
      console.warn(`[Automation] Error during hover sequence for candidate:`, err.message);
    }
  }

  if (!clicked) {
    console.log(`[Automation] Coordinate hover backup. Attempting standard selector hover/click...`);
    const backupSelectors = [
      "a[href*='upload']",
      "button[class*='upload']",
      "div[class*='upload']",
      "[data-e2e*='upload']",
      "button[class*='create']",
      "[data-e2e*='create']"
    ];

    for (const selector of backupSelectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          console.log(`[Automation] Hovering backup selector: ${selector}`);
          await el.hover();
          await new Promise((r) => setTimeout(r, 1500));
          
          const clickedSub = await page.evaluate((isImage: boolean) => {
            const subtexts = isImage 
              ? ["photo", "image", "upload photo", "upload image", "video", "upload video"] 
              : ["video", "upload video", "photo", "image", "upload photo"];
            const items = Array.from(document.querySelectorAll("div, span, button, a, li, p"));
            const target = items.find((item: any) => {
              const text = item.textContent ? item.textContent.trim().toLowerCase() : "";
              const rect = item.getBoundingClientRect();
              return (rect.width > 0 && rect.height > 0) && (
                subtexts.includes(text) || subtexts.some(t => text === t || text.includes(t))
              );
            }) as HTMLElement;
            if (target) {
              target.click();
              return target.textContent?.trim();
            }
            return null;
          }, hasImage);

          if (clickedSub) {
            console.log(`[Automation] ✅ Clicked backup submenu element: "${clickedSub}"`);
            clicked = true;
            break;
          }
        }
      } catch (e) {}
    }
  }

  if (!clicked) {
    console.log(`[Automation] No hover submenu click succeeded. Proceeding directly...`);
  }
}

async function clickMainPageUploadButton(page: any, mediaDir: string): Promise<boolean> {
  console.log("[Automation] Checking if on homepage and need to click Upload button...");
  await takeScreenshot(page, mediaDir, "main_page_check");

  const currentUrl = page.url();
  if (currentUrl.includes("tiktokstudio") || currentUrl.includes("/upload")) {
    console.log("[Automation] Already on upload/studio page, no need to click homepage Upload button.");
    return true;
  }

  // Look for any link containing "/upload" or "/tiktokstudio"
  const clicked = await page.evaluate(() => {
    // 1. Search for link containing "/upload" or "/tiktokstudio"
    const uploadLinks = Array.from(document.querySelectorAll("a"));
    const uploadLink = uploadLinks.find(a => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent ? a.textContent.trim().toLowerCase() : "";
      return href.includes("/upload") || href.includes("/tiktokstudio") || text === "upload" || text.includes("upload");
    });

    if (uploadLink) {
      (uploadLink as HTMLElement).click();
      return { success: true, method: "link click: " + uploadLink.getAttribute("href") };
    }

    // 2. Search for any button or div with role="button" containing "upload"
    const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span, p"));
    const uploadButton = buttons.find(b => {
      const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
      const classStr = b.className ? String(b.className).toLowerCase() : "";
      return text === "upload" || text.includes("upload") || classStr.includes("upload-btn") || classStr.includes("btn-upload");
    });

    if (uploadButton) {
      (uploadButton as HTMLElement).click();
      return { success: true, method: "button click: " + uploadButton.textContent?.trim() };
    }

    return null;
  });

  if (clicked) {
    console.log(`[Automation] Clicked homepage upload element! Method: ${clicked.method}. Waiting for navigation/redirection to upload page...`);
    await new Promise(r => setTimeout(r, 6000));
    await takeScreenshot(page, mediaDir, "after_main_page_upload_click");
    return true;
  }

  console.log("[Automation] No homepage upload button found. Let's try direct navigation.");
  return false;
}

async function selectUploadTypeInStudio(page: any, mediaDir: string, isImage: boolean): Promise<boolean> {
  console.log(`[Automation] Choosing upload type in TikTok Studio (isImage: ${isImage})...`);
  await takeScreenshot(page, mediaDir, "before_upload_type_selection");

  const clicked = await page.evaluate((imageMode: boolean) => {
    const targetTexts = imageMode 
      ? ["photos", "photo", "images", "image", "upload photos", "upload photo"] 
      : ["videos", "video", "upload videos", "upload video", "select video"];

    const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span, p, a, li, div"));
    
    // Exact or close text match
    let targetEl = buttons.find((b: any) => {
      const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
      const rect = b.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      return targetTexts.includes(text);
    });

    // Fallback: contains match
    if (!targetEl) {
      targetEl = buttons.find((b: any) => {
        const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return targetTexts.some(t => text.includes(t) && text.length < 25);
      });
    }

    if (targetEl) {
      (targetEl as HTMLElement).click();
      return { success: true, text: targetEl.textContent?.trim() };
    }
    return null;
  }, isImage);

  if (clicked) {
    console.log(`[Automation] ✅ Clicked TikTok Studio upload type option: "${clicked.text}"`);
    await new Promise((r) => setTimeout(r, 4000));
    await takeScreenshot(page, mediaDir, "after_upload_type_selection");
    return true;
  }

  console.log("[Automation] Could not find specific Video/Photo selection buttons in Studio. Proceeding directly...");
  return false;
}

export async function publishToTikTok(
  page: any,
  content: string,
  localMediaPaths: string[],
  mediaDir: string = "/tmp/omnipost_media"
): Promise<void> {
  // TikTok requires video or image
  if (localMediaPaths.length === 0) {
    throw new Error("TikTok is a video-centric platform and strictly requires at least one video (or image) file to upload. Please attach media and try again.");
  }

  const firstMedia = localMediaPaths[0] || "";
  const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(firstMedia);

  console.log(`[Automation] Navigating to TikTok homepage...`);
  try {
    await page.goto("https://www.tiktok.com/", { waitUntil: "load", timeout: 35000 });
  } catch (navErr: any) {
    console.warn(`[Automation] TikTok navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }

  let currentUrl = page.url();
  console.log(`[Automation] Settled URL: ${currentUrl}`);

  if (currentUrl.includes("login") || currentUrl.includes("unsupportedbrowser")) {
    throw new Error("Authentication failed: TikTok redirected to a login page. Please verify and refresh your session cookies.");
  }

  await new Promise((r) => setTimeout(r, 4000));

  // Dismiss overlays or cookie consents if any
  try {
    await page.evaluate(() => {
      const dismissTexts = ["allow all", "accept cookies", "accept", "agree", "allow", "dismiss", "got it", "not now", "ok", "close"];
      const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span, a"));
      for (const btn of buttons) {
        const text = btn.textContent ? btn.textContent.trim().toLowerCase() : "";
        if (dismissTexts.includes(text) || dismissTexts.some(t => text === t || text.includes(t))) {
          try {
            (btn as HTMLElement).click();
          } catch (e) {}
        }
      }
    });
  } catch (err: any) {
    console.warn("[Automation] Failed to dismiss general overlays:", err.message);
  }

  // Try to click "Upload" button on the homepage to redirect to creator studio/upload page
  await clickMainPageUploadButton(page, mediaDir);

  currentUrl = page.url();
  console.log(`[Automation] Current URL after homepage check: ${currentUrl}`);

  // If we are still not on the upload/studio page, let's try direct navigation as fallback
  if (!currentUrl.includes("tiktokstudio") && !currentUrl.includes("/upload")) {
    console.log(`[Automation] Fallback: Direct navigating to TikTok Creator Center Upload...`);
    try {
      await page.goto("https://www.tiktok.com/tiktokstudio/upload", { waitUntil: "load", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 4000));
    } catch (navErr: any) {
      console.warn(`[Automation] TikTok fallback navigation warning:`, navErr.message || navErr);
    }
  }

  // Choose Upload type in Studio ("Videos" vs "Photos") depending on media file type
  await selectUploadTypeInStudio(page, mediaDir, isImage);

  console.log(`[Automation] Locating TikTok file input...`);
  let fileInput = null;
  const startFind = Date.now();
  // TikTok upload might be in an iframe, let's search recursively.
  // We'll give it a few seconds to find it, if not found, we trigger the hover/submenu flow.
  let triedHover = false;
  while (Date.now() - startFind < 20000) {
    try {
      // 1. Search in main frame
      fileInput = await page.$("input[type='file']");
      if (fileInput) {
        console.log(`[Automation] Successfully found TikTok file input in main frame!`);
        break;
      }
      
      // 2. Search in all sub-frames
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameInput = await frame.$("input[type='file']");
          if (frameInput) {
            fileInput = frameInput;
            console.log(`[Automation] Successfully found TikTok file input in sub-frame!`);
            break;
          }
        } catch (e) {}
      }
      if (fileInput) break;

      // If not found after 4 seconds and we haven't tried hover/submenu selection yet, trigger it
      if (Date.now() - startFind > 4000 && !triedHover) {
        triedHover = true;
        await handleUploadHoverAndClick(page, mediaDir, isImage);
      }
    } catch (err) {
      // Ignore and retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (fileInput) {
    try {
      console.log(`[Automation] Uploading media to TikTok...`);
      await fileInput.uploadFile(localMediaPaths[0]);
      console.log(`[Automation] Uploaded file to TikTok input, waiting for video processing and fields to load...`);
      await new Promise((r) => setTimeout(r, 8000));
    } catch (uplErr: any) {
      console.error(`[Automation] Error uploading file to TikTok input:`, uplErr.message || uplErr);
    }
  } else {
    console.warn(`[Automation] Could not find any file input element on TikTok. Proceeding to description/caption...`);
  }

  await takeScreenshot(page, mediaDir, "after_media_upload");

  console.log(`[Automation] Injecting TikTok Caption...`);
  const captionSelectors = [
    "div[contenteditable='true']",
    "div[class*='editor']",
    "div[data-e2e='post-editor']",
    "textarea",
    "input[type='text']"
  ];

  let captionFilled = false;
  // First, let's try entering via selector on page or subframes
  for (const selector of captionSelectors) {
    try {
      // Search in main page
      const el = await page.$(selector);
      if (el) {
        console.log(`[Automation] Found caption element with selector: ${selector}`);
        await page.focus(selector);
        // Clear any existing text
        await page.evaluate((sel: string) => {
          const target = document.querySelector(sel) as HTMLElement;
          if (target) {
            if ('value' in target) {
              (target as any).value = "";
            } else {
              target.textContent = "";
            }
          }
        }, selector);
        await page.type(selector, content, { delay: 40 });
        captionFilled = true;
        break;
      }
      
      // Search in frames
      const frames = page.frames();
      for (const frame of frames) {
        const frameEl = await frame.$(selector);
        if (frameEl) {
          console.log(`[Automation] Found caption element in sub-frame with selector: ${selector}`);
          await frameEl.focus();
          await frame.evaluate((sel: string) => {
            const target = document.querySelector(sel) as HTMLElement;
            if (target) {
              if ('value' in target) {
                (target as any).value = "";
              } else {
                target.textContent = "";
              }
            }
          }, selector);
          await frameEl.type(content, { delay: 40 });
          captionFilled = true;
          break;
        }
      }
      if (captionFilled) break;
    } catch (err) {
      // Try next
    }
  }

  if (!captionFilled) {
    console.log(`[Automation] Standard caption selectors failed, trying evaluate fallback...`);
    // Try to find any contenteditable div or textarea in main page and frames
    const typed = await page.evaluate((txt: string) => {
      const inputs = Array.from(document.querySelectorAll("div[contenteditable='true'], textarea, [class*='editor']"));
      const target = inputs[0] as HTMLElement;
      if (target) {
        if ('value' in target) {
          (target as any).value = txt;
        } else {
          target.textContent = txt;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      return false;
    }, content);

    if (!typed) {
      // Try inside frames
      const frames = page.frames();
      for (const frame of frames) {
        const frameTyped = await frame.evaluate((txt: string) => {
          const inputs = Array.from(document.querySelectorAll("div[contenteditable='true'], textarea, [class*='editor']"));
          const target = inputs[0] as HTMLElement;
          if (target) {
            if ('value' in target) {
              (target as any).value = txt;
            } else {
              target.textContent = txt;
            }
            target.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
          return false;
        }, content);
        if (frameTyped) {
          console.log("[Automation] Typed caption inside a sub-frame fallback!");
          captionFilled = true;
          break;
        }
      }
    } else {
      console.log("[Automation] Typed caption inside main frame fallback!");
      captionFilled = true;
    }
  }

  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(page, mediaDir, "after_caption_filled");

  console.log(`[Automation] Clicking TikTok Post/Publish button...`);
  
  const dismissExitModalIfPresent = async () => {
    try {
      const dismissed = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, div, p"));
        const exitHeading = headings.find(h => h.textContent && h.textContent.includes("Are you sure you want to exit"));
        if (exitHeading) {
          const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span, p"));
          const cancelButton = buttons.find(b => {
            const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
            return text === "cancel" || text.includes("cancel");
          });
          if (cancelButton) {
            (cancelButton as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (dismissed) {
        console.log("[Automation] Detected and successfully dismissed 'Are you sure you want to exit' modal.");
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.warn("[Automation] Failed to check or dismiss exit modal:", err.message);
    }
  };

  const clickPostButton = async () => {
    // Check and dismiss exit modal if it's currently blocking us
    await dismissExitModalIfPresent();

    // Check main frame
    const mainClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span"));
      const publishButton = buttons.find((b) => {
        const text = b.textContent ? b.textContent.trim() : "";
        const textLower = text.toLowerCase();
        const classStr = b.className ? String(b.className).toLowerCase() : "";
        const e2e = b.getAttribute("data-e2e") || "";
        
        // Exclude sidebar navigation elements
        let parent = b.parentElement;
        while (parent) {
          const pTagName = parent.tagName.toLowerCase();
          const pClass = parent.className ? String(parent.className).toLowerCase() : "";
          const pId = parent.id ? String(parent.id).toLowerCase() : "";
          if (
            pTagName === "aside" || 
            pTagName === "nav" || 
            pClass.includes("sidebar") || 
            pClass.includes("navigation") || 
            pClass.includes("menu") ||
            pId.includes("sidebar") ||
            pId.includes("menu")
          ) {
            return false;
          }
          parent = parent.parentElement;
        }

        // Exclude left/side menus or posts lists
        if (textLower === "posts" || textLower.includes("posts") || textLower.includes("drafts")) {
          return false;
        }

        const matchesExactText = (textLower === "post" || textLower === "publish" || textLower === "share");
        const matchesClassOrE2E = (
          classStr.includes("btn-post") || 
          classStr.includes("publish-btn") ||
          e2e.includes("post-button") || 
          e2e.includes("post-btn") || 
          e2e.includes("post_video")
        );

        return matchesExactText || matchesClassOrE2E;
      }) as HTMLElement;

      if (publishButton) {
        publishButton.scrollIntoView({ block: "center" });
        publishButton.click();
        return { text: publishButton.textContent?.trim() };
      }
      return null;
    });

    if (mainClicked) {
      console.log(`[Automation] Clicked post button in main frame: "${mainClicked.text}"`);
      return true;
    }

    // Search frames
    const frames = page.frames();
    for (const frame of frames) {
      const frameClicked = await frame.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button, div[role='button'], span"));
        const publishButton = buttons.find((b) => {
          const text = b.textContent ? b.textContent.trim() : "";
          const textLower = text.toLowerCase();
          const classStr = b.className ? String(b.className).toLowerCase() : "";
          const e2e = b.getAttribute("data-e2e") || "";
          
          // Exclude sidebar navigation elements
          let parent = b.parentElement;
          while (parent) {
            const pTagName = parent.tagName.toLowerCase();
            const pClass = parent.className ? String(parent.className).toLowerCase() : "";
            const pId = parent.id ? String(parent.id).toLowerCase() : "";
            if (
              pTagName === "aside" || 
              pTagName === "nav" || 
              pClass.includes("sidebar") || 
              pClass.includes("navigation") || 
              pClass.includes("menu") ||
              pId.includes("sidebar") ||
              pId.includes("menu")
            ) {
              return false;
            }
            parent = parent.parentElement;
          }

          if (textLower === "posts" || textLower.includes("posts") || textLower.includes("drafts")) {
            return false;
          }

          const matchesExactText = (textLower === "post" || textLower === "publish" || textLower === "share");
          const matchesClassOrE2E = (
            classStr.includes("btn-post") || 
            classStr.includes("publish-btn") ||
            e2e.includes("post-button") || 
            e2e.includes("post-btn") || 
            e2e.includes("post_video")
          );

          return matchesExactText || matchesClassOrE2E;
        }) as HTMLElement;

        if (publishButton) {
          publishButton.scrollIntoView({ block: "center" });
          publishButton.click();
          return { text: publishButton.textContent?.trim() };
        }
        return null;
      });

      if (frameClicked) {
        console.log(`[Automation] Clicked post button in sub-frame: "${frameClicked.text}"`);
        return true;
      }
    }

    return false;
  };

  let clicked = await clickPostButton();
  if (!clicked) {
    console.warn(`[Automation] Post button click returned false. Trying general selectors...`);
    const selectors = [
      "button[data-e2e='post-button']",
      "button.btn-post",
      ".btn-post",
      "button[type='submit']"
    ];

    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.scrollIntoView({ block: "center" });
          await el.click();
          clicked = true;
          break;
        }
        const frames = page.frames();
        for (const frame of frames) {
          const frameEl = await frame.$(sel);
          if (frameEl) {
            await frameEl.scrollIntoView({ block: "center" });
            await frameEl.click();
            clicked = true;
            break;
          }
        }
        if (clicked) break;
      } catch (e) {}
    }
  }

  if (!clicked) {
    await takeScreenshot(page, mediaDir, "publish_button_not_found");
    throw new Error("Could not locate TikTok Post/Publish button on the creator upload page. Please ensure your video has completed processing and try again.");
  }

  console.log(`[Automation] Waiting to verify TikTok video publication and handling potential post-checks dialog...`);
  
  // We'll poll for the "Post now" button / dialog for up to 16 seconds
  let postNowHandled = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      // 1. Check main frame for "Post now"
      const mainPostNow = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("button, div[role='button'], span, p"));
        const btn = elements.find((el: any) => {
          const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
          const rect = el.getBoundingClientRect();
          return (rect.width > 0 && rect.height > 0) && (
            text === "post now" || 
            text.includes("post now") || 
            text === "continue to post" || 
            text.includes("continue to post")
          );
        }) as HTMLElement;

        if (btn) {
          btn.scrollIntoView({ block: "center" });
          btn.click();
          return { text: btn.textContent?.trim() };
        }
        return null;
      });

      if (mainPostNow) {
        console.log(`[Automation] ✅ Handled check modal in main frame. Clicked: "${mainPostNow.text}"`);
        postNowHandled = true;
        await takeScreenshot(page, mediaDir, "after_clicking_post_now");
        // Give it extra time after clicking Post now
        await new Promise((r) => setTimeout(r, 5000));
        break;
      }

      // 2. Check frames for "Post now"
      const frames = page.frames();
      let framePostNow = null;
      for (const frame of frames) {
        framePostNow = await frame.evaluate(() => {
          const elements = Array.from(document.querySelectorAll("button, div[role='button'], span, p"));
          const btn = elements.find((el: any) => {
            const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
            const rect = el.getBoundingClientRect();
            return (rect.width > 0 && rect.height > 0) && (
              text === "post now" || 
              text.includes("post now") || 
              text === "continue to post" || 
              text.includes("continue to post")
            );
          }) as HTMLElement;

          if (btn) {
            btn.scrollIntoView({ block: "center" });
            btn.click();
            return { text: btn.textContent?.trim() };
          }
          return null;
        });

        if (framePostNow) {
          console.log(`[Automation] ✅ Handled check modal in sub-frame. Clicked: "${framePostNow.text}"`);
          postNowHandled = true;
          break;
        }
      }

      if (framePostNow) {
        await takeScreenshot(page, mediaDir, "after_clicking_post_now_frame");
        await new Promise((r) => setTimeout(r, 5000));
        break;
      }
    } catch (err: any) {
      console.warn("[Automation] Warning searching/clicking 'Post now' modal:", err.message);
    }
  }

  if (!postNowHandled) {
    console.log("[Automation] 'Post now' modal did not appear or was not clicked during polling. Proceeding with final publication check...");
  }

  await new Promise((r) => setTimeout(r, 4000));
  await takeScreenshot(page, mediaDir, "published_check");
  console.log(`[Automation] ✅ Successfully completed TikTok publishing flow!`);
}
