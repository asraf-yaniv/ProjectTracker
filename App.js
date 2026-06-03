import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from './supabase';

// Screen imports
import LoginScreen from './screens/LoginScreen';
import ClockScreen from './screens/ClockScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import TasksScreen from './screens/TasksScreen';
import DashboardScreen from './screens/DashboardScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  // session holds the logged-in user data, null means no one is logged in
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check if a user is already logged in when the app starts
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout events and update session accordingly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  // If no session exists, show the Login screen
  if (!session) {
    return <LoginScreen />;
  }

  // If session exists, show the main app with all tabs
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Clock" component={ClockScreen} />
        <Tab.Screen name="Projects" component={ProjectsScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}