import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function FichaScreen() {
  const params = useLocalSearchParams<{ pacienteId?: string }>();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [paciente, setPaciente] = useState<any>(null);

  // Modal Editar Ficha
  const [modalEditar, setModalEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editEdad, setEditEdad] = useState('');
  const [editGrupo, setEditGrupo] = useState('');
  const [editDiagnostico, setEditDiagnostico] = useState('');
  const [editAlergias, setEditAlergias] = useState('');
  const [editEmergencia, setEditEmergencia] = useState('');
  const [editMovilidad, setEditMovilidad] = useState('');
  const [editDependencia, setEditDependencia] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const cargar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activo) return;
        setCurrentUser(user);

        const { data: lista } = await supabase
          .from('pacientes')
          .select('*')
          .eq('cuidador_id', user.id)
          .order('created_at', { ascending: false });

        if (lista && lista.length > 0) {
          setPacientes(lista);
          const elegido = params.pacienteId
            ? lista.find((p) => p.id === params.pacienteId) || lista[0]
            : lista[0];
          seleccionarPaciente(elegido);
        } else {
          setPacientes([]);
          setPaciente(null);
        }
        if (activo) setLoading(false);
      };

      cargar();
      return () => { activo = false; };
    }, [params.pacienteId])
  );

  const seleccionarPaciente = (p: any) => {
    setPaciente(p);
    setEditNombre(p.nombre || '');
    setEditEdad(p.edad ? String(p.edad) : '');
    setEditGrupo(p.grupo_sanguineo || '');
    setEditDiagnostico(p.diagnostico || p.padecimiento_principal || '');
    setEditAlergias(p.alergias || '');
    setEditEmergencia(p.contacto_emergencia || '');
    setEditMovilidad(p.movilidad || '');
    setEditDependencia(p.nivel_dependencia || '');
    setEditNotas(p.notas_cuidado || '');
  };

  const guardarCambiosFicha = async () => {
    if (!editNombre.trim() || !paciente) {
      Alert.alert('Atención', 'El nombre del paciente es obligatorio.');
      return;
    }

    setGuardando(true);
    const payload: any = {
      nombre: editNombre.trim(),
      edad: editEdad.trim() ? parseInt(editEdad.trim(), 10) : null,
      grupo_sanguineo: editGrupo.trim() || null,
      diagnostico: editDiagnostico.trim() || null,
      padecimiento_principal: editDiagnostico.trim() || null,
      alergias: editAlergias.trim() || null,
      contacto_emergencia: editEmergencia.trim() || null,
      movilidad: editMovilidad.trim() || null,
      nivel_dependencia: editDependencia.trim() || null,
      notas_cuidado: editNotas.trim() || null,
    };

    const { data, error } = await supabase
      .from('pacientes')
      .update(payload)
      .eq('id', paciente.id)
      .select()
      .single();

    setGuardando(false);

    if (error) {
      Alert.alert('Error al actualizar', error.message);
    } else if (data) {
      setPaciente(data);
      setPacientes((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setModalEditar(false);
      Alert.alert('Ficha actualizada', 'Los datos clínicos se guardaron correctamente.');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : !paciente ? (
        <View style={styles.vacioCard}>
          <Ionicons name="document-text-outline" size={60} color="#2C221E" />
          <Text style={styles.vacioTitulo}>No hay fichas clínicas registradas</Text>
          <Text style={styles.vacioSub}>
            Registra un paciente desde la pestaña "Pacientes" para visualizar su ficha aquí.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Selector rápido si hay más de un paciente */}
          {pacientes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
              {pacientes.map((p) => {
                const activo = p.id === paciente.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => seleccionarPaciente(p)}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{p.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Tarjeta Clínica Principal */}
          <View style={styles.card}>
            <View style={styles.cabecera}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetra}>
                  {paciente.nombre ? paciente.nombre.charAt(0).toUpperCase() : 'P'}
                </Text>
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text style={styles.nombre}>{paciente.nombre}</Text>
                <Text style={styles.subDatos}>
                  {paciente.edad ? `${paciente.edad} años` : 'Edad no informada'}
                  {paciente.grupo_sanguineo ? `  •  Grupo: ${paciente.grupo_sanguineo}` : ''}
                </Text>
              </View>
            </View>

            {/* Botón Editar Ficha Grande */}
            <TouchableOpacity style={styles.btnEditar} onPress={() => setModalEditar(true)}>
              <Ionicons name="create" size={22} color="#FFFFFF" />
              <Text style={styles.btnEditarTexto}>Editar Datos Clínicos</Text>
            </TouchableOpacity>

            {/* Diagnóstico */}
            <View style={styles.bloque}>
              <View style={styles.etiquetaFila}>
                <Ionicons name="pulse" size={20} color="#141414" />
                <Text style={styles.etiqueta}>Diagnóstico Principal</Text>
              </View>
              <Text style={styles.valor}>
                {paciente.diagnostico || paciente.padecimiento_principal || 'Sin diagnóstico registrado.'}
              </Text>
            </View>

            {/* Alergias (Alerta Roja Alto Contraste) */}
            <View style={styles.bloque}>
              <View style={styles.etiquetaFila}>
                <Ionicons name="alert-circle" size={20} color="#B71C1C" />
                <Text style={[styles.etiqueta, { color: '#B71C1C' }]}>Alergias y Contraindicaciones</Text>
              </View>
              <Text style={[styles.valor, { borderColor: '#B71C1C', backgroundColor: '#FFF5F5' }]}>
                {paciente.alergias || 'Sin alergias conocidas.'}
              </Text>
            </View>

            {/* Contacto de Emergencia (Alerta Verde Alto Contraste) */}
            <View style={styles.bloque}>
              <View style={styles.etiquetaFila}>
                <Ionicons name="call" size={20} color="#1B5E20" />
                <Text style={[styles.etiqueta, { color: '#1B5E20' }]}>Contacto de Emergencia</Text>
              </View>
              <Text style={[styles.valor, { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' }]}>
                {paciente.contacto_emergencia || 'No registrado.'}
              </Text>
            </View>

            {/* Movilidad y Dependencia */}
            <View style={styles.bloque}>
              <View style={styles.etiquetaFila}>
                <Ionicons name="walk" size={20} color="#141414" />
                <Text style={styles.etiqueta}>Movilidad y Nivel de Dependencia</Text>
              </View>
              <Text style={styles.valor}>
                {`Movilidad: ${paciente.movilidad || 'Normal'}\nDependencia: ${paciente.nivel_dependencia || 'Autónomo'}`}
              </Text>
            </View>

            {/* Notas de Cuidado */}
            <View style={styles.bloque}>
              <View style={styles.etiquetaFila}>
                <Ionicons name="reader" size={20} color="#141414" />
                <Text style={styles.etiqueta}>Notas de Cuidado y Rutina</Text>
              </View>
              <Text style={styles.valor}>
                {paciente.notas_cuidado || 'Sin instrucciones adicionales.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODAL EDITAR FICHA */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Editar Ficha Clínica</Text>
              <TouchableOpacity onPress={() => setModalEditar(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre completo *</Text>
              <TextInput style={styles.input} value={editNombre} onChangeText={setEditNombre} />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Edad</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editEdad}
                    onChangeText={setEditEdad}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Grupo Sanguíneo</Text>
                  <TextInput style={styles.input} value={editGrupo} onChangeText={setEditGrupo} />
                </View>
              </View>

              <Text style={styles.label}>Diagnóstico Principal</Text>
              <TextInput style={styles.input} value={editDiagnostico} onChangeText={setEditDiagnostico} />

              <Text style={styles.label}>Alergias</Text>
              <TextInput style={styles.input} value={editAlergias} onChangeText={setEditAlergias} />

              <Text style={styles.label}>Contacto de Emergencia</Text>
              <TextInput style={styles.input} value={editEmergencia} onChangeText={setEditEmergencia} />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Movilidad</Text>
                  <TextInput style={styles.input} value={editMovilidad} onChangeText={setEditMovilidad} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Dependencia</Text>
                  <TextInput style={styles.input} value={editDependencia} onChangeText={setEditDependencia} />
                </View>
              </View>

              <Text style={styles.label}>Notas de Cuidado</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                value={editNotas}
                onChangeText={setEditNotas}
              />

              <TouchableOpacity
                style={styles.btnGuardar}
                onPress={guardarCambiosFicha}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnGuardarTexto}>Guardar Cambios</Text>
                )}
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
  vacioCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 30, borderWidth: 2, borderColor: '#2C221E' },
  vacioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414', marginTop: 12, textAlign: 'center' },
  vacioSub: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  carousel: { maxHeight: 50, marginBottom: 14 },
  chip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 24, marginRight: 10, borderWidth: 2, borderColor: '#2C221E' },
  chipActivo: { backgroundColor: '#2C221E' },
  chipTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414' },
  chipTextoActivo: { color: '#FFFFFF' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 2, borderColor: '#6E5D4F', marginBottom: 20 },
  cabecera: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#D5C9BC', paddingBottom: 14, marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#2C221E', justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  nombre: { fontSize: 22, fontWeight: 'bold', color: '#141414' },
  subDatos: { fontSize: 16, fontWeight: '600', color: '#333333', marginTop: 2 },

  btnEditar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 14, borderRadius: 14, marginBottom: 18 },
  btnEditarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17, marginLeft: 8 },

  bloque: { marginBottom: 16 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  etiqueta: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 8 },
  valor: { fontSize: 17, color: '#141414', backgroundColor: '#F2ECE4', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#6E5D4F', lineHeight: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, maxHeight: '90%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  btnGuardar: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  btnGuardarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});