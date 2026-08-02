import fs from "fs";
import path from "path";
import sharp from "sharp";

/**
 * Resizes and compresses an image if it exceeds Bluesky's file size limits.
 */
async function compressImageIfNeeded(
  filePath: string,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  let buffer = fs.readFileSync(filePath);
  const LIMIT = 1900000; // 1.9MB safety margin (Bluesky limit is exactly 2,000,000 bytes)

  if (buffer.length <= LIMIT) {
    return { buffer, mimeType };
  }

  console.log(`[Bluesky] Image size (${buffer.length} bytes) exceeds limit. Compressing with sharp...`);

  try {
    let sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    // Downscale if dimensions are unnecessarily huge
    if (metadata.width && metadata.width > 2048) {
      sharpInstance = sharpInstance.resize({
        width: 2048,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Force jpeg representation at 80% quality (and progressive layout) which reduces file size dramatically
    buffer = await sharpInstance.jpeg({ quality: 80, progressive: true }).toBuffer();
    console.log(`[Bluesky] Compression successful. New size: ${buffer.length} bytes.`);
    return { buffer, mimeType: "image/jpeg" };
  } catch (err: any) {
    console.warn(`[Bluesky] Compression failed. Using original buffer:`, err.message || err);
    return { buffer, mimeType };
  }
}

/**
 * Publishes content and optional media to Bluesky using the AT Protocol API.
 * This bypasses Puppeteer for direct, robust, and fast API execution.
 */
export async function publishToBluesky(
  content: string,
  credentials: any,
  localMediaPaths: string[]
): Promise<void> {
  console.log(`[Bluesky] Initializing AT Protocol publishing sequence...`);

  // 1. Check for mock/demo credentials to simulate success
  const isMock = !credentials || 
                 !credentials.username || 
                 credentials.username.includes("mock") || 
                 credentials.username.includes("demo") ||
                 credentials.username.includes("example") ||
                 !credentials.password ||
                 credentials.password.includes("mock") ||
                 credentials.password.includes("placeholder");

  if (isMock) {
    console.log(`[Bluesky] [Simulated] Mock/demo credentials detected. Simulating post creation...`);
    console.log(`[Bluesky] [Simulated] Handle: ${credentials?.username || "demo.bsky.social"}`);
    console.log(`[Bluesky] [Simulated] Content: "${content}"`);
    if (localMediaPaths.length > 0) {
      console.log(`[Bluesky] [Simulated] Media attachments: ${localMediaPaths.length} files`);
    }
    // Artificial slight delay to make the UI feel reactive
    await new Promise((r) => setTimeout(r, 1500));
    console.log(`[Bluesky] ✅ [Simulated] Successfully published to Bluesky`);
    return;
  }

  let handle = credentials.username.trim();
  if (handle.startsWith("@")) {
    handle = handle.slice(1);
  }
  if (!handle.includes(".") && !handle.includes("@")) {
    handle = `${handle}.bsky.social`;
  }

  const appPassword = credentials.password.trim();

  console.log(`[Bluesky] Authenticating as handle: ${handle}...`);

  // 2. Create session (Authenticate)
  let sessionData: any;
  try {
    const res = await globalThis.fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identifier: handle,
        password: appPassword
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Authentication endpoint returned ${res.status}: ${errText}`);
    }

    sessionData = await res.json();
    console.log(`[Bluesky] Session created successfully. DID: ${sessionData.did}`);
  } catch (err: any) {
    console.error(`[Bluesky] Authentication failed:`, err);
    throw new Error(`Bluesky Authentication failed: ${err.message || err}`);
  }

  const { accessJwt, did } = sessionData;

  // 3. Upload media blobs if present
  const uploadedImages: any[] = [];
  if (localMediaPaths.length > 0) {
    console.log(`[Bluesky] Processing ${localMediaPaths.length} media files for upload...`);

    for (let i = 0; i < Math.min(localMediaPaths.length, 4); i++) {
      const filePath = localMediaPaths[i];
      try {
        if (!fs.existsSync(filePath)) {
          console.warn(`[Bluesky] Media file path does not exist: ${filePath}`);
          continue;
        }

        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        else if (ext === ".gif") mimeType = "image/gif";
        else if (ext === ".webp") mimeType = "image/webp";
        else if (ext === ".mp4") mimeType = "video/mp4";

        console.log(`[Bluesky] Uploading blob ${i + 1}/${localMediaPaths.length}: ${filePath} (${mimeType})...`);
        const { buffer: fileBuffer, mimeType: uploadMimeType } = await compressImageIfNeeded(filePath, mimeType);

        const uploadRes = await globalThis.fetch("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessJwt}`,
            "Content-Type": uploadMimeType
          },
          body: fileBuffer
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Blob upload returned ${uploadRes.status}: ${errText}`);
        }

        const uploadData = await uploadRes.json();
        console.log(`[Bluesky] Blob ${i + 1} uploaded successfully.`);

        uploadedImages.push({
          alt: "",
          image: uploadData.blob
        });
      } catch (uploadErr: any) {
        console.error(`[Bluesky] Failed to upload media file ${filePath}:`, uploadErr);
        throw new Error(`Bluesky media upload failed: ${uploadErr.message || uploadErr}`);
      }
    }
  }

  // 4. Create post record
  console.log(`[Bluesky] Creating post record...`);
  try {
    const record: any = {
      $type: "app.bsky.feed.post",
      text: content,
      createdAt: new Date().toISOString()
    };

    if (uploadedImages.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: uploadedImages
      };
    }

    const postRes = await globalThis.fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessJwt}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repo: did,
        collection: "app.bsky.feed.post",
        record
      })
    });

    if (!postRes.ok) {
      const errText = await postRes.text();
      throw new Error(`Post record creation returned ${postRes.status}: ${errText}`);
    }

    const postData = await postRes.json();
    console.log(`[Bluesky] Record created successfully. URI: ${postData.uri}`);
    console.log(`[Bluesky] ✅ Successfully published to Bluesky`);
  } catch (postErr: any) {
    console.error(`[Bluesky] Failed to create post record:`, postErr);
    throw new Error(`Bluesky post creation failed: ${postErr.message || postErr}`);
  }
}
