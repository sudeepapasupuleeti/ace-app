import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './db';

const BACKGROUND_GEOLOCK = 'BACKGROUND_GEOLOCK';

// Mock Hub Config
export const HUB_LAT = 40.7128;
export const HUB_LNG = -74.0060;
export const RADIUS_METERS = 50;

// Haversine formula to calculate distance in meters
const getDistanceFromMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
};

let currentCourtId = null;
let currentUid = null;
let awayTimer5m = null;
let awayTimer10m = null;

const clearTimers = () => {
    if (awayTimer5m) clearTimeout(awayTimer5m);
    if (awayTimer10m) clearTimeout(awayTimer10m);
    awayTimer5m = null;
    awayTimer10m = null;
};

// Define Background Task
TaskManager.defineTask(BACKGROUND_GEOLOCK, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error: ", error);
    return;
  }
  if (data && currentCourtId && currentUid) {
    const { locations } = data;
    const loc = locations[0];
    
    if (loc) {
      let dist = getDistanceFromMeters(loc.coords.latitude, loc.coords.longitude, HUB_LAT, HUB_LNG);
      if (forceExitMock) {
        dist = 100; // override for testing
      }
      const isInside = dist <= RADIUS_METERS;

      if (!isInside) {
        if (!awayTimer5m && !awayTimer10m) {
          // If distance > 50m, start a local timer.
          awayTimer5m = setTimeout(async () => {
            try {
              await updateDoc(doc(db, "courts", currentCourtId), { status: 'pending' });
            } catch(e) { console.error(e); }
          }, 300000); // At 300s (5m), set status 'pending'

          awayTimer10m = setTimeout(async () => {
            try {
              await updateDoc(doc(db, "courts", currentCourtId), { status: 'released', claimedBy: null });
            } catch(e) { console.error(e); }
            clearTimers();
          }, 600000); // At 600s (10m), call releaseCourt
        }
      } else {
        // If distance < 50m, clear all timers and set status 'active'
        if (awayTimer5m || awayTimer10m) {
          clearTimers();
          try {
            await updateDoc(doc(db, "courts", currentCourtId), { status: 'active' });
          } catch(e) { console.error(e); }
        }
      }
    }
  }
});

let forceExitMock = false;

// Custom Hooks

export const useSilentSentry = (uid, courtId) => {
  useEffect(() => {
    currentUid = uid;
    currentCourtId = courtId;
  }, [uid, courtId]);

  useEffect(() => {
    const setupGeofence = async () => {
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') return;
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') return;

        // Verify task definition
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GEOLOCK);
        if (!isRegistered) {
          await Location.startLocationUpdatesAsync(BACKGROUND_GEOLOCK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 20000, // Check every 20 seconds
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
          });
        }
      } catch (err) {
        console.error("Error setting up Silent Sentry tracking: ", err);
      }
    };
    setupGeofence();

    return () => {
      Location.stopLocationUpdatesAsync(BACKGROUND_GEOLOCK).catch(console.error);
      clearTimers();
    };
  }, []);

  // Notifications
  useEffect(() => {
    if (!courtId) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const unsubscribe = onSnapshot(doc(db, "courts", courtId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'pending') {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Court Status Pending",
              body: "WARNING: You have 5 minutes to return to the Hub or you will lose your court.",
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null,
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [courtId]);
};

export const useDebugSentry = () => {
  const [currentDistance, setCurrentDistance] = useState(0);
  const [isInside, setIsInside] = useState(true);

  useEffect(() => {
    let watchSubscription;
    const watchLoc = async () => {
      try {
        watchSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000 },
          (loc) => {
            let dist = getDistanceFromMeters(loc.coords.latitude, loc.coords.longitude, HUB_LAT, HUB_LNG);
            if (forceExitMock) dist = 100;
            setCurrentDistance(dist);
            setIsInside(dist <= RADIUS_METERS);
          }
        );
      } catch (err) {
        console.error("Error watching debug location: ", err);
      }
    };
    watchLoc();

    return () => {
      if (watchSubscription) watchSubscription.remove();
    };
  }, []);

  const forceExit = () => {
    forceExitMock = !forceExitMock;
  };

  return { currentDistance, isInside, forceExit };
};
