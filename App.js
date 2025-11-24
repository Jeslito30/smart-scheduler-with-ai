import React, { useState, useEffect, Suspense } from 'react';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import { initDB } from './services/Database';
import { SQLiteProvider } from 'expo-sqlite';

import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './components/AppNavigator';

const ScreenManager = () => {
  const [appState, setAppState] = useState('login');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'

  if (appState === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setLoggedInUser(user);
          setAppState('main');
        }}
        onSignUpPress={() => setAppState('signup')}
      />
    );
  }

  if (appState === 'signup') {
    return (
      <SignUpScreen
        onSignUp={(user) => {
          setLoggedInUser(user);
          setAppState('main');
        }}
        onBackToLogin={() => setAppState('login')}
      />
    );
  }

  if (appState === 'main') {
    return (
      <NavigationContainer>
        <AppNavigator
          user={loggedInUser}
          onLogout={() => {
            setLoggedInUser(null);
            setAppState('login');
          }}
          theme={theme}
          setTheme={setTheme}
        />
      </NavigationContainer>
    );
  }

  return null;
};

export default function App() {
  return (
    <SQLiteProvider
      databaseName="smartReminderDB.db"
      onInit={initDB}
      suspense
    >
      <Suspense fallback={<SplashScreen />}>
        <ScreenManager />
      </Suspense>
    </SQLiteProvider>
  );
}
