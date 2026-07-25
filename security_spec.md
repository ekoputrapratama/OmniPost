# Security Specification for OmniPost Automation Hub

This document defines the security boundaries, data invariants, adversarial threat models ("Dirty Dozen" payloads), and validation approaches to ensure a Zero-Trust state for OmniPost.

## 1. Data Invariants

1. **User Identity Invariant**: Users can only read, create, and update their own user record under `/users/{userId}`.
2. **Account Ownership Invariant**: Social media credentials stored under `/connectedAccounts/{accountId}` must belong to the authenticated user (`userId == request.auth.uid`). No cross-user reads, updates, or deletions are permitted.
3. **Post Ownership Invariant**: Social media posts stored under `/posts/{postId}` must belong to the authenticated user (`userId == request.auth.uid`).
4. **ID Integrity**: Every document ID (`userId`, `accountId`, `postId`) must conform to a strict alphanumeric pattern (`^[a-zA-Z0-9_\-]+$`) and have a maximum size of 128 characters.
5. **Payload Schema & Volumetric Constraints**: All fields must have strict type checks (e.g., `content` is string, `platforms` is list) and safe length bounds.
6. **Immutability Invariants**: Critical audit fields such as `createdAt`, `userId`, and `id` must be immutable once created.
7. **Temporal Validation**: Update times and creation times (where server-driven) must match `request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

Below are the 12 specific payloads designed to break the rules of identity, integrity, or state, which the security rules must actively reject.

### Threat Model 1: Identity Spoofing & Privilege Escalation
#### Payload 1: Attempt to create a connected account for another user
*   **Target Path**: `/connectedAccounts/victim_twitter`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "userId": "victim_456",
      "platform": "Twitter",
      "method": "credentials",
      "encryptedData": "encrypted_malicious_payload",
      "createdAt": "2026-07-25T04:46:18Z"
    }
    ```

#### Payload 2: Attempt to write to another user's profile
*   **Target Path**: `/users/victim_456`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "email": "victim_email@gmail.com",
      "createdAt": "2026-07-25T04:46:18Z"
    }
    ```

---

### Threat Model 2: State and Logic Shortcutting
#### Payload 3: Attempt to update a post's status directly to "published"
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "attacker_123",
      "content": "Hello world",
      "platforms": ["Twitter"],
      "status": "published",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```
    *(Attempting to bypass the background automation queue entirely).*

#### Payload 4: Attempt to corrupt post status with arbitrary invalid values
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "attacker_123",
      "content": "Hello",
      "platforms": ["Twitter"],
      "status": "SUPER_ADMIN_MODE",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

---

### Threat Model 3: Resource Poisoning & Denial of Wallet
#### Payload 5: Attempt to inject massive text payload into Post content (1MB+ string)
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "attacker_123",
      "content": "A".repeat(1000000), // Bypasses length boundaries
      "platforms": ["Twitter"],
      "status": "pending",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

#### Payload 6: Attempt to use toxic characters or SQL/XSS in platform names
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "attacker_123",
      "content": "A",
      "platforms": ["<script>alert(1)</script>"],
      "status": "pending",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

---

### Threat Model 4: Shadow/Orphaned Field Injections
#### Payload 7: Shadow field injection to escalate roles or bypass checks (Ghost Field)
*   **Target Path**: `/users/attacker_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "email": "attacker@gmail.com",
      "createdAt": "2026-07-25T04:46:18Z",
      "isAdmin": true
    }
    ```

#### Payload 8: Shadow field injection on connected account
*   **Target Path**: `/connectedAccounts/attacker_twitter`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "userId": "attacker_123",
      "platform": "Twitter",
      "method": "credentials",
      "encryptedData": "...",
      "createdAt": "2026-07-25T04:46:18Z",
      "bypassEncryption": true
    }
    ```

---

### Threat Model 5: Temporal and Immutability Violations
#### Payload 9: Attempt to modify historical `createdAt` timestamp
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "attacker_123",
      "content": "Updated content",
      "platforms": ["Twitter"],
      "status": "pending",
      "createdAt": "1999-01-01T00:00:00Z", // Attempting to backdate post
      "mediaUrls": []
    }
    ```

#### Payload 10: Attempt to hijack ownership by updating `userId`
*   **Target Path**: `/posts/my_post_123`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "my_post_123",
      "userId": "victim_456", // Hijacking target
      "content": "Updated",
      "platforms": ["Twitter"],
      "status": "pending",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

---

### Threat Model 6: Path Poisoning & ID Hijacking
#### Payload 11: Maliciously long or toxic document ID targeting `posts` collection
*   **Target Path**: `/posts/malicious_post_id_with_more_than_128_characters_and_toxic_characters_$$$$$_###`
*   **Actor UID**: `attacker_123`
*   **Malicious Payload**:
    ```json
    {
      "id": "malicious_post_id_with_more_than_128_characters_and_toxic_characters_$$$$$_###",
      "userId": "attacker_123",
      "content": "Hello",
      "platforms": ["Twitter"],
      "status": "pending",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

#### Payload 12: Unsigned/Anonymous write attempt
*   **Target Path**: `/posts/post_123`
*   **Actor UID**: `null` (Anonymous / Not authenticated)
*   **Malicious Payload**:
    ```json
    {
      "id": "post_123",
      "userId": "some_user",
      "content": "Anoymous post",
      "platforms": ["Twitter"],
      "status": "pending",
      "createdAt": "2026-07-25T04:46:18Z",
      "mediaUrls": []
    }
    ```

---

## 3. The Test Suite Spec (`firestore.rules.test.ts`)

Here is the complete TypeScript test runner specification that validates these constraints.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "studio-7539983584-87ac7",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("OmniPost Firestore Security Rules Test", () => {
  // Test Model 1: Identity Spoofing & Privilege Escalation
  test("Payload 1: Reject connected account creation for other users", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const maliciousDoc = doc(db, "connectedAccounts", "victim_twitter");
    
    await expect(
      setDoc(maliciousDoc, {
        userId: "victim_456",
        platform: "Twitter",
        method: "credentials",
        encryptedData: "encrypted_malicious_payload",
        createdAt: "2026-07-25T04:46:18Z"
      })
    ).rejects.toThrow();
  });

  test("Payload 2: Reject user profile write for other users", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const maliciousDoc = doc(db, "users", "victim_456");
    
    await expect(
      setDoc(maliciousDoc, {
        email: "victim_email@gmail.com",
        createdAt: new Date()
      })
    ).rejects.toThrow();
  });

  // Test Model 2: State and Logic Shortcutting
  test("Payload 3: Reject direct setting of post status to 'published' by client", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const maliciousDoc = doc(db, "posts", "my_post_123");
    
    await expect(
      setDoc(maliciousDoc, {
        id: "my_post_123",
        userId: "attacker_123",
        content: "Hello world",
        platforms: ["Twitter"],
        status: "published",
        createdAt: "2026-07-25T04:46:18Z",
        mediaUrls: []
      })
    ).rejects.toThrow();
  });

  // Test Model 3: Resource Poisoning & Denial of Wallet
  test("Payload 5: Reject post with excessive length content (size check)", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const maliciousDoc = doc(db, "posts", "my_post_123");
    
    await expect(
      setDoc(maliciousDoc, {
        id: "my_post_123",
        userId: "attacker_123",
        content: "A".repeat(100000),
        platforms: ["Twitter"],
        status: "pending",
        createdAt: "2026-07-25T04:46:18Z",
        mediaUrls: []
      })
    ).rejects.toThrow();
  });

  // Test Model 4: Shadow/Orphaned Field Injections
  test("Payload 7: Reject shadow field injection in user profile", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const maliciousDoc = doc(db, "users", "attacker_123");
    
    await expect(
      setDoc(maliciousDoc, {
        email: "attacker@gmail.com",
        createdAt: new Date(),
        isAdmin: true
      })
    ).rejects.toThrow();
  });

  // Test Model 5: Temporal and Immutability Violations
  test("Payload 10: Reject post owner modification after creation", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const postDoc = doc(db, "posts", "my_post_123");
    
    // Seed the post
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "posts", "my_post_123"), {
        id: "my_post_123",
        userId: "attacker_123",
        content: "Original Content",
        platforms: ["Twitter"],
        status: "pending",
        createdAt: "2026-07-25T04:46:18Z",
        mediaUrls: []
      });
    });

    // Try modifying ownership
    await expect(
      updateDoc(postDoc, {
        userId: "victim_456"
      })
    ).rejects.toThrow();
  });

  // Test Model 6: Path Poisoning & Anonymous writes
  test("Payload 11: Reject post with invalid toxic ID", async () => {
    const attackerContext = testEnv.authenticatedContext("attacker_123");
    const db = attackerContext.firestore();
    const toxicDoc = doc(db, "posts", "malicious_post_id_with_more_than_128_characters_and_toxic_characters_$$$$$_###");
    
    await expect(
      setDoc(toxicDoc, {
        id: "malicious_post_id_with_more_than_128_characters_and_toxic_characters_$$$$$_###",
        userId: "attacker_123",
        content: "Hello",
        platforms: ["Twitter"],
        status: "pending",
        createdAt: "2026-07-25T04:46:18Z",
        mediaUrls: []
      })
    ).rejects.toThrow();
  });

  test("Payload 12: Reject unauthenticated write attempt", async () => {
    const anonContext = testEnv.unauthenticatedContext();
    const db = anonContext.firestore();
    const targetDoc = doc(db, "posts", "post_123");
    
    await expect(
      setDoc(targetDoc, {
        id: "post_123",
        userId: "some_user",
        content: "Anonymous",
        platforms: ["Twitter"],
        status: "pending",
        createdAt: "2026-07-25T04:46:18Z",
        mediaUrls: []
      })
    ).rejects.toThrow();
  });
});
```
