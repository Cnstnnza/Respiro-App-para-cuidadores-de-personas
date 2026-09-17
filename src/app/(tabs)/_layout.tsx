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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="medicacion"
        options={{
          title: 'Medicación',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="foro"
        options={{
          title: 'Comunidad',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}