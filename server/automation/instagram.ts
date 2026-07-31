import path from "path";

async function takeScreenshot(page: any, mediaDir: string, stepName: string) {
  try {
    const screenshotPath = path.join(mediaDir, `debug_instagram_${stepName}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`[Automation] Debug screenshot saved to ${screenshotPath}. Accessible at /media/debug_instagram_${stepName}.png`);
  } catch (err: any) {
    console.error(`[Automation] Failed to take debug screenshot for ${stepName}:`, err.message);
  }
}

async function dismissOverlays(page: any) {
  console.log(`[Automation] Checking for overlays/popups to dismiss...`);
  await page.evaluate(new Function(`
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    // 1. Check for special Instagram popup/not-now button classes first (independent of language)
    const specSelectors = [
      "button._a9--._a9_1",
      "button._a9_1",
      "._a9_1",
      "button[class*='_a9_1']",
      "button[class*='_a9--'][class*='_a9_1']"
    ];
    for (const sel of specSelectors) {
      const specBtn = document.querySelector(sel);
      if (specBtn && isVisible(specBtn)) {
        specBtn.click();
        console.log("Clicked Instagram special dismiss button via selector:", sel);
        return true;
      }
    }

    const dismissTexts = [
      "not now", "lain kali", "jangan sekarang", "nanti", "ahora no", "plus tard", "nicht jetzt", "non ora", "agora não", 
      "cancel", "batal", "close", "tutup"
    ];

    // 2. Check for active dialog/modal
    const modals = Array.from(document.querySelectorAll("div[role='dialog']"));
    for (const modal of modals) {
      if (!isVisible(modal)) continue;
      const buttons = Array.from(modal.querySelectorAll("button, div[role='button'], span"));
      const match = buttons.find((btn) => {
        if (!isVisible(btn)) return false;
        const text = btn.textContent ? btn.textContent.trim().toLowerCase() : "";
        return dismissTexts.includes(text) || dismissTexts.some(t => text === t || text.includes(t));
      });
      if (match) {
        match.click();
        console.log("Clicked dismiss button inside modal:", match.textContent);
        return true;
      }
    }

    // 3. Check general buttons/divs/spans/a tags (for cookie banner and alert notices)
    const generalButtons = Array.from(document.querySelectorAll("button, div[role='button'], span, a"));
    const cookieTexts = [
      "allow all cookies", "allow all", "accept cookies", "accept", "agree", "allow", "decline", "cookies", 
      "izinkan semua cookie", "terima semua cookie", "terima semua", "terima", "izinkan", "setuju", "setujui semua", "tolak",
      "aceptar todos", "aceptar todas", "accepter tous", "accepter tout", "autoriser tous", "permitir todos", "akzeptieren",
      "allow essential and optional cookies", "decline optional cookies", "not now", "lain kali", "jangan sekarang"
    ];

    for (const textOfPriority of cookieTexts) {
      const btn = generalButtons.find((b) => {
        if (!isVisible(b)) return false;
        const text = b.textContent ? b.textContent.trim().toLowerCase() : "";
        return text === textOfPriority || text.includes(textOfPriority);
      });
      if (btn) {
        btn.click();
        console.log("Clicked general priority/cookie button:", btn.textContent);
        return true;
      }
    }
    return false;
  `));
  await new Promise((r) => setTimeout(r, 2000));
}

async function clickElementNative(page: any, svgLabelOrText: string) {
  const coords = await page.evaluate(new Function('target', `
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const svgs = Array.from(document.querySelectorAll("svg"));
    const matchedSvg = svgs.find((s) => {
      const label = s.getAttribute("aria-label");
      if (!label || !label.toLowerCase().includes(target.toLowerCase())) return false;
      const parent = s.closest("div[role='button']") || s.closest("a") || s.parentElement;
      return isVisible(parent);
    });
    
    let el = null;
    if (matchedSvg) {
      el = matchedSvg.closest("div[role='button']") || matchedSvg.closest("a") || matchedSvg.parentElement;
    } else {
      const elements = Array.from(document.querySelectorAll("button, a, div[role='button'], span"));
      el = elements.find((e) => {
        const text = e.textContent ? e.textContent.trim().toLowerCase() : "";
        if (!text || !text.includes(target.toLowerCase())) return false;
        const parent = e.closest("div[role='button']") || e.closest("a") || e;
        return isVisible(parent);
      });
      if (el) {
        el = el.closest("div[role='button']") || el.closest("a") || el;
      }
    }

    if (el && isVisible(el)) {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        found: true
      };
    }
    return { found: false };
  `), svgLabelOrText);

  if (coords && coords.found) {
    console.log(`[Automation] Found element coordinates for "${svgLabelOrText}": (${coords.x}, ${coords.y}). Clicking...`);
    await page.mouse.click(coords.x, coords.y);
    return true;
  }
  return false;
}

async function clickTopRightModalButtonFallback(page: any, excludeTexts: string[] = []) {
  const coords = await page.evaluate(new Function('excludeTexts', `
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const dialogs = Array.from(document.querySelectorAll("div[role='dialog']"));
    const dialog = dialogs.find(isVisible);
    if (dialog && isVisible(dialog)) {
      const dialogRect = dialog.getBoundingClientRect();
      
      // Define header-right zone (top 80px, right 45% of the active dialog)
      const zoneTop = dialogRect.top;
      const zoneBottom = dialogRect.top + 80;
      const zoneLeft = dialogRect.left + (dialogRect.width * 0.55);
      const zoneRight = dialogRect.right;const candidates = [];
      const allEls = Array.from(dialog.querySelectorAll("button, div, span, a, p, [role='button']"));
      for (const el of allEls) {
        if (!isVisible(el)) continue;
        const rect = el.getBoundingClientRect();
        
        // Get center coordinates of this element
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        if (cx >= zoneLeft && cx <= zoneRight && cy >= zoneTop && cy <= zoneBottom) {
          const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
          if (text.includes("back") || text.includes("kembali") || text.includes("cancel") || text.includes("batal") || text.includes("close")) {
            continue;
          }
          if (excludeTexts && excludeTexts.some(ext => text === ext || text.includes(ext))) {
            continue;
          }
          candidates.push({ el, rect, text });
        }
      }

      if (candidates.length > 0) {
        // Sort by horizontal center position descending (rightmost element first)
        candidates.sort((a, b) => {
          const centerA = a.rect.left + a.rect.width / 2;
          const centerB = b.rect.left + b.rect.width / 2;
          return centerB - centerA;
        });

        // Prefer elements with some text content or buttons
        let bestCandidate = candidates[0];
        for (const c of candidates) {
          if (c.text.length > 0) {
            bestCandidate = c;
            break;
          }
        }

        const rect = bestCandidate.rect;
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          found: true
        };
      }
    }
    return { found: false };
  `), excludeTexts);

  if (coords && coords.found) {
    console.log(`[Automation] Clicking top-right modal button fallback at: (${coords.x}, ${coords.y})`);
    await page.mouse.click(coords.x, coords.y);
    
    // Also trigger a direct DOM click on the elements at those coordinates
    await page.evaluate(new Function('x', 'y', `
      try {
        const el = document.elementFromPoint(x, y);
        if (el) {
          let current = el;
          let levels = 0;
          while (current && levels < 5) {
            try {
              current.click();
            } catch(e){}
            current = current.parentElement;
            levels++;
          }
        }
      } catch(e){}
    `), coords.x, coords.y);
    return true;
  }
  return false;
}

async function clickInstagramButtonByText(page: any, targetTexts: string[]) {
  // Remove any old automation target attributes first to avoid conflict
  await page.evaluate(new Function(`
    const old = document.querySelectorAll('[data-automation-target]');
    old.forEach(el => el.removeAttribute('data-automation-target'));
  `));

  // 1. Prioritize ultra-robust text matching (deepest-first, exact-match-first, button-score prioritised)
  console.log(`[Automation] Searching for Instagram button containing texts: ${JSON.stringify(targetTexts)}`);
  const found = await page.evaluate(new Function('texts', `
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const isInsideVisibleDialog = (el) => {
      let p = el.parentElement;
      while (p) {
        if (p.getAttribute('role') === 'dialog' && isVisible(p)) {
          return true;
        }
        p = p.parentElement;
      }
      return false;
    };

    const elements = Array.from(document.querySelectorAll("button, div, span, a, p, [role='button']"));
    
    // Reverse the order to evaluate deepest/innermost children first
    const reversedElements = [...elements].reverse();
    
    // Pass 1: Exact trimmed case-insensitive match (highly specific)
    const candidates = reversedElements.filter((el) => {
      if (!isVisible(el)) return false;
      const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
      return texts.some(t => text === t);
    });

    // Sort candidates: elements inside visible dialogs, with role="button", tagName === 'BUTTON', or tabindex="0" first!
    candidates.sort((a, b) => {
      const score = (el) => {
        let s = 0;
        if (el.tagName === "BUTTON") s += 10;
        if (el.getAttribute("role") === "button") s += 10;
        if (el.getAttribute("tabindex") === "0") s += 5;
        if (isInsideVisibleDialog(el)) s += 20;
        return s;
      };
      return score(b) - score(a);
    });
    
    let targetBtn = candidates[0];
    
    // Pass 2: Relaxed substring match, with container dimension limits to avoid giant wrappers
    if (!targetBtn) {
      const relaxedCandidates = reversedElements.filter((el) => {
        if (!isVisible(el)) return false;
        const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
        if (texts.some(t => text.includes(t))) {
          const rect = el.getBoundingClientRect();
          return rect.width < 450 && rect.height < 150;
        }
        return false;
      });

      relaxedCandidates.sort((a, b) => {
        const score = (el) => {
          let s = 0;
          if (el.tagName === "BUTTON") s += 10;
          if (el.getAttribute("role") === "button") s += 10;
          if (el.getAttribute("tabindex") === "0") s += 5;
          if (isInsideVisibleDialog(el)) s += 20;
          return s;
        };
        return score(b) - score(a);
      });

      targetBtn = relaxedCandidates[0];
    }
    
    if (targetBtn) {
      console.log("[Browser] Match found for texts:", JSON.stringify(texts), "Element tag:", targetBtn.tagName, "Text:", targetBtn.textContent);
      
      // Mark with unique automation attribute for native Puppeteer click
      targetBtn.setAttribute('data-automation-target', 'current-btn');

      // Trigger direct DOM click immediately on the element and its nearest parents as a backup trigger
      let current = targetBtn;
      let levels = 0;
      while (current && levels < 4) {
        try {
          current.click();
        } catch (e) {}
        current = current.parentElement;
        levels++;
      }
      return true;
    }
    return false;
  `), targetTexts);

  if (found) {
    console.log(`[Automation] Found button. Triggering native Puppeteer click on selector [data-automation-target="current-btn"]`);
    try {
      await page.click('[data-automation-target="current-btn"]');
      return true;
    } catch (err: any) {
      console.warn(`[Automation] Native page.click failed: ${err.message}. Trying direct mouse-click fallback...`);
      const coords = await page.evaluate(new Function(`
        const el = document.querySelector('[data-automation-target="current-btn"]');
        if (el) {
          const rect = el.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
        return null;
      `));
      if (coords) {
        await page.mouse.click((coords as any).x, (coords as any).y);
        return true;
      }
    }
  }

  // 2. Fall back to smart XPaths if text-matching fails and it is a Next/Share transition
  const isNextOrShare = targetTexts.includes("next") || targetTexts.includes("share");
  if (isNextOrShare) {
    console.log(`[Automation] Text-match button not found. Checking custom and dynamic XPaths fallback...`);
    const xpathList = [
      "/html/body/div[5]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div", // Exact user-provided
      "/html/body/div[6]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div", // user-provided offset 6
      "/html/body/div[4]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div", // user-provided offset 4
      "/html/body/div[3]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div", // user-provided offset 3
      "/html/body/div[7]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div", // user-provided offset 7
      // Relative to dialog
      "//div[@role='dialog']//div[1]/div/div/div/div[3]/div/div",
      "//div[@role='dialog']//div[1]/div/div/div/div[3]/div",
      "//div[@role='dialog']//div/div/div/div/div/div/div/div[1]/div/div/div/div[3]/div/div"
    ];

    // Append dynamic text matching XPaths based on the requested button labels
    for (const t of targetTexts) {
      const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
      xpathList.push(`//div[@role='button' and (text()='${t}' or text()='${capitalized}')]`);
      xpathList.push(`//button[(text()='${t}' or text()='${capitalized}')]`);
      xpathList.push(`//div[(text()='${t}' or text()='${capitalized}')]`);
      xpathList.push(`//span[(text()='${t}' or text()='${capitalized}')]`);
      xpathList.push(`//*[@role='button' and (text()='${t}' or text()='${capitalized}')]`);
      xpathList.push(`//div[@role='button' and (contains(text(), '${t}') or contains(text(), '${capitalized}'))]`);
      xpathList.push(`//button[contains(text(), '${t}') or contains(text(), '${capitalized}')]`);
      xpathList.push(`//*[@role='button' and (contains(text(), '${t}') or contains(text(), '${capitalized}'))]`);
    }

    for (const xp of xpathList) {
      const foundByXPath = await page.evaluate(new Function('xp', 'texts', `
        try {
          const result = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = result.singleNodeValue;
          if (el) {
            // CRITICAL: Verify that the XPath element actually contains the target text to avoid false clicks!
            const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
            const hasMatchText = texts.some(t => text.includes(t));
            if (!hasMatchText) {
              return false;
            }
            
            console.log("[Browser] Found element by XPath fallback:", xp, "Text:", text);
            
            // Mark with unique automation attribute for native Puppeteer click
            el.setAttribute('data-automation-target', 'current-btn');

            let current = el;
            let levels = 0;
            while (current && levels < 4) {
              try {
                current.click();
              } catch (e) {}
              current = current.parentElement;
              levels++;
            }
            return true;
          }
        } catch (e) {}
        return false;
      `), xp, targetTexts);

      if (foundByXPath) {
        console.log(`[Automation] Successfully found and clicked Next/Share button via XPath fallback: ${xp}. Triggering native click...`);
        try {
          await page.click('[data-automation-target="current-btn"]');
          return true;
        } catch (err: any) {
          console.warn(`[Automation] Native page.click failed on XPath element: ${err.message}. Trying direct mouse-click fallback...`);
          const coords = await page.evaluate(new Function(`
            const el = document.querySelector('[data-automation-target="current-btn"]');
            if (el) {
              const rect = el.getBoundingClientRect();
              return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            return null;
          `));
          if (coords) {
            await page.mouse.click((coords as any).x, (coords as any).y);
            return true;
          }
        }
        return true;
      }
    }
  }

  console.warn(`[Automation] Could not find any button for texts: ${JSON.stringify(targetTexts)}`);
  return false;
}

async function triggerCreateButton(page: any) {
  return await page.evaluate(new Function(`
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const clickAllTheWayUp = (element) => {
      let current = element;
      let levels = 0;
      while (current && levels < 5) {
        try {
          current.click();
        } catch (e) {}
        current = current.parentElement;
        levels++;
      }
    };

    // Strategy 1: Find by SVG
    const svgs = Array.from(document.querySelectorAll("svg"));
    const createSvg = svgs.find((s) => {
      const label = s.getAttribute("aria-label");
      if (!label) return false;
      const l = label.toLowerCase();
      const matches = l.includes("create") || l.includes("new post") || l.includes("new_post") || l.includes("postingan") || l.includes("buat") || l.includes("crear") || l.includes("créer");
      if (!matches) return false;
      const parent = s.closest("div[role='button']") || s.closest("a") || s.parentElement;
      return isVisible(parent);
    });
    if (createSvg) {
      const btn = createSvg.closest("div[role='button']") || createSvg.closest("a") || createSvg.parentElement;
      if (btn) {
        clickAllTheWayUp(btn);
        return "svg-closest";
      }
    }
    
    // Strategy 2: Find by text content of button/div/span/a
    const createTexts = ["create", "new post", "buat", "crear", "créer", "erstellen", "nouvelle publication", "postingan baru", "buat postingan"];
    const elements = Array.from(document.querySelectorAll("button, a, div[role='button'], span, p"));
    for (const el of elements) {
      const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
      const matches = createTexts.includes(text) || (text.length > 0 && createTexts.some(t => text === t || text.includes(t)));
      if (matches) {
        const btn = el.closest("div[role='button']") || el.closest("a") || el;
        if (isVisible(btn)) {
          clickAllTheWayUp(btn);
          return "text-match: " + text;
        }
      }
    }

    // Strategy 3: Find by aria-label or title attribute of any element
    const allElements = Array.from(document.querySelectorAll("*"));
    const createAttrTexts = ["create", "new post", "new_post", "buat", "crear", "créer", "postingan baru", "buat postingan"];
    const matchedAttrEl = allElements.find((el) => {
      const ariaLabel = el.getAttribute("aria-label") ? el.getAttribute("aria-label").toLowerCase() : "";
      const title = el.getAttribute("title") ? el.getAttribute("title").toLowerCase() : "";
      const hasMatch = createAttrTexts.some(t => ariaLabel.includes(t) || title.includes(t));
      return hasMatch && isVisible(el);
    });
    if (matchedAttrEl) {
      clickAllTheWayUp(matchedAttrEl);
      return "aria-label/title-match: " + (matchedAttrEl.getAttribute("aria-label") || matchedAttrEl.getAttribute("title"));
    }

    return "none";
  `));
}

async function clickPostOption(page: any) {
  console.log(`[Automation] Checking for Instagram "Post" option menu/dropdown...`);
  return await page.evaluate(new Function(`
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const clickAllTheWayUp = (element) => {
      let current = element;
      let levels = 0;
      while (current && levels < 5) {
        try {
          current.click();
        } catch (e) {}
        current = current.parentElement;
        levels++;
      }
    };

    // Common localized terms for "Post" in the Create submenu on Instagram:
    const postTerms = ["post", "postingan", "publicación", "publication", "beitrag", "publicação", "Beitrag erstellen", "crear publicación"];
    
    // Let's gather all interactive tags
    const elements = Array.from(document.querySelectorAll("button, a, div[role='button'], div[role='menuitem'], span, p"));
    
    // Filter visible elements that match one of the terms closely
    for (const el of elements) {
      if (!isVisible(el)) continue;
      
      const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
      if (text.length > 0 && text.length < 25) {
        if (postTerms.includes(text) || postTerms.some(term => text === term.toLowerCase())) {
          console.log("[Browser] Found 'Post' option match by exact/close text:", text);
          clickAllTheWayUp(el);
          return true;
        }
      }
    }

    // Partial match with length constraints
    for (const el of elements) {
      if (!isVisible(el)) continue;
      const text = el.textContent ? el.textContent.trim().toLowerCase() : "";
      if (text.length > 0 && text.length < 35) {
        if (postTerms.some(term => text.includes(term.toLowerCase()))) {
          // Avoid matching the sidebar "Create" button itself if possible
          if (text.includes("create") && !text.includes("post") && !text.includes("beitrag") && !text.includes("publicación")) {
            continue;
          }
          console.log("[Browser] Found 'Post' option match by partial text:", text);
          clickAllTheWayUp(el);
          return true;
        }
      }
    }

    // SVG aria-label fallback match
    const svgs = Array.from(document.querySelectorAll("svg"));
    for (const s of svgs) {
      const label = s.getAttribute("aria-label");
      if (label) {
        const l = label.toLowerCase();
        if (postTerms.some(term => l === term.toLowerCase() || l.includes(term.toLowerCase()))) {
          const parent = s.closest("div[role='button']") || s.closest("div[role='menuitem']") || s.closest("a") || s.parentElement;
          if (parent && isVisible(parent)) {
            console.log("[Browser] Found 'Post' option match by SVG aria-label:", label);
            clickAllTheWayUp(parent);
            return true;
          }
        }
      }
    }

    return false;
  `));
}

async function emulateDragAndDropFiles(page: any, targetSelector: string, paths: string[]) {
  console.log(`[Automation] Emulating drag and drop for files: ${paths.join(", ")}`);
  
  await page.evaluate(new Function(`
    const existing = document.getElementById('puppeteer-drag-drop-input');
    if (existing) existing.remove();

    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'puppeteer-drag-drop-input';
    input.multiple = true;
    input.style.position = 'fixed';
    input.style.top = '0';
    input.style.left = '0';
    input.style.opacity = '0.001';
    input.style.pointerEvents = 'none';
    input.style.zIndex = '999999';
    document.body.appendChild(input);
  `));

  const dummyHandle = await page.$("#puppeteer-drag-drop-input");
  if (!dummyHandle) {
    throw new Error("Failed to create dummy file input for drag and drop.");
  }
  await dummyHandle.uploadFile(...paths);

  const dropSuccess = await page.evaluate(new Function('sel', `
    const dummy = document.getElementById('puppeteer-drag-drop-input');
    if (!dummy || !dummy.files || dummy.files.length === 0) {
      console.error("No files found on dummy input");
      return false;
    }

    const files = Array.from(dummy.files);
    console.log("[Browser] Found " + files.length + " files in dummy input. Dispatching drop...");

    let target = document.querySelector(sel);
    if (!target) {
      target = document.querySelector("div[role='dialog']") || document.body;
    }

    if (!target) {
      console.error("No target element found for drop event");
      return false;
    }

    const createDataTransfer = (fileList) => {
      const dt = new DataTransfer();
      for (const file of fileList) {
        dt.items.add(file);
      }
      return dt;
    };

    const dragEnterEvent = new DragEvent("dragenter", {
      bubbles: true,
      cancelable: true,
      dataTransfer: createDataTransfer(files),
    });
    target.dispatchEvent(dragEnterEvent);

    const dragOverEvent = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer: createDataTransfer(files),
    });
    target.dispatchEvent(dragOverEvent);

    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer: createDataTransfer(files),
    });
    target.dispatchEvent(dropEvent);

    console.log("[Browser] Drag & Drop events dispatched successfully on target:", target);
    dummy.remove();
    return true;
  `), targetSelector);

  return dropSuccess;
}

export async function publishToInstagram(page: any, content: string, localMediaPaths: string[], mediaDir: string): Promise<void> {
  if (localMediaPaths.length === 0) {
    throw new Error("Instagram is a visual-first platform and strictly requires at least one image or video to create a post. Please attach media and try again.");
  }

  console.log(`[Automation] Navigating to Instagram home page...`);
  try {
    await page.goto("https://www.instagram.com/", { waitUntil: "load", timeout: 30000 });
  } catch (navErr: any) {
    console.warn(`[Automation] Instagram navigation warning/timeout, checking if DOM is ready anyway:`, navErr.message || navErr);
  }
  
  await takeScreenshot(page, mediaDir, "1_initial_home");

  const currentUrl = page.url();
  if (currentUrl.includes("accounts/login") || currentUrl.includes("accounts/emailsignup") || currentUrl.includes("checkpoint") || currentUrl.includes("signup")) {
    throw new Error("Authentication failed: Instagram redirected to a login, signup, or security checkpoint page. Please refresh your session cookies.");
  }
  
  // 2. Check for save-info (onetap) redirects or modals
  if (page.url().includes("accounts/onetap")) {
    console.log(`[Automation] On Instagram "onetap" save info page. Clicking dismiss button...`);
    await dismissOverlays(page);
    await new Promise((r) => setTimeout(r, 4000));
  }

  // 3. Clear initial popups/consents sequentially
  console.log(`[Automation] Sequential popup/consent clearing...`);
  for (let i = 0; i < 3; i++) {
    await dismissOverlays(page);
  }
  
  await takeScreenshot(page, mediaDir, "2_after_popup_dismiss");

  console.log(`[Automation] Clicking "Create" button...`);
  let createClicked = false;
  const createLabels = ["create", "new post", "new_post", "buat", "crear", "créer"];
  for (const label of createLabels) {
    createClicked = await clickElementNative(page, label);
    if (createClicked) {
      console.log(`[Automation] Successfully clicked Create button using label: "${label}"`);
      break;
    }
  }

  if (!createClicked) {
    console.warn(`[Automation] Native coordinate click for Create button failed. Trying fallback DOM click...`);
    const strategyUsed = await triggerCreateButton(page);
    console.log(`[Automation] Create button fallback click strategy: ${strategyUsed}`);
  }

  await new Promise((r) => setTimeout(r, 4000));
  await takeScreenshot(page, mediaDir, "3_after_create_click");

  // Select "Post" from the dropdown overlay
  console.log(`[Automation] Selecting "Post" option from sub-menu dropdown...`);
  let postOptionClicked = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    postOptionClicked = await clickPostOption(page);
    if (postOptionClicked) {
      console.log(`[Automation] Successfully clicked "Post" option from dropdown (attempt ${attempt}). Waiting for modal...`);
      await new Promise((r) => setTimeout(r, 4000));
      await takeScreenshot(page, mediaDir, "3b_after_post_option_click");
      break;
    }
    if (attempt < 3) {
      console.log(`[Automation] "Post" option dropdown not detected on attempt ${attempt}. Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!postOptionClicked) {
    console.log(`[Automation] "Post" option dropdown sub-menu not found/clicked after retry attempts. Proceeding directly to file input search...`);
  }

  console.log(`[Automation] Uploading media to Instagram...`);
  let dragAndDropSuccess = false;
  
  // 1. ALWAYS try drag-and-drop emulation first to trigger standard UI event listeners (e.g. React/Lexical drag/drop states)
  console.log(`[Automation] Attempting drag-and-drop emulation on dialog overlay first...`);
  try {
    dragAndDropSuccess = await emulateDragAndDropFiles(page, "div[role='dialog']", localMediaPaths);
    if (dragAndDropSuccess) {
      console.log(`[Automation] Drag-and-drop emulation completed successfully!`);
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      console.warn(`[Automation] Drag-and-drop emulation returned false.`);
    }
  } catch (dragErr: any) {
    console.error(`[Automation] Drag-and-drop emulation failed:`, dragErr.message || dragErr);
  }

  let fileInputFound = false;
  let fileInputSelector = "input[type='file']";

  if (!dragAndDropSuccess) {
    console.log(`[Automation] Drag-and-drop was not confirmed. Falling back to locating and uploading via file input selector...`);
    // 2. Locate the file input and upload the files to it as a secondary layer
    const fileInputSelectors = [
      "form input[type='file']",
      "input[type='file']",
      "input[accept*='image']",
      "input[accept*='video']",
      "input[class='x1s85apg'][type='file']"
    ];
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[Automation] Attempt ${attempt} to locate file input selector...`);
        for (const sel of fileInputSelectors) {
          try {
            const inputEl = await page.$(sel);
            if (inputEl) {
              fileInputSelector = sel;
              fileInputFound = true;
              console.log(`[Automation] Found file input selector: ${sel}`);
              break;
            }
          } catch (selErr) {
            // ignore
          }
        }
        if (fileInputFound) {
          break;
        }
        
        if (attempt < 3) {
          console.warn(`[Automation] File input not found on attempt ${attempt}. Re-triggering Create button...`);
          // Try to click Create button again in case first click was swallowed by a closing dialog
          const retryStrategy = await triggerCreateButton(page);
          console.log(`[Automation] Re-clicked Create button with strategy: ${retryStrategy}`);
          await new Promise((r) => setTimeout(r, 4000));
          await takeScreenshot(page, mediaDir, `retry_create_click_${attempt}`);
        }
      } catch (err: any) {
        console.error(`[Automation] Error on attempt ${attempt}:`, err.message || err);
      }
    }

    if (fileInputFound) {
      console.log(`[Automation] Standard file input found. Uploading files to input selector: ${fileInputSelector}`);
      const fileInput = await page.$(fileInputSelector);
      if (fileInput) {
        await fileInput.uploadFile(...localMediaPaths);
      } else {
        console.warn("[Automation] File input element reference was null when attempting upload.");
      }
    }
  }

  if (!fileInputFound && !dragAndDropSuccess) {
    // Save failure screenshot
    await takeScreenshot(page, mediaDir, "failure_input_not_found");
    throw new Error("Instagram file input element not found and drag-and-drop emulation failed. Make sure your session is active, popups are cleared, and try again.");
  }

  await new Promise((r) => setTimeout(r, 6000));
  await takeScreenshot(page, mediaDir, "4_after_media_upload");

  console.log(`[Automation] Transitioning to Caption screen (requires clicking "Next" transitions)...`);
  let captionScreenReached = false;
  const maxNextClicks = 4; // Allow up to 4 attempts to click Next/fallback transition
  
  const shareLabels = ["share", "bagikan", "kirim", "compartir", "partager", "condividi", "pubblica", "compartilhar", "teilen"];

  for (let i = 1; i <= maxNextClicks; i++) {
    console.log(`[Automation] Transition loop: checking if Caption screen is active (attempt ${i}/${maxNextClicks})...`);
    
    const hasCaption = await page.evaluate(new Function('shareLabels', `
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };
      
      const dialogs = Array.from(document.querySelectorAll("div[role='dialog']"));
      const dialog = dialogs.find(isVisible);
      if (!dialog) return false;
      
      const box = dialog.querySelector("div[role='textbox']") || 
                  dialog.querySelector("div[data-lexical-editor='true']") || 
                  dialog.querySelector("div[contenteditable='true']") ||
                  dialog.querySelector("[aria-label*='caption']") ||
                  dialog.querySelector("[aria-label*='keterangan']");
      if (box && isVisible(box)) return true;

      // Also treat the screen as reached if a "Share" button is visible, which only occurs on the final caption screen
      const buttons = Array.from(dialog.querySelectorAll("button, div, span, a, p, [role='button']"));
      return buttons.some(el => {
        if (!isVisible(el)) return false;
        const text = (el.textContent || "").trim().toLowerCase();
        return shareLabels.includes(text);
      });
    `), shareLabels);

    if (hasCaption) {
      console.log(`[Automation] Caption screen reached successfully!`);
      captionScreenReached = true;
      break;
    }

    console.log(`[Automation] Caption screen not active yet. Clicking "Next" transition button...`);
    let nextClicked = await clickInstagramButtonByText(page, ["next", "selanjutnya", "berikutnya", "siguiente", "suivant", "weiter", "avançar", "avanti", "próximo"]);
    if (!nextClicked) {
      console.warn(`[Automation] Could not find "Next" button on current screen by text. Trying top-right fallback...`);
      const fallbackClicked = await clickTopRightModalButtonFallback(page, shareLabels);
      if (!fallbackClicked) {
        console.warn(`[Automation] Top-right button fallback failed.`);
      }
    }
    
    // Wait 4-5 seconds for transition to settle
    await new Promise((r) => setTimeout(r, 4500));
    await takeScreenshot(page, mediaDir, `transition_step_${i}`);
  }

  if (!captionScreenReached) {
    console.log(`[Automation] Finished transition loop. Checking final Caption screen status...`);
    const finalHasCaption = await page.evaluate(new Function('shareLabels', `
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };
      
      const dialogs = Array.from(document.querySelectorAll("div[role='dialog']"));
      const dialog = dialogs.find(isVisible);
      if (!dialog) return false;
      
      const box = dialog.querySelector("div[role='textbox']") || 
                  dialog.querySelector("div[data-lexical-editor='true']") || 
                  dialog.querySelector("div[contenteditable='true']") ||
                  dialog.querySelector("[aria-label*='caption']") ||
                  dialog.querySelector("[aria-label*='keterangan']");
      if (box && isVisible(box)) return true;

      // Also check for Share buttons
      const buttons = Array.from(dialog.querySelectorAll("button, div, span, a, p, [role='button']"));
      return buttons.some(el => {
        if (!isVisible(el)) return false;
        const text = (el.textContent || "").trim().toLowerCase();
        return shareLabels.includes(text);
      });
    `), shareLabels);
    if (finalHasCaption) {
      captionScreenReached = true;
      console.log(`[Automation] Final check: Caption screen is active.`);
    }
  }

  console.log(`[Automation] Waiting for Instagram caption editor textbox to appear...`);
  let targetCaptionData: { id: string; x: number; y: number } | null = null;
  const startTime = Date.now();
  const timeoutMs = 15000;

  while (Date.now() - startTime < timeoutMs) {
    const result = await page.evaluate(new Function(`
      const isVisible = (el) => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      // Try precise queries first based on user instruction
      const searchQueries = [
        "div[aria-label='Write a caption...'][role='textbox'][contenteditable='true']",
        "div[aria-label*='caption'][role='textbox'][contenteditable='true']",
        "div[aria-label*='keterangan'][role='textbox'][contenteditable='true']",
        "div[role='textbox'][contenteditable='true']",
        "div[contenteditable='true'][data-lexical-editor='true']",
        "div[aria-label*='caption'][contenteditable='true']",
        "div[aria-label*='keterangan'][contenteditable='true']",
        "div[contenteditable='true']",
        "div[role='textbox']"
      ];

      let foundEl = null;
      const dialogs = Array.from(document.querySelectorAll("div[role='dialog']"));
      const dialog = dialogs.find(isVisible);
      const parent = dialog || document;

      // 1. Try finding via specific xpath first (user-provided) within the parent/document
      const xpaths = [
        "/html/body/div[5]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]",
        "/html/body/div[6]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]",
        "/html/body/div[4]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]",
        "/html/body/div[7]/div[1]/div/div[3]/div/div/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div[2]/div/div[1]/div[1]"
      ];

      for (const xp of xpaths) {
        try {
          const res = document.evaluate(xp, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const el = res.singleNodeValue;
          if (el && isVisible(el)) {
            console.log("[Browser] Found visible caption via precise XPath:", xp);
            foundEl = el;
            break;
          }
        } catch (e) {}
      }

      // 2. Try queries on parent first (prioritizing the dialog)
      if (!foundEl) {
        for (const q of searchQueries) {
          try {
            const el = parent.querySelector(q);
            if (el && isVisible(el)) {
              console.log("[Browser] Found visible caption via parent query selector:", q);
              foundEl = el;
              break;
            }
          } catch (e) {}
        }
      }

      // 3. Fallback to broad document queries if dialog parent was missing or didn't contain it
      if (!foundEl && parent !== document) {
        for (const q of searchQueries) {
          try {
            const el = document.querySelector(q);
            if (el && isVisible(el)) {
              console.log("[Browser] Found visible caption via document query selector:", q);
              foundEl = el;
              break;
            }
          } catch (e) {}
        }
      }

      // 4. Fallback to broad dialog search if still not found
      if (!foundEl) {
        try {
          // Search for any div with contenteditable and role textbox
          const el = parent.querySelector("div[contenteditable='true']") || 
                     parent.querySelector("div[role='textbox']") || 
                     parent.querySelector("div[data-lexical-editor='true']");
          if (el && isVisible(el)) {
            console.log("[Browser] Found visible caption via broad fallback in dialog:", el);
            foundEl = el;
          }
        } catch (e) {}
      }

      if (foundEl) {
        foundEl.setAttribute("id", "target-insta-caption-editor");
        const rect = foundEl.getBoundingClientRect();
        return {
          id: "#target-insta-caption-editor",
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }

      return null;
    `));

    if (result) {
      targetCaptionData = result as { id: string; x: number; y: number };
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (targetCaptionData) {
    console.log(`[Automation] Preparing Instagram caption editor node and placing caret...`);
    const initResult = await page.evaluate(new Function(`
      const el = document.getElementById("target-insta-caption-editor");
      if (!el) return { success: false, error: "Element not found" };
      try {
        el.focus();
        
        // Find an existing paragraph/text node to place caret or fall back to the editor itself
        const p = el.querySelector("p") || el;
        
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(p);
        range.collapse(false); // Position caret at the end of the node safely
        sel.removeAllRanges();
        sel.addRange(range);

        return { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    `));

    console.log(`[Automation] Caret placement result:`, initResult);
    await new Promise((r) => setTimeout(r, 1000));

    console.log(`[Automation] Clicking on caption editor coordinates to focus:`, targetCaptionData.x, targetCaptionData.y);
    await page.mouse.click(targetCaptionData.x, targetCaptionData.y);
    await new Promise((r) => setTimeout(r, 1000));

    console.log(`[Automation] Typing caption via native Puppeteer keyboard emulation...`);
    await page.keyboard.type(content, { delay: 40 });
    await new Promise((r) => setTimeout(r, 1500));

    // Let's print out what is actually in the caption box to verify!
    let currentContent = await page.evaluate(new Function(`
      const el = document.getElementById("target-insta-caption-editor");
      return el ? (el.textContent || el.innerText || "").trim() : null;
    `));
    console.log(`[Automation] Verified caption editor content after typing: "${currentContent}"`);
    
    // If caption is still empty (fallback), let's apply the safe, native execCommand insertText fallback
    if (!currentContent || currentContent.length === 0) {
      console.log(`[Automation] Keyboard type failed or was not captured. Applying robust execCommand insertText fallback...`);
      const fallbackResult = await page.evaluate(new Function('text', `
        const el = document.getElementById("target-insta-caption-editor");
        if (!el) return { success: false, error: "Element not found" };
        try {
          el.focus();
          const p = el.querySelector("p") || el;
          
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(p);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);

          // Use standard insertText command which Lexical natively supports and intercepts
          const ok = document.execCommand('insertText', false, text);
          
          // If execCommand failed or didn't insert anything, fallback to setting textContent
          if (!ok || !el.textContent || el.textContent.trim().length === 0) {
            console.warn("[Browser] execCommand insertText failed, falling back to direct paragraph content");
            p.textContent = text;
            
            // Dispatch input event to notify React/Lexical listeners
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }

          return { success: true, textLength: el.textContent ? el.textContent.length : 0 };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      `), content);

      console.log(`[Automation] JS Event Fallback result:`, fallbackResult);
    }
  } else {
    console.error(`[Automation] Could not find any caption input element!`);
    throw new Error("Instagram caption input textbox not found. Please verify the active session state or modal screen transition.");
  }
  await new Promise((r) => setTimeout(r, 2000));
  await takeScreenshot(page, mediaDir, "7_after_caption_typed");

  console.log(`[Automation] Clicking "Share" button to publish...`);
  let shareClicked = await clickInstagramButtonByText(page, ["share", "bagikan", "kirim", "compartir", "partager", "condividi", "pubblica", "compartilhar", "teilen"]);
  if (!shareClicked) {
    console.warn(`[Automation] Could not find "Share" button by text. Trying top-right fallback...`);
    const fallbackClicked = await clickTopRightModalButtonFallback(page);
    if (!fallbackClicked) {
      console.warn(`[Automation] Top-right button fallback failed.`);
    }
  }
  
  console.log(`[Automation] Waiting for Instagram post upload and dialog closure...`);
  await new Promise((r) => setTimeout(r, 10000));
  await takeScreenshot(page, mediaDir, "8_after_share_click");
  
  const instagramDialogOpen = await page.evaluate(new Function('return !!document.querySelector("div[role=\'dialog\']");'));
  if (instagramDialogOpen) {
    console.log(`[Automation] Instagram compose dialog still open, attempting to click Share button again...`);
    await clickInstagramButtonByText(page, ["share", "bagikan", "kirim", "compartir", "partager", "condividi", "pubblica", "compartilhar", "teilen"]);
    await new Promise((r) => setTimeout(r, 6000));
    await takeScreenshot(page, mediaDir, "9_after_retry_share_click");
  }
  
  console.log(`[Automation] ✅ Successfully published to Instagram`);
}
