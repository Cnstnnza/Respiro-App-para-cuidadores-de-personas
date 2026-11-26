import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { programarNotificacionMedicamento } from '../../lib/notificaciones';

export default function MedicamentosScreen() {
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [medicamentos, setMedicamentos] = useState<any[]>([]);

  // Modal Nuevo Medicamento
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreMed, setNombreMed] = useState('');
  const [dosis, setDosis] = useState('');
  const [horaDate, setHoraDate] = useState(new Date());
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [instrucciones, setInstrucciones] = useState('');

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const cargar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activo) return;

        const { data: lista } = await supabase
          .from('pacientes')
          .select('*')
          .eq('cuidador_id', user.id)
          .order('created_at', { ascending: false });

        if (lista && lista.length > 0) {
          setPacientes(lista);
          const actual = pacienteSeleccionado
            ? lista.find((p) => p.id === pacienteSeleccionado.id) || lista[0]
            : lista[0];
          setPacienteSeleccionado(actual);
          await cargarMedicamentos(actual.id);
        } else {
          setPacientes([]);
          setPacienteSeleccionado(null);
          setMedicamentos([]);
        }
        if (activo) setLoading(false);
      };

      cargar();
      return () => { activo = false; };
    }, [])
  );

  const cargarMedicamentos = async (pacienteId: string) => {
    const { data } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true });
    setMedicamentos(data || []);
  };

  const formatearHora = (d: Date) =>
    d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';

  const guardarMedicamento = async () => {
    if (!nombreMed.trim() || !dosis.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa el nombre del medicamento y la dosis.');
      return;
    }

    const payload: any = {
      paciente_id: pacienteSeleccionado.id,
      nombre: nombreMed.trim(),
      dosis: dosis.trim(),
      horario: formatearHora(horaDate),
      tomado_hoy: false,
    };

    if (instrucciones.trim()) {
      payload.contraindicaciones = instrucciones.trim();
    }

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([payload])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al guardar', error.message);
    } else {
      await programarNotificacionMedicamento(
        pacienteSeleccionado.nombre,
        nombreMed.trim(),
        dosis.trim(),
        horaDate
      );

      setMedicamentos((prev) => [...prev, data]);
      setModalVisible(false);
      setNombreMed('');
      setDosis('');
      setInstrucciones('');
      setHoraDate(new Date());
      Alert.alert('Alarma activada', 'Recibirás una notificación diaria a esta hora.');
    }
  };

  const toggleTomado = async (med: any) => {
    const nuevo = !med.tomado_hoy;
    setMedicamentos((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, tomado_hoy: nuevo } : m))
    );
    await supabase.from('medicamentos').update({ tomado_hoy: nuevo }).eq('id', med.id);
  };

  const eliminarMedicamento = async (id: string) => {
    Alert.alert('Eliminar medicamento', '¿Deseas quitar este remedio de la lista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('medicamentos').delete().eq('id', id);
          setMedicamentos((prev) => prev.filter((m) => m.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : !pacienteSeleccionado ? (
        <View style={styles.vacioCard}>
          <Ionicons name="medkit-outline" size={60} color="#2C221E" />
          <Text style={styles.vacioTitulo}>No hay pacientes registrados</Text>
          <Text style={styles.vacioSub}>
            Crea primero la ficha de un paciente en la pestaña "Pacientes" para registrar sus medicamentos.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Selector de paciente si hay más de uno */}
          {pacientes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {pacientes.map((p) => {
                const activo = p.id === pacienteSeleccionado.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => {
                      setPacienteSeleccionado(p);
                      cargarMedicamentos(p.id);
                    }}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{p.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.btnAgregar} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.btnAgregarTexto}>Agregar Nuevo Medicamento</Text>
          </TouchableOpacity>

          <FlatList
            data={medicamentos}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.vacioCard}>
                <Text style={styles.vacioSub}>No hay medicamentos registrados para este paciente.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.medCard, item.tomado_hoy && styles.medCardTomado]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.medNombre, item.tomado_hoy && styles.medNombreTachado]}>
                    {item.nombre}
                  </Text>
                  <Text style={styles.medDato}>💊 Dosis: {item.dosis}</Text>
                  <Text style={styles.medDato}>⏰ Horario: {item.horario}</Text>
                  {item.contraindicaciones ? (
                    <Text style={styles.medNota}>Nota: {item.contraindicaciones}</Text>
                  ) : null}
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <TouchableOpacity onPress={() => eliminarMedicamento(item.id)} style={{ padding: 6 }}>
                    <Ionicons name="trash" size={24} color="#B71C1C" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnEstado, item.tomado_hoy ? styles.btnTomado : styles.btnPendiente]}
                    onPress={() => toggleTomado(item)}
                  >
                    <Ionicons
                      name={item.tomado_hoy ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={item.tomado_hoy ? '#FFFFFF' : '#141414'}
                    />
                    <Text style={[styles.btnEstadoTexto, item.tomado_hoy && { color: '#FFFFFF' }]}>
                      {item.tomado_hoy ? 'Tomado' : 'Pendiente'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL AGREGAR MEDICAMENTO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre del Fármaco *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Losartán"
                placeholderTextColor="#555555"
                value={nombreMed}
                onChangeText={setNombreMed}
              />

              <Text style={styles.label}>Dosis *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 50 mg (1 comprimido)"
                placeholderTextColor="#555555"
                value={dosis}
                onChangeText={setDosis}
              />

              <Text style={styles.label}>Horario de Toma (Alarma Diaria)</Text>
              <TouchableOpacity
                style={styles.btnPicker}
                onPress={() => setMostrarPickerHora(true)}
              >
                <Ionicons name="time" size={22} color="#141414" />
                <Text style={styles.btnPickerTexto}>{formatearHora(horaDate)}</Text>
                <Ionicons name="chevron-down" size={20} color="#141414" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {mostrarPickerHora && (
                <DateTimePicker
                  value={horaDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setMostrarPickerHora(Platform.OS === 'ios');
                    if (selectedDate) setHoraDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Instrucciones / Contraindicaciones</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Tomar en ayunas con agua"
                placeholderTextColor="#555555"
                value={instrucciones}
                onChangeText={setInstrucciones}
              />

              <TouchableOpacity style={styles.btnConfirmar} onPress={guardarMedicamento}>
                <Text style={styles.btnConfirmarTexto}>Guardar y Activar Alarma</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  vacioCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20, borderWidth: 2, borderColor: '#2C221E' },
  vacioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414', marginTop: 12, textAlign: 'center' },
  vacioSub: { fontSize: 16, fontWeight: '600', color: '#2B2B2B', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  carousel: { maxHeight: 50, marginBottom: 14 },
  chip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, marginRight: 10, borderWidth: 2, borderColor: '#2C221E' },
  chipActivo: { backgroundColor: '#2C221E' },
  chipTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414' },
  chipTextoActivo: { color: '#FFFFFF' },

  btnAgregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 15, borderRadius: 14, marginBottom: 14 },
  btnAgregarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17, marginLeft: 8 },

  medCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  medCardTomado: { backgroundColor: '#E8F5E9', borderColor: '#1B5E20' },
  medNombre: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginBottom: 4 },
  medNombreTachado: { textDecorationLine: 'line-through', color: '#1B5E20' },
  medDato: { fontSize: 16, fontWeight: '600', color: '#141414', marginTop: 3 },
  medNota: { fontSize: 15, color: '#333333', fontStyle: 'italic', marginTop: 6 },

  btnEstado: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, marginTop: 12, borderWidth: 1.5, borderColor: '#141414' },
  btnTomado: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  btnPendiente: { backgroundColor: '#F2ECE4' },
  btnEstadoTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginLeft: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, maxHeight: '90%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  btnPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginTop: 4 },
  btnPickerTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 10 },
  btnConfirmar: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  btnConfirmarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});