import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase アプリを初期化
const app = initializeApp(firebaseConfig);

// Firestore のインスタンスを取得
export const db = getFirestore(app);

// getCapstockItems を定義
export const getCapstockItems = async () => {
  const docRef = doc(db, "capstock", "items");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data(); // { sake893: "あくま" } のようなデータを取得
  } else {
    console.log("ドキュメントが存在しません");
    return null;
  }
};
