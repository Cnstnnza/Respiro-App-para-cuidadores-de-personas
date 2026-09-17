import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [cargando, setCargando] = useState(true);
  const [sesion, setSesion] = useState<any>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setCargando(false);
    });

    // 2. Escuchar cambios de sesión (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (cargando) return;

    const enLogin = segments[0] === 'login';

    if (!sesion && !enLogin) {
      // Si no tiene sesión y está fuera de login, redirige a login
      router.replace('/login');
    } else if (sesion && enLogin) {
      // Si ya inició sesión y está en login, redirige al inicio
      router.replace('/(tabs)');
    }
  }, [sesion, segments, cargando]);

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7EFE8' }}>
        <ActivityIndicator size="large" color="#C59A77" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="ficha"
        options={{
          headerShown: true,
          title: 'Ficha del Paciente',
          headerStyle: { backgroundColor: '#F7EFE8' },
          headerTintColor: '#4A3B32',
        }}
      />
      <Stack.Screen
        name="horas_medicas"
        options={{
          headerShown: true,
          title: 'Horas Médicas',
          headerStyle: { backgroundColor: '#F7EFE8' },
          headerTintColor: '#4A3B32',
        }}
      />
      <Stack.Screen
        name="perfil"
        options={{
          headerShown: true,
          title: 'Mi Perfil',
          headerStyle: { backgroundColor: '#F7EFE8' },
          headerTintColor: '#4A3B32',
        }}
      />
    </Stack>
  );
}