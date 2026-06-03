import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import ClockScreen from './screens/ClockScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import TasksScreen from './screens/TasksScreen';
import DashboardScreen from './screens/DashboardScreen';

const Tab = createBottomTabNavigator();

// Decides which screens to show based on the user's role
function AppNavigator() {
  const { session, profile, loadingProfile } = useAuth();

  // Show a spinner while the profile is loading
  if (loadingProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // No session — show login
  if (!session) {
    return <LoginScreen />;
  }

  // Worker role — limited screens
  if (profile?.role === 'worker') {
    return (
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Clock" component={ClockScreen} />
          <Tab.Screen name="My Tasks" component={TasksScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  // Project Leader role
  if (profile?.role === 'project_leader') {
    return (
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Clock" component={ClockScreen} />
          <Tab.Screen name="Projects" component={ProjectsScreen} />
          <Tab.Screen name="Tasks" component={TasksScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  // Manager and Office roles — full access
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

// Wrap the entire app in AuthProvider so all screens can access the user's role
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}