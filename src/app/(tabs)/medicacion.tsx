import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SaludScreen() {
  const [seccion, setSeccion] = useState<'medicacion' | 'horas'>('medicacion');

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Control de Salud</Text>
      <Text style={styles.subtitulo}>Gestión de tratamientos y controles</Text>

      {/* Selector superior entre Medicamentos y Horas Médicas */}
      <View style={styles.selectorContenedor}>
        <TouchableOpacity
          style={[styles.selectorBoton, seccion === 'medicacion' && styles.selectorBotonActivo]}
          onPress={() => setSeccion('medicacion')}
        >
          <Ionicons
            name="medkit-outline"
            size={18}
            color={seccion === 'medicacion' ? '#4A3B32' : '#8A7A70'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.selectorTexto, seccion === 'medicacion' && styles.selectorTextoActivo]}>
            Medicamentos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBoton, seccion === 'horas' && styles.selectorBotonActivo]}
          onPress={() => setSeccion('horas')}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={seccion === 'horas' ? '#4A3B32' : '#8A7A70'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.selectorTexto, seccion === 'horas' && styles.selectorTextoActivo]}>
            Horas Médicas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {seccion === 'medicacion' ? (
          <View>
            <View style={styles.cardInfo}>
              <Ionicons name="time-outline" size={24} color="#C59A77" />
              <View style={styles.cardInfoTextos}>
                <Text style={styles.cardInfoTitulo}>Próximas Dosis</Text>
                <Text style={styles.cardInfoDesc}>Revisa y registra los fármacos del día a día.</Text>
              </View>
            </View>

            {/* Tarjeta de ejemplo de medicamento */}
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNombre}>Losartán 50mg</Text>
                <Text style={styles.itemHora}>08:00 hrs</Text>
              </View>
              <Text style={styles.itemDetalle}>1 comprimido cada mañana con el desayuno.</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.tagStock}>Stock: 14 comprimidos</Text>
                <TouchableOpacity style={styles.btnAccion}>
                  <Text style={styles.btnAccionTexto}>Marcar Administrado</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNombre}>Paracetamol 500mg</Text>
                <Text style={styles.itemHora}>14:00 hrs</Text>
              </View>
              <Text style={styles.itemDetalle}>En caso de dolor articular o molestia.</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.tagStock}>Stock: Disponible</Text>
                <TouchableOpacity style={styles.btnAccion}>
                  <Text style={styles.btnAccionTexto}>Marcar Administrado</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.cardInfo}>
              <Ionicons name="calendar" size={24} color="#C59A77" />
              <View style={styles.cardInfoTextos}>
                <Text style={styles.cardInfoTitulo}>Agenda de Controles</Text>
                <Text style={styles.cardInfoDesc}>Citas médicas, kinesiología y exámenes.</Text>
              </View>
            </View>

            {/* Tarjetas de ejemplo de citas médicas */}
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNombre}>Control Geriatría - CESFAM</Text>
                <Text style={styles.itemHora}>10:30 hrs</Text>
              </View>
              <Text style={styles.itemDetalle}>Control trimestral crónico y ajuste de dosis.</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.tagFecha}>Próximo Martes</Text>
                <TouchableOpacity style={styles.btnRecordatorio}>
                  <Ionicons name="notifications-outline" size={14} color="#C59A77" />
                  <Text style={styles.btnRecordatorioTexto}>Recordatorio activo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNombre}>Sesión Kinesiología Motora</Text>
                <Text style={styles.itemHora}>15:00 hrs</Text>
              </View>
              <Text style={styles.itemDetalle}>Visita domiciliaria para ejercicios de marcha y equilibrio.</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.tagFecha}>Jueves</Text>
                <TouchableOpacity style={styles.btnRecordatorio}>
                  <Ionicons name="notifications-outline" size={14} color="#C59A77" />
                  <Text style={styles.btnRecordatorioTexto}>Recordatorio activo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 13, color: '#8A7A70', marginBottom: 16 },
  selectorContenedor: { flexDirection: 'row', backgroundColor: '#E8DFD8', borderRadius: 14, padding: 4, marginBottom: 16 },
  selectorBoton: { flex: 1, flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  selectorBotonActivo: { backgroundColor: '#FFFFFF' },
  selectorTexto: { fontSize: 14, fontWeight: '600', color: '#8A7A70' },
  selectorTextoActivo: { color: '#4A3B32' },
  cardInfo: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 14 },
  cardInfoTextos: { marginLeft: 12, flex: 1 },
  cardInfoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32' },
  cardInfoDesc: { fontSize: 12, color: '#8A7A70', marginTop: 2 },
  itemCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemNombre: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32' },
  itemHora: { fontSize: 13, fontWeight: '600', color: '#C59A77' },
  itemDetalle: { fontSize: 14, color: '#665B54', marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 10 },
  tagStock: { fontSize: 12, color: '#8A7A70', fontWeight: '500' },
  tagFecha: { fontSize: 12, color: '#4A3B32', fontWeight: 'bold' },
  btnAccion: { backgroundColor: '#C59A77', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnAccionTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  btnRecordatorio: { flexDirection: 'row', alignItems: 'center' },
  btnRecordatorioTexto: { fontSize: 12, color: '#C59A77', marginLeft: 4, fontWeight: '600' }
});