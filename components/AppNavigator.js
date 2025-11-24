import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Home, Calendar, User, XCircle } from 'lucide-react-native'; 
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { NavigationContainer } from '@react-navigation/native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PlannerScreen from '../screens/PlannerScreen';
import MissedScreen from '../screens/MissedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddScreen from '../screens/AddScreen';

// --- Constants ---
const LightColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  textPrimary: '#1F1F1F',
  textSecondary: '#6B7280',
  accentOrange: '#FF9500', 
  progressRed: '#FF4500',  
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Gradient icon wrapper
const GradientIcon = ({ IconComponent, size = 26, color }) => (
  <MaskedView
    maskElement={<IconComponent color="black" size={size} />}
  >
    <LinearGradient
      colors={[LightColors.accentOrange, LightColors.progressRed]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size }}
    />
  </MaskedView>
);

const TabNavigator = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarShowLabel: true, // Show labels
        tabBarStyle: {
          backgroundColor: LightColors.card,
          paddingTop: 5, // Added padding to the top
          // marginTop: 5,
          borderTopWidth: 0,
          height: 70, // Adjusted height to accommodate labels
          paddingHorizontal: 10,
          // Removed borderTopLeftRadius and borderTopRightRadius
          overflow: 'hidden',
        },
        tabBarActiveTintColor: LightColors.accentOrange,
        tabBarInactiveTintColor: LightColors.textSecondary,
        tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 0, // Space between icon and label
            
        }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        children={(props) => <HomeScreen {...props} user={user} />}
        options={{
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) =>
            focused ? <GradientIcon IconComponent={Home} size={24} color={color} /> : <Home color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="PlannerTab"
        children={(props) => <PlannerScreen {...props} user={user} />}
        options={{
          tabBarLabel: 'Planner',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) =>
            focused ? <GradientIcon IconComponent={Calendar} size={24} color={color} /> : <Calendar color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="MissedTab"
        children={(props) => <MissedScreen {...props} user={user} />}
        options={{
          tabBarLabel: 'Missed',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) =>
            focused ? <GradientIcon IconComponent={XCircle} size={24} color={color} /> : <XCircle color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        children={(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
        options={{
          tabBarLabel: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) =>
            focused ? <GradientIcon IconComponent={User} size={24} color={color} /> : <User color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}

const AppNavigator = ({ user, onLogout }) => {
  return (
      <Stack.Navigator>
        <Stack.Screen name="Main" options={{ headerShown: false }}>
          {() => <TabNavigator user={user} onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="Add" options={{ headerShown: false, presentation: 'modal' }}>
          {(props) => <AddScreen {...props} user={user} />}
        </Stack.Screen>
      </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  // Removed CustomPillTabButton related styles as it's no longer used
});

export default AppNavigator;