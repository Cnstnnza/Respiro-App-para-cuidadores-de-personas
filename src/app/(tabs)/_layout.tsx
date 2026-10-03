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
      {/* 1. Muro / Foro Comunitario como Inicio */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 2. Pacientes */}
      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 3. Fusión de Medicación y Horas Médicas */}
      <Tabs.Screen
        name="medicacion"
        options={{
          title: 'Salud',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 4. Guías y Recursos de Apoyo */}
      <Tabs.Screen
        name="guias"
        options={{
          title: 'Guías',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}