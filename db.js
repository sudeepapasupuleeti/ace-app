import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, runTransaction } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Joins waitlist.
 * Uses a transaction to ensure position (timestamp) is unique and sequential.
 */
export const joinWaitlist = async (uid) => {
  const waitlistRef = doc(db, "waitlist", "current");
  
  try {
    await runTransaction(db, async (transaction) => {
      const waitlistDoc = await transaction.get(waitlistRef);
      if (!waitlistDoc.exists()) {
        throw new Error("Waitlist document does not exist");
      }
      
      const data = waitlistDoc.data();
      const currentList = data.queue || [];
      
      // Ensure unique uid
      if (currentList.some(entry => entry.uid === uid)) {
        throw new Error("User already in waitlist");
      }

      currentList.push({
        uid,
        timestamp: Date.now() // Sequential timestamp
      });

      transaction.update(waitlistRef, { queue: currentList });
    });
  } catch (error) {
    console.error("Error joining waitlist: ", error);
  }
};

/**
 * Claim court.
 * MUST check two conditions: waitlist[0].uid == current_uid AND is_inside_geofence == true.
 */
export const claimCourt = async (uid, isInsideGeofence, courtId) => {
  const waitlistRef = doc(db, "waitlist", "current");
  const courtRef = doc(db, "courts", courtId);

  try {
    await runTransaction(db, async (transaction) => {
      const waitlistDoc = await transaction.get(waitlistRef);
      
      if (!waitlistDoc.exists()) {
        throw new Error("Waitlist document does not exist");
      }

      const data = waitlistDoc.data();
      const currentList = data.queue || [];

      // Check Condition 1
      if (currentList.length === 0 || currentList[0].uid !== uid) {
        throw new Error("User is not first in waitlist");
      }

      // Check Condition 2
      if (!isInsideGeofence) {
        throw new Error("User is not inside the geofence");
      }

      transaction.update(courtRef, {
        status: "active",
        claimedBy: uid,
        claimedAt: Date.now()
      });

      currentList.shift();
      transaction.update(waitlistRef, { queue: currentList });
    });
  } catch (error) {
    console.error("Error claiming court: ", error);
  }
};
