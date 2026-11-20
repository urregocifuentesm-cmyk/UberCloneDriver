// Code documentation: Push notification registration and trip notifications.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Expo Notifications usa FCM en Android; guarda el token para avisar nuevas solicitudes.
export async function registerPushToken(driverId) {
  if (isDemoMode || !Device.isDevice) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updateDoc(doc(db, 'drivers', driverId), { pushToken: token });
}

