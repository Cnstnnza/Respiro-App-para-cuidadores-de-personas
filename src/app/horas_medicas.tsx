import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HorasMedicasScreen() {
  const [citas, setCitas] = useState([
    {
      id: '1',
      paciente: 'María Elena Pérez',
      especialidad: 'Geriatría - Control mensual',
      doctor: 'Dr. Patricio Morales',
      fecha: '24 Sep, 10:30 hrs',
      lugar: 'Hospital Clínico',
    },
    {
      id: '2',
      paciente: 'Carlos Soto Baeza',
      especialidad: 'Kinesiología Motora',
      doctor: 'Klga. Camila Navarro',
      fecha: '27 Sep, 15:00 hrs',
      lugar: 'Centro Comunitario',
    },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Horas Médicas</Text>
      <Text style={styles.subtitulo}>Próximos controles y citas agendadas</Text>

      <FlatList
        data={citas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.iconoBox}>
              <Ionicons name="calendar" size={24} color="#C59A77" />
            </View>
            <View style={styles.info}>
              <Text style={styles.paciente}>{item.paciente}</Text>
              <Text style={styles.especialidad}>{item.especialidad}</Text>
              <Text style={styles.detalle}>👨‍⚕️ {item.doctor}</Text>
              <Text style={styles.detalle}>📍 {item.lugar}</Text>
              <View style={styles.fechaBadge}>
                <Ionicons name="time-outline" size={14} color="#7E5835" />
                <Text style={styles.fechaTexto}>{item.fecha}</Text>
              </View>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.botonFlotante}
        onPress={() => Alert.alert('Agendar Cita', 'Próximamente formulario de nueva hora médica.')}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 20, paddingTop: 20 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 14, color: '#8A7A70', marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', marginBottom: 12, elevation: 2 },
  iconoBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FAF6F0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  info: { flex: 1 },
  paciente: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32' },
  especialidad: { fontSize: 14, fontWeight: '600', color: '#C59A77', marginTop: 2 },
  detalle: { fontSize: 13, color: '#6A5E57', marginTop: 2 },
  fechaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8DF', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  fechaTexto: { fontSize: 12, fontWeight: '600', color: '#7E5835', marginLeft: 4 },
  botonFlotante: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#C59A77', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});