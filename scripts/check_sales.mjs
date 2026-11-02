import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA5BYLViDPztgg7WB9e9zFmYQ90DSBCnXY",
  authDomain: "cr-bazar.firebaseapp.com",
  projectId: "cr-bazar",
  storageBucket: "cr-bazar.firebasestorage.app",
  messagingSenderId: "512655251582",
  appId: "1:512655251582:web:8410f093c5fcf88644e02f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const userCredential = await signInWithEmailAndPassword(auth, "prueba51@gmail.com", "12345678");
  const uid = userCredential.user.uid;

  const salesSnap = await getDocs(query(collection(db, "users", uid, "sales"), orderBy("created_at", "desc"), limit(5)));
  console.log("Total sales in query:", salesSnap.size);
  salesSnap.forEach(d => {
    const s = d.data();
    console.log("SALE ID:", d.id);
    console.log("receipt_no:", s.receipt_no);
    console.log("total:", s.total, "subtotal:", s.subtotal, "currency:", s.currency);
    console.log("items:", JSON.stringify(s.items, null, 2));
    console.log("full sale:", JSON.stringify(s, null, 2));
    console.log("-----------------------------------------");
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
