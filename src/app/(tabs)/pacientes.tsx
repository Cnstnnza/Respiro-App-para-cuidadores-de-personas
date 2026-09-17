import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PacientesScreen() {
  const router = useRouter();

  // Datos de ejemplo mientras conectan la tabla de la base de datos
  const pacientesEjemplo = [
    { id: '1', nombre: 'María Elena Pérez', edad: 78, diagnostico: 'Movilidad reducida' },
    { id: '2', nombre: 'Carlos Soto Baeza', edad: 82, diagnostico: 'Control hipertensión' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Pacientes</Text>
        <TouchableOpacity style={styles.botonAgregar} onPress={() => router.push('/ficha')}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={pacientesEjemplo}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tarjeta} onPress={() => router.push('/ficha')}>
            <View style={styles.iconoPaciente}>
              <Ionicons name="person" size={22} color="#C59A77" />
            </View>
            <View style={styles.infoPaciente}>
              <Text style={styles.nombrePaciente}>{item.nombre}</Text>
              <Text style={styles.detallePaciente}>{item.edad} años • {item.diagnostico}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A0958E" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  botonAgregar: { backgroundColor: '#C59A77', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  tarjeta: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconoPaciente: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoPaciente: { flex: 1 },
  nombrePaciente: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32' },
  detallePaciente: { fontSize: 13, color: '#8A7A70', marginTop: 2 },
});