import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuiasScreen() {
  const guias = [
    {
      id: '1',
      categoria: 'Kinesiología y Movilidad',
      titulo: 'Ejercicios musculares para adultos mayores',
      descripcion: 'Rutinas sencillas de flexión y estiramiento en silla para evitar atrofia y rigidez.',
      icono: 'fitness-outline',
      duracion: '10 min',
    },
    {
      id: '2',
      categoria: 'Técnicas de Cuidado',
      titulo: 'Transferencia segura de cama a silla',
      descripcion: 'Postura corporal correcta del cuidador para movilizar sin lesionar la zona lumbar.',
      icono: 'body-outline',
      duracion: '5 min',
    },
    {
      id: '3',
      categoria: 'Bienestar del Cuidador',
      titulo: 'Pausas activas y salud postural',
      descripcion: 'Estiramientos rápidos de cuello, hombros y espalda para aliviar la sobrecarga.',
      icono: 'heart-circle-outline',
      duracion: '8 min',
    },
    {
      id: '4',
      categoria: 'Emergencias',
      titulo: 'Protocolo de caídas en el hogar',
      descripcion: 'Pasos clave para evaluar dolor o fracturas antes de intentar levantar al paciente.',
      icono: 'alert-circle-outline',
      duracion: 'Lectura rápida',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>Guías y Recursos</Text>
      <Text style={styles.subtitulo}>Acompañamiento técnico y prevención</Text>

      {/* Banner de Contactos Rápidos de Emergencia */}
      <View style={styles.bannerEmergencia}>
        <View style={styles.iconoEmergencia}>
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.emergenciaTitulo}>Números de Urgencia</Text>
          <Text style={styles.emergenciaDesc}>SAMU: 131 | Bomberos: 132 | Carabineros: 133</Text>
        </View>
      </View>

      <Text style={styles.seccionTitulo}>Módulos de Apoyo</Text>

      {guias.map((guia) => (
        <TouchableOpacity key={guia.id} style={styles.cardGuia} activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <View style={styles.iconoContenedor}>
              <Ionicons name={guia.icono as any} size={22} color="#C59A77" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.categoriaTag}>{guia.categoria}</Text>
              <Text style={styles.guiaTitulo}>{guia.titulo}</Text>
            </View>
          </View>
          <Text style={styles.guiaDescripcion}>{guia.descripcion}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.tiempoTag}>
              <Ionicons name="time-outline" size={14} color="#8A7A70" />
              <Text style={styles.tiempoTexto}>{guia.duracion}</Text>
            </View>
            <Text style={styles.leerTexto}>Ver guía →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 13, color: '#8A7A70', marginBottom: 16 },
  bannerEmergencia: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E8DFD8' },
  iconoEmergencia: { backgroundColor: '#D9534F', width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  emergenciaTitulo: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32' },
  emergenciaDesc: { fontSize: 12, color: '#8A7A70', marginTop: 2 },
  seccionTitulo: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 12 },
  cardGuia: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconoContenedor: { backgroundColor: '#FAF6F0', width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoriaTag: { fontSize: 11, fontWeight: 'bold', color: '#C59A77', textTransform: 'uppercase' },
  guiaTitulo: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32', marginTop: 2 },
  guiaDescripcion: { fontSize: 13, color: '#665B54', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 10 },
  tiempoTag: { flexDirection: 'row', alignItems: 'center' },
  tiempoTexto: { fontSize: 12, color: '#8A7A70', marginLeft: 4 },
  leerTexto: { fontSize: 13, fontWeight: 'bold', color: '#C59A77' }
});