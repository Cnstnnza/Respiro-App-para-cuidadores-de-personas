import React, { useState, useCallback } from 'react';
import { Tabs, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function TabsLayout() {
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const verificarRol = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activo) return;

        const { data: perfil } = await supabase
          .from('cuidadores')
          .select('rol_global, email')
          .eq('id', user.id)
          .maybeSingle();

        const esMaster =
          perfil?.rol_global === 'super_admin' ||
          user.email?.toLowerCase() === 'respiro.app.umag@gmail.com';

        if (activo) setEsSuperAdmin(esMaster);
      };

      verificarRol();
      return () => {
        activo = false;
      };
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#2C221E' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 2,
          borderTopColor: '#2C221E',
          height: 68,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#2C221E',
        tabBarInactiveTintColor: '#555555',
        tabBarLabelStyle: { fontSize: 13, fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Muro',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="guias"
        options={{
          title: 'Guías',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="foros"
        options={{
          title: 'Ayudas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="administracion"
        options={{
          title: 'Admin',
          href: esSuperAdmin ? '/administracion' : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="grupo"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}