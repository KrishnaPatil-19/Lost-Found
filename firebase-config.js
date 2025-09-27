// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-AEShVLnettzTsGfpEdyuxnzdN2ms06o",
  authDomain: "lostfounddb-bdcf3.firebaseapp.com",
  projectId: "lostfounddb-bdcf3",
  storageBucket: "lostfounddb-bdcf3.appspot.com",
  messagingSenderId: "990667242789",
  appId: "1:990667242789:web:7eed1bbcfbde975589aecc",
  measurementId: "G-9YWQSXVZZK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
window.db = firebase.firestore();
