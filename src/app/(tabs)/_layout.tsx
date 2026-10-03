import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C59A77',
        tabBarInactiveTintColor: '#A0958E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8DFD8',
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      {/* 1. Muro Comunitario */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 2. Pacientes (Gestión integral con Medicación y Citas) */}
      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 3. Guías y Recursos de Apoyo */}
      <Tabs.Screen
        name="guias"
        options={{
          title: 'Guías',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 4. Perfil Propio (con reseteo de parámetros al presionar la pestaña) */}
      <Tabs.Screen
        name="perfil"
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('perfil', { userId: undefined });
          },
        })}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Ocultar la tab antigua si aún existiera */}
      <Tabs.Screen
        name="medicacion"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}