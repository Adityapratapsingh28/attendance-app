import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import React from "react";
import { AuthProvider } from "../services/AuthContext";
import { LeaveProvider } from "../app/profile/leave-context";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "../components/ErrorBoundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <LeaveProvider>
            <Stack screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              animation: 'slide_from_right',
            }}>
              {/* Entry point */}
              <Stack.Screen
                name="index"
                options={{
                  headerShown: false,
                  gestureEnabled: false, // Prevent gesture on entry screen
                }}
              />

              {/* Public routes (no auth required) */}
              <Stack.Screen
                name="onboarding/index"
                options={{
                  headerShown: false,
                  gestureEnabled: false, // Prevent back gesture on onboarding
                }}
              />
              <Stack.Screen
                name="onboarding/signin"
                options={{
                  headerShown: false,
                  presentation: 'card', // Changed from modal to card for better navigation
                  gestureEnabled: false, // Prevent gesture on signin
                }}
              />

              {/* User protected routes */}
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                  gestureEnabled: false, // Prevent gesture on main tabs
                }}
              />
              <Stack.Screen
                name="home"
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="clock"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />
              <Stack.Screen
                name="face-verification"
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="profile"
                options={{
                  headerShown: false,
                  presentation: 'card',
                }}
              />

              {/* Admin-only routes */}
              <Stack.Screen
                name="admin"
                options={{
                  headerShown: false,
                  gestureEnabled: false, // Prevent gesture on admin dashboard
                }}
              />
            </Stack>
          </LeaveProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}