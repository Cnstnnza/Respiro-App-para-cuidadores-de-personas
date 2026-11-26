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
import { supabase } from '../lib/supabase';
import { programarNotificacionCita } from '../lib/notificaciones';

export default function HorasMedicasScreen() {
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [citas, setCitas] = useState<any[]>([]);

  // Modal Nueva Cita
  const [modalVisible, setModalVisible] = useState(false);
  const [doctor, setDoctor] = useState('');
  const [lugar, setLugar] = useState('');
  const [fechaDate, setFechaDate] = useState(new Date());
  const [horaDate, setHoraDate] = useState(new Date());
  const [mostrarPickerFecha, setMostrarPickerFecha] = useState(false);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [notas, setNotas] = useState('');

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
          await cargarCitas(actual.id);
        } else {
          setPacientes([]);
          setPacienteSeleccionado(null);
          setCitas([]);
        }
        if (activo) setLoading(false);
      };

      cargar();
      return () => { activo = false; };
    }, [])
  );

  const cargarCitas = async (pacienteId: string) => {
    const { data } = await supabase
      .from('citas_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    setCitas(data || []);
  };

  const formatearHora = (d: Date) =>
    d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';

  const formatearFechaISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatearFechaHumana = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const agendarCita = async () => {
    if (!doctor.trim() || !lugar.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa el especialista/doctor y el recinto médico.');
      return;
    }

    const payload: any = {
      paciente_id: pacienteSeleccionado.id,
      especialidad_doctor: doctor.trim(),
      lugar: lugar.trim(),
      fecha: formatearFechaISO(fechaDate),
      hora: formatearHora(horaDate),
      realizada: false,
    };

    if (notas.trim()) payload.notas = notas.trim();

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([payload])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al agendar', error.message);
    } else {
      await programarNotificacionCita(
        pacienteSeleccionado.nombre,
        doctor.trim(),
        lugar.trim(),
        fechaDate,
        horaDate
      );

      setCitas((prev) => [...prev, data]);
      setModalVisible(false);
      setDoctor('');
      setLugar('');
      setNotas('');
      setFechaDate(new Date());
      setHoraDate(new Date());
      Alert.alert('Hora médica agendada', 'Te avisaremos 1 día antes y 1 hora antes de la cita.');
    }
  };

  const toggleRealizada = async (cita: any) => {
    const nuevo = !cita.realizada;
    setCitas((prev) => prev.map((c) => (c.id === cita.id ? { ...c, realizada: nuevo } : c)));
    await supabase.from('citas_medicas').update({ realizada: nuevo }).eq('id', cita.id);
  };

  const eliminarCita = async (id: string) => {
    Alert.alert('Eliminar cita', '¿Deseas borrar esta hora médica?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('citas_medicas').delete().eq('id', id);
          setCitas((prev) => prev.filter((c) => c.id !== id));
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
          <Ionicons name="calendar-outline" size={60} color="#2C221E" />
          <Text style={styles.vacioTitulo}>No hay pacientes registrados</Text>
          <Text style={styles.vacioSub}>
            Crea primero la ficha de un paciente en la pestaña "Pacientes" para agendar sus horas médicas.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Selector de paciente */}
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
                      cargarCitas(p.id);
                    }}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{p.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.btnAgendar} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.btnAgendarTexto}>Agendar Nueva Hora Médica</Text>
          </TouchableOpacity>

          <FlatList
            data={citas}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.vacioCard}>
                <Text style={styles.vacioSub}>No hay horas médicas agendadas para este paciente.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.citaCard, item.realizada && styles.citaCardRealizada]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.citaDoctor, item.realizada && styles.citaDoctorTachado]}>
                    {item.especialidad_doctor}
                  </Text>
                  <Text style={styles.citaDato}>🏥 Lugar: {item.lugar}</Text>
                  <Text style={styles.citaDato}>📅 Fecha: {item.fecha}</Text>
                  <Text style={styles.citaDato}>⏰ Hora: {item.hora}</Text>
                  {item.notas ? <Text style={styles.citaNota}>Nota: {item.notas}</Text> : null}
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <TouchableOpacity onPress={() => eliminarCita(item.id)} style={{ padding: 6 }}>
                    <Ionicons name="trash" size={24} color="#B71C1C" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnEstado, item.realizada ? styles.btnAsistio : styles.btnPendiente]}
                    onPress={() => toggleRealizada(item)}
                  >
                    <Ionicons
                      name={item.realizada ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={item.realizada ? '#FFFFFF' : '#141414'}
                    />
                    <Text style={[styles.btnEstadoTexto, item.realizada && { color: '#FFFFFF' }]}>
                      {item.realizada ? 'Asistió' : 'Pendiente'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL AGENDAR CITA CON SELECTORES DESLIZANTES */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nueva Hora Médica</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Especialista o Doctor *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Dr. Morales (Geriatría)"
                placeholderTextColor="#555555"
                value={doctor}
                onChangeText={setDoctor}
              />

              <Text style={styles.label}>Recinto Médico / Lugar *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Hospital Clínico / CESFAM"
                placeholderTextColor="#555555"
                value={lugar}
                onChangeText={setLugar}
              />

              <Text style={styles.label}>Fecha de la Consulta</Text>
              <TouchableOpacity
                style={styles.btnPicker}
                onPress={() => setMostrarPickerFecha(true)}
              >
                <Ionicons name="calendar" size={22} color="#141414" />
                <Text style={styles.btnPickerTexto}>{formatearFechaHumana(fechaDate)}</Text>
                <Ionicons name="chevron-down" size={20} color="#141414" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {mostrarPickerFecha && (
                <DateTimePicker
                  value={fechaDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(event, selectedDate) => {
                    setMostrarPickerFecha(Platform.OS === 'ios');
                    if (selectedDate) setFechaDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Hora de Atención</Text>
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

              <Text style={styles.label}>Indicaciones / Documentos</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Llevar exámenes y carnet de identidad"
                placeholderTextColor="#555555"
                value={notas}
                onChangeText={setNotas}
              />

              <TouchableOpacity style={styles.btnConfirmar} onPress={agendarCita}>
                <Text style={styles.btnConfirmarTexto}>Confirmar y Activar Alerta</Text>
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

  btnAgendar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 15, borderRadius: 14, marginBottom: 14 },
  btnAgendarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17, marginLeft: 8 },

  citaCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  citaCardRealizada: { backgroundColor: '#E8F5E9', borderColor: '#1B5E20' },
  citaDoctor: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginBottom: 4 },
  citaDoctorTachado: { textDecorationLine: 'line-through', color: '#1B5E20' },
  citaDato: { fontSize: 16, fontWeight: '600', color: '#141414', marginTop: 3 },
  citaNota: { fontSize: 15, color: '#333333', fontStyle: 'italic', marginTop: 6 },

  btnEstado: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, marginTop: 12, borderWidth: 1.5, borderColor: '#141414' },
  btnAsistio: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
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