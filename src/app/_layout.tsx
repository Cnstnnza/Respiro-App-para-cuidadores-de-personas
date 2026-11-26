import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setHasSession(Boolean(data.session));
        }
      } catch (e) {
        console.log('Error verificando sesión:', e);
        if (mounted) setHasSession(false);
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setHasSession(Boolean(session));
        setCheckingAuth(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    const inLoginScreen = segments[0] === 'login';

    if (!hasSession && !inLoginScreen) {
      router.replace('/login');
    } else if (hasSession && inLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [checkingAuth, hasSession, segments]);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2ECE4' }}>
        <ActivityIndicator size="large" color="#2C221E" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2C221E' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="notificaciones"
        options={{
          title: 'Notificaciones',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}