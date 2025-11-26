import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    Alert.alert(
      'Notifications not supported',
      'Push notifications are not supported on emulators. Please use a physical device for this feature.'
    );
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission required', 'Failed to get push token for push notification!');
    return null;
  }
  
  // We don't strictly need the token for local scheduling, but good to have for remote
  // const token = (await Notifications.getExpoPushTokenAsync()).data;
  // return token;
  return true;
};

export const scheduleTaskNotification = async (title, date, time) => {
  try {
    // Parse the date and time strings into a Date object
    // Assumes date is "YYYY-MM-DD" and time is "HH:MM AM/PM"
    const [year, month, day] = date.split('-').map(Number);
    
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;

    const triggerDate = new Date(year, month - 1, day, hours, minutes);

    // If the time is in the past, don't schedule
    if (triggerDate < new Date()) return;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder",
        body: `It's time for: ${title}`,
        sound: 'default',
      },
      trigger: triggerDate,
    });
    
    console.log(`Notification scheduled for ${triggerDate} with ID: ${id}`);
    return id;
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }
};