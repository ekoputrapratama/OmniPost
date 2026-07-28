import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  collection as fsCollection, 
  doc as fsDoc, 
  setDoc as fsSetDoc, 
  getDocs as fsGetDocs, 
  query as fsQuery, 
  where as fsWhere,
  getDocFromServer as fsGetDocFromServer
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import firebaseConfig from './firebaseConfig';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const isMockFirebase = !firebaseConfig.apiKey || 
                       firebaseConfig.apiKey.includes("mock") || 
                       firebaseConfig.apiKey.includes("placeholder");

let db: any;
let storage: any;
let collection = fsCollection;
let doc = fsDoc;
let setDoc = fsSetDoc;
let query = fsQuery;
let where = fsWhere;
let getDocs = fsGetDocs;
let getDocFromServer = fsGetDocFromServer;

if (isMockFirebase) {
  storage = { isMock: true };
  console.log("⚠️ Client-side running in Local Fallback Mock Mode (localStorage)");
  
  const readLocalDb = () => {
    try {
      const data = localStorage.getItem("omnipost_mock_db");
      if (data) return JSON.parse(data);
    } catch (_) {}
    return { posts: {}, connectedAccounts: {} };
  };

  const writeLocalDb = (data: any) => {
    try {
      localStorage.setItem("omnipost_mock_db", JSON.stringify(data));
    } catch (_) {}
  };

  db = { isMock: true };

  collection = ((_: any, path: string) => {
    return { path };
  }) as any;

  doc = ((_: any, collPath: string, docId: string) => {
    return { collPath, docId };
  }) as any;

  setDoc = (async (docRef: any, data: any, options?: { merge?: boolean }) => {
    const { collPath, docId } = docRef;
    const dbData = readLocalDb();
    if (!dbData[collPath]) dbData[collPath] = {};
    if (options?.merge) {
      dbData[collPath][docId] = { ...(dbData[collPath][docId] || {}), ...data };
    } else {
      dbData[collPath][docId] = data;
    }
    writeLocalDb(dbData);
  }) as any;

  where = ((field: string, op: string, value: any) => {
    return { field, op, value };
  }) as any;

  query = ((collRef: any, ...constraints: any[]) => {
    return { collPath: collRef.path, constraints };
  }) as any;

  getDocs = (async (queryOrColl: any) => {
    const collPath = queryOrColl.collPath || queryOrColl.path;
    const constraints = queryOrColl.constraints || [];
    const dbData = readLocalDb();
    const collectionData = dbData[collPath] || {};
    
    let docs = Object.values(collectionData);
    for (const filter of constraints) {
      if (filter && filter.field) {
        const { field, op, value } = filter;
        docs = docs.filter((item: any) => {
          const itemValue = item[field];
          if (op === "==") return itemValue === value;
          return true;
        });
      }
    }
    
    return {
      docs: docs.map((item: any) => ({
        data: () => item,
        id: item.id || item.platform
      }))
    };
  }) as any;

  getDocFromServer = (async () => {
    return { exists: () => false, data: () => null };
  }) as any;
} else {
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  storage = getStorage(app);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { 
  auth, 
  db, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  isMockFirebase,
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  getDocFromServer,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL
};
