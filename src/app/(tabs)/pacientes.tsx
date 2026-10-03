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

export default function PacientesScreen() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Pacientes
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);

  // Subpestañas
  const [subTab, setSubTab] = useState<'ficha' | 'medicamentos' | 'citas'>('ficha');

  // Medicamentos y Citas
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [citas, setCitas] = useState<any[]>([]);

  // Modales
  const [modalNuevoPaciente, setModalNuevoPaciente] = useState(false);
  const [modalNuevoMedicamento, setModalNuevoMedicamento] = useState(false);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);

  // Formulario Paciente
  const [formNombre, setFormNombre] = useState('');
  const [formEdad, setFormEdad] = useState('');
  const [formDiagnostico, setFormDiagnostico] = useState('');
  const [formAlergias, setFormAlergias] = useState('');
  const [formGrupoSanguineo, setFormGrupoSanguineo] = useState('');
  const [formContactoEmergencia, setFormContactoEmergencia] = useState('');
  const [formNivelDependencia, setFormNivelDependencia] = useState('');
  const [formMovilidad, setFormMovilidad] = useState('');
  const [formNotasCuidado, setFormNotasCuidado] = useState('');

  // Formulario Medicamento (con selector deslizante de hora)
  const [medNombre, setMedNombre] = useState('');
  const [medDosis, setMedDosis] = useState('');
  const [medHoraDate, setMedHoraDate] = useState(new Date());
  const [mostrarPickerMedHora, setMostrarPickerMedHora] = useState(false);
  const [medInstrucciones, setMedInstrucciones] = useState('');

  // Formulario Cita Médica (con selector deslizante de fecha y hora)
  const [citaDoctor, setCitaDoctor] = useState('');
  const [citaLugar, setCitaLugar] = useState('');
  const [citaFechaDate, setCitaFechaDate] = useState(new Date());
  const [citaHoraDate, setCitaHoraDate] = useState(new Date());
  const [mostrarPickerCitaFecha, setMostrarPickerCitaFecha] = useState(false);
  const [mostrarPickerCitaHora, setMostrarPickerCitaHora] = useState(false);
  const [citaNotas, setCitaNotas] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const cargar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        setCurrentUser(user);

        const { data: listaPacientes } = await supabase
          .from('pacientes')
          .select('*')
          .eq('cuidador_id', user.id)
          .order('created_at', { ascending: false });

        if (listaPacientes && listaPacientes.length > 0) {
          setPacientes(listaPacientes);
          const actual = pacienteSeleccionado
            ? listaPacientes.find((p) => p.id === pacienteSeleccionado.id) || listaPacientes[0]
            : listaPacientes[0];
          setPacienteSeleccionado(actual);
          await cargarDetallesPaciente(actual.id);
        } else {
          setPacientes([]);
          setPacienteSeleccionado(null);
        }
        if (isMounted) setLoading(false);
      };

      cargar();
      return () => { isMounted = false; };
    }, [])
  );

  const cargarDetallesPaciente = async (pacienteId: string) => {
    // 1. Cargar medicamentos
    const { data: meds } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true });
    setMedicamentos(meds || []);

    // 2. Cargar citas
    const { data: appointments } = await supabase
      .from('citas_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    setCitas(appointments || []);
  };

  // Crear Paciente
  const guardarPaciente = async () => {
    if (!formNombre.trim()) {
      Alert.alert('Atención', 'Debes ingresar el nombre del paciente.');
      return;
    }

    const payload: any = {
      cuidador_id: currentUser.id,
      nombre: formNombre.trim(),
    };

    if (formEdad.trim()) payload.edad = parseInt(formEdad.trim(), 10);
    if (formDiagnostico.trim()) {
      payload.diagnostico = formDiagnostico.trim();
      payload.padecimiento_principal = formDiagnostico.trim();
    }
    if (formAlergias.trim()) payload.alergias = formAlergias.trim();
    if (formGrupoSanguineo.trim()) payload.grupo_sanguineo = formGrupoSanguineo.trim();
    if (formContactoEmergencia.trim()) payload.contacto_emergencia = formContactoEmergencia.trim();
    if (formNivelDependencia.trim()) payload.nivel_dependencia = formNivelDependencia.trim();
    if (formMovilidad.trim()) payload.movilidad = formMovilidad.trim();
    if (formNotasCuidado.trim()) payload.notas_cuidado = formNotasCuidado.trim();

    const { data, error } = await supabase
      .from('pacientes')
      .insert([payload])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al guardar', error.message);
    } else {
      const nuevaLista = [data, ...pacientes];
      setPacientes(nuevaLista);
      setPacienteSeleccionado(data);
      setModalNuevoPaciente(false);

      setFormNombre('');
      setFormEdad('');
      setFormDiagnostico('');
      setFormAlergias('');
      setFormGrupoSanguineo('');
      setFormContactoEmergencia('');
      setFormNivelDependencia('');
      setFormMovilidad('');
      setFormNotasCuidado('');

      await cargarDetallesPaciente(data.id);
    }
  };

  const eliminarPaciente = async (id: string) => {
    Alert.alert(
      'Eliminar Ficha',
      '¿Deseas eliminar a este paciente y todos sus registros?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('pacientes').delete().eq('id', id);
            if (!error) {
              const actualizados = pacientes.filter((p) => p.id !== id);
              setPacientes(actualizados);
              if (actualizados.length > 0) {
                setPacienteSeleccionado(actualizados[0]);
                await cargarDetallesPaciente(actualizados[0].id);
              } else {
                setPacienteSeleccionado(null);
                setMedicamentos([]);
                setCitas([]);
              }
            } else {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Formato de hora amigable (ej: 08:30 hrs)
  const formatearHora = (d: Date) => {
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';
  };

  // Formato de fecha para la base de datos (YYYY-MM-DD)
  const formatearFechaISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Formato de fecha legible para el usuario (ej: 25 de octubre, 2026)
  const formatearFechaHumana = (d: Date) => {
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Guardar Medicamento
  const guardarMedicamento = async () => {
    if (!medNombre.trim() || !medDosis.trim()) {
      Alert.alert('Atención', 'Ingresa el nombre del fármaco y la dosis.');
      return;
    }

    const payloadMed: any = {
      paciente_id: pacienteSeleccionado.id,
      nombre: medNombre.trim(),
      dosis: medDosis.trim(),
      horario: formatearHora(medHoraDate),
      tomado_hoy: false,
    };

    if (medInstrucciones.trim()) {
      payloadMed.contraindicaciones = medInstrucciones.trim();
    }

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([payloadMed])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al guardar medicamento', error.message);
    } else {
      setMedicamentos((prev) => [...prev, data]);
      setModalNuevoMedicamento(false);
      setMedNombre('');
      setMedDosis('');
      setMedInstrucciones('');
      setMedHoraDate(new Date());
    }
  };

  const toggleTomadoMedicamento = async (med: any) => {
    const nuevoEstado = !med.tomado_hoy;
    setMedicamentos((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, tomado_hoy: nuevoEstado } : m))
    );

    await supabase
      .from('medicamentos')
      .update({ tomado_hoy: nuevoEstado })
      .eq('id', med.id);
  };

  const eliminarMedicamento = async (id: string) => {
    await supabase.from('medicamentos').delete().eq('id', id);
    setMedicamentos((prev) => prev.filter((m) => m.id !== id));
  };

  // Guardar Cita Médica
  const guardarCita = async () => {
    if (!citaDoctor.trim() || !citaLugar.trim()) {
      Alert.alert('Atención', 'Completa el especialista/doctor y el recinto de salud.');
      return;
    }

    const payloadCita: any = {
      paciente_id: pacienteSeleccionado.id,
      especialidad_doctor: citaDoctor.trim(),
      lugar: citaLugar.trim(),
      fecha: formatearFechaISO(citaFechaDate),
      hora: formatearHora(citaHoraDate),
      realizada: false,
    };

    if (citaNotas.trim()) {
      payloadCita.notas = citaNotas.trim();
    }

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([payloadCita])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al agendar cita', error.message);
    } else {
      setCitas((prev) => [...prev, data]);
      setModalNuevaCita(false);
      setCitaDoctor('');
      setCitaLugar('');
      setCitaNotas('');
      setCitaFechaDate(new Date());
      setCitaHoraDate(new Date());
    }
  };

  const toggleCitaRealizada = async (cita: any) => {
    const nuevoEstado = !cita.realizada;
    setCitas((prev) =>
      prev.map((c) => (c.id === cita.id ? { ...c, realizada: nuevoEstado } : c))
    );

    await supabase
      .from('citas_medicas')
      .update({ realizada: nuevoEstado })
      .eq('id', cita.id);
  };

  const eliminarCita = async (id: string) => {
    await supabase.from('citas_medicas').delete().eq('id', id);
    setCitas((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tituloHeader}>Ficha del Paciente</Text>
          <Text style={styles.subHeader}>Historial médico, recetas y consultas</Text>
        </View>
        <TouchableOpacity
          style={styles.btnCrearPaciente}
          onPress={() => setModalNuevoPaciente(true)}
        >
          <Ionicons name="person-add" size={15} color="#FFFFFF" />
          <Text style={styles.btnCrearPacienteTexto}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 40 }} />
      ) : pacientes.length === 0 ? (
        <View style={styles.sinPacientesCard}>
          <Ionicons name="heart-circle-outline" size={56} color="#A0958E" />
          <Text style={styles.sinPacientesTitulo}>No tienes pacientes registrados</Text>
          <Text style={styles.sinPacientesSub}>
            Crea la ficha de la persona a tu cuidado para organizar sus medicamentos diarios, citas y antecedentes clínicos.
          </Text>
          <TouchableOpacity
            style={styles.btnRegistrarPrimerPaciente}
            onPress={() => setModalNuevoPaciente(true)}
          >
            <Text style={styles.btnRegistrarPrimerPacienteTexto}>+ Crear Primera Ficha</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Selector Horizontal de Pacientes */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pacientesCarousel}
          >
            {pacientes.map((p) => {
              const seleccionado = pacienteSeleccionado?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pacienteChip, seleccionado && styles.pacienteChipActivo]}
                  onPress={() => {
                    setPacienteSeleccionado(p);
                    cargarDetallesPaciente(p.id);
                  }}
                >
                  <Text style={[styles.pacienteChipTexto, seleccionado && styles.pacienteChipTextoActivo]}>
                    {p.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selector de Pestañas: Ficha, Medicamentos, Citas */}
          <View style={styles.tabsSelector}>
            <TouchableOpacity
              style={[styles.tabBoton, subTab === 'ficha' && styles.tabBotonActivo]}
              onPress={() => setSubTab('ficha')}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={subTab === 'ficha' ? '#4A3B32' : '#8A7A70'}
              />
              <Text style={[styles.tabBotonTexto, subTab === 'ficha' && styles.tabBotonTextoActivo]}>
                Detalles
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBoton, subTab === 'medicamentos' && styles.tabBotonActivo]}
              onPress={() => setSubTab('medicamentos')}
            >
              <Ionicons
                name="medkit-outline"
                size={16}
                color={subTab === 'medicamentos' ? '#4A3B32' : '#8A7A70'}
              />
              <Text style={[styles.tabBotonTexto, subTab === 'medicamentos' && styles.tabBotonTextoActivo]}>
                Medicamentos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBoton, subTab === 'citas' && styles.tabBotonActivo]}
              onPress={() => setSubTab('citas')}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={subTab === 'citas' ? '#4A3B32' : '#8A7A70'}
              />
              <Text style={[styles.tabBotonTexto, subTab === 'citas' && styles.tabBotonTextoActivo]}>
                Horas Médicas
              </Text>
            </TouchableOpacity>
          </View>

          {/* VISTA 1: FICHA CLÍNICA DETALLADA */}
          {subTab === 'ficha' && (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.fichaCard}>
                <View style={styles.fichaHeaderFila}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.fichaAvatar}>
                      <Text style={styles.fichaAvatarLetra}>
                        {pacienteSeleccionado?.nombre ? pacienteSeleccionado.nombre.charAt(0).toUpperCase() : 'P'}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.fichaNombre}>{pacienteSeleccionado?.nombre}</Text>
                      <Text style={styles.fichaEdad}>
                        {pacienteSeleccionado?.edad ? `${pacienteSeleccionado.edad} años` : 'Edad no informada'}
                        {pacienteSeleccionado?.grupo_sanguineo ? `  •  Grupo: ${pacienteSeleccionado.grupo_sanguineo}` : ''}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => eliminarPaciente(pacienteSeleccionado.id)}
                    style={styles.btnBorrarFicha}
                  >
                    <Ionicons name="trash-outline" size={19} color="#D9534F" />
                  </TouchableOpacity>
                </View>

                {/* Diagnóstico Principal */}
                <View style={styles.campoDetalle}>
                  <View style={styles.campoEtiquetaFila}>
                    <Ionicons name="pulse" size={15} color="#C59A77" />
                    <Text style={styles.campoEtiqueta}>Diagnóstico Principal</Text>
                  </View>
                  <Text style={styles.campoValor}>
                    {pacienteSeleccionado?.diagnostico || pacienteSeleccionado?.padecimiento_principal || 'Sin diagnóstico registrado.'}
                  </Text>
                </View>

                {/* Alergias */}
                <View style={styles.campoDetalle}>
                  <View style={styles.campoEtiquetaFila}>
                    <Ionicons name="alert-circle" size={15} color="#D9534F" />
                    <Text style={[styles.campoEtiqueta, { color: '#D9534F' }]}>Alergias y Contraindicaciones</Text>
                  </View>
                  <Text style={[styles.campoValor, { borderColor: '#F5C6CB', backgroundColor: '#FFF5F5' }]}>
                    {pacienteSeleccionado?.alergias || 'Sin alergias conocidas.'}
                  </Text>
                </View>

                {/* Movilidad y Dependencia */}
                {(pacienteSeleccionado?.movilidad || pacienteSeleccionado?.nivel_dependencia) && (
                  <View style={styles.campoDetalle}>
                    <View style={styles.campoEtiquetaFila}>
                      <Ionicons name="walk" size={15} color="#4A3B32" />
                      <Text style={styles.campoEtiqueta}>Movilidad y Nivel de Dependencia</Text>
                    </View>
                    <Text style={styles.campoValor}>
                      {`Movilidad: ${pacienteSeleccionado?.movilidad || 'Normal'} | Dependencia: ${pacienteSeleccionado?.nivel_dependencia || 'Autónomo'}`}
                    </Text>
                  </View>
                )}

                {/* Contacto de Emergencia */}
                {pacienteSeleccionado?.contacto_emergencia && (
                  <View style={styles.campoDetalle}>
                    <View style={styles.campoEtiquetaFila}>
                      <Ionicons name="call" size={15} color="#2E7D32" />
                      <Text style={[styles.campoEtiqueta, { color: '#2E7D32' }]}>Contacto de Emergencia</Text>
                    </View>
                    <Text style={styles.campoValor}>
                      {pacienteSeleccionado.contacto_emergencia}
                    </Text>
                  </View>
                )}

                {/* Notas de cuidado */}
                <View style={styles.campoDetalle}>
                  <View style={styles.campoEtiquetaFila}>
                    <Ionicons name="reader-outline" size={15} color="#4A3B32" />
                    <Text style={styles.campoEtiqueta}>Notas de Cuidado y Cuidados Diarios</Text>
                  </View>
                  <Text style={styles.campoValor}>
                    {pacienteSeleccionado?.notas_cuidado || 'Sin instrucciones adicionales registradas.'}
                  </Text>
                </View>

                <View style={styles.statsFila}>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsNumero}>{medicamentos.length}</Text>
                    <Text style={styles.statsTexto}>Medicamentos</Text>
                  </View>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsNumero}>{citas.length}</Text>
                    <Text style={styles.statsTexto}>Citas Médicas</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          {/* VISTA 2: MEDICAMENTOS */}
          {subTab === 'medicamentos' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.btnAgregarAccion}
                onPress={() => setModalNuevoMedicamento(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnAgregarAccionTexto}>Agregar Medicamento</Text>
              </TouchableOpacity>

              <FlatList
                data={medicamentos}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.vacioBox}>
                    <Text style={styles.vacioTexto}>No hay medicamentos registrados para este paciente.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.itemCard, item.tomado_hoy && styles.itemCardTomado]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.itemNombre, item.tomado_hoy && styles.itemNombreTomado]}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.itemSubtexto}>💊 Dosis: {item.dosis}</Text>
                      <Text style={styles.itemSubtexto}>⏰ Horario: {item.horario}</Text>
                      {item.contraindicaciones ? (
                        <Text style={styles.itemNotaExtra}>Nota: {item.contraindicaciones}</Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => eliminarMedicamento(item.id)}>
                        <Ionicons name="trash-outline" size={17} color="#D9534F" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnEstado, item.tomado_hoy ? styles.btnEstadoTomado : styles.btnEstadoPendiente]}
                        onPress={() => toggleTomadoMedicamento(item)}
                      >
                        <Ionicons
                          name={item.tomado_hoy ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={item.tomado_hoy ? '#FFFFFF' : '#8A7A70'}
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

          {/* VISTA 3: HORAS MÉDICAS */}
          {subTab === 'citas' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.btnAgregarAccion}
                onPress={() => setModalNuevaCita(true)}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnAgregarAccionTexto}>Agendar Hora Médica</Text>
              </TouchableOpacity>

              <FlatList
                data={citas}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.vacioBox}>
                    <Text style={styles.vacioTexto}>No hay citas médicas registradas.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={[styles.itemCard, item.realizada && styles.itemCardTomado]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.itemNombre, item.realizada && styles.itemNombreTomado]}>
                        {item.especialidad_doctor}
                      </Text>
                      <Text style={styles.itemSubtexto}>🏥 Lugar: {item.lugar}</Text>
                      <Text style={styles.itemSubtexto}>📅 Fecha: {item.fecha}</Text>
                      <Text style={styles.itemSubtexto}>⏰ Hora: {item.hora}</Text>
                      {item.notas ? <Text style={styles.itemNotaExtra}>Nota: {item.notas}</Text> : null}
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                      <TouchableOpacity onPress={() => eliminarCita(item.id)}>
                        <Ionicons name="trash-outline" size={17} color="#D9534F" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.btnEstado, item.realizada ? styles.btnEstadoTomado : styles.btnEstadoPendiente]}
                        onPress={() => toggleCitaRealizada(item)}
                      >
                        <Ionicons
                          name={item.realizada ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={item.realizada ? '#FFFFFF' : '#8A7A70'}
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
        </View>
      )}

      {/* MODAL REGISTRAR PACIENTE */}
      <Modal visible={modalNuevoPaciente} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Nueva Ficha de Paciente</Text>
              <TouchableOpacity onPress={() => setModalNuevoPaciente(false)}>
                <Ionicons name="close" size={22} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Nombre completo *</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Rosa Gómez"
                placeholderTextColor="#A0958E"
                value={formNombre}
                onChangeText={setFormNombre}
              />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputEtiqueta}>Edad</Text>
                  <TextInput
                    style={styles.inputControl}
                    placeholder="Ej: 78"
                    placeholderTextColor="#A0958E"
                    keyboardType="numeric"
                    value={formEdad}
                    onChangeText={setFormEdad}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputEtiqueta}>Grupo Sanguíneo</Text>
                  <TextInput
                    style={styles.inputControl}
                    placeholder="Ej: O+"
                    placeholderTextColor="#A0958E"
                    value={formGrupoSanguineo}
                    onChangeText={setFormGrupoSanguineo}
                  />
                </View>
              </View>

              <Text style={styles.inputEtiqueta}>Diagnóstico Principal</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Hipertensión, Alzheimer leve"
                placeholderTextColor="#A0958E"
                value={formDiagnostico}
                onChangeText={setFormDiagnostico}
              />

              <Text style={styles.inputEtiqueta}>Alergias o Contraindicaciones</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Penicilina, mariscos, AINEs"
                placeholderTextColor="#A0958E"
                value={formAlergias}
                onChangeText={setFormAlergias}
              />

              <Text style={styles.inputEtiqueta}>Contacto de Emergencia</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Hijo Carlos +56912345678"
                placeholderTextColor="#A0958E"
                value={formContactoEmergencia}
                onChangeText={setFormContactoEmergencia}
              />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputEtiqueta}>Movilidad</Text>
                  <TextInput
                    style={styles.inputControl}
                    placeholder="Ej: Andador / Silla"
                    placeholderTextColor="#A0958E"
                    value={formMovilidad}
                    onChangeText={setFormMovilidad}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputEtiqueta}>Dependencia</Text>
                  <TextInput
                    style={styles.inputControl}
                    placeholder="Ej: Moderada"
                    placeholderTextColor="#A0958E"
                    value={formNivelDependencia}
                    onChangeText={setFormNivelDependencia}
                  />
                </View>
              </View>

              <Text style={styles.inputEtiqueta}>Notas de Cuidado o Rutina</Text>
              <TextInput
                style={[styles.inputControl, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Ej: Ejercicios de kinesiología por la tarde..."
                placeholderTextColor="#A0958E"
                multiline
                value={formNotasCuidado}
                onChangeText={setFormNotasCuidado}
              />

              <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarPaciente}>
                <Text style={styles.btnConfirmarModalTexto}>Crear Ficha</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL REGISTRAR MEDICAMENTO (SELECTOR DESLIZANTE DE HORA) */}
      <Modal visible={modalNuevoMedicamento} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalNuevoMedicamento(false)}>
                <Ionicons name="close" size={22} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputEtiqueta}>Nombre del Fármaco</Text>
            <TextInput
              style={styles.inputControl}
              placeholder="Ej: Paracetamol"
              placeholderTextColor="#A0958E"
              value={medNombre}
              onChangeText={setMedNombre}
            />

            <Text style={styles.inputEtiqueta}>Dosis</Text>
            <TextInput
              style={styles.inputControl}
              placeholder="Ej: 500 mg (1 comprimido)"
              placeholderTextColor="#A0958E"
              value={medDosis}
              onChangeText={setMedDosis}
            />

            {/* BOTÓN DESLIZANTE HORA */}
            <Text style={styles.inputEtiqueta}>Horario de Toma</Text>
            <TouchableOpacity
              style={styles.btnSelectorPicker}
              onPress={() => setMostrarPickerMedHora(true)}
            >
              <Ionicons name="time-outline" size={20} color="#C59A77" />
              <Text style={styles.btnSelectorPickerTexto}>{formatearHora(medHoraDate)}</Text>
              <Ionicons name="chevron-down" size={16} color="#A0958E" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {mostrarPickerMedHora && (
              <DateTimePicker
                value={medHoraDate}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setMostrarPickerMedHora(Platform.OS === 'ios');
                  if (selectedDate) setMedHoraDate(selectedDate);
                }}
              />
            )}

            <Text style={styles.inputEtiqueta}>Instrucciones adicionales</Text>
            <TextInput
              style={styles.inputControl}
              placeholder="Ej: Tomar después del almuerzo con agua"
              placeholderTextColor="#A0958E"
              value={medInstrucciones}
              onChangeText={setMedInstrucciones}
            />

            <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarMedicamento}>
              <Text style={styles.btnConfirmarModalTexto}>Registrar Medicamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL REGISTRAR CITA MÉDICA (SELECTORES DESLIZANTES DE FECHA Y HORA) */}
      <Modal visible={modalNuevaCita} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Agendar Cita Médica</Text>
              <TouchableOpacity onPress={() => setModalNuevaCita(false)}>
                <Ionicons name="close" size={22} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Especialista o Doctor</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Dr. Morales (Cardiología)"
                placeholderTextColor="#A0958E"
                value={citaDoctor}
                onChangeText={setCitaDoctor}
              />

              <Text style={styles.inputEtiqueta}>Centro Médico / Lugar</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Hospital Clínico / CESFAM"
                placeholderTextColor="#A0958E"
                value={citaLugar}
                onChangeText={setCitaLugar}
              />

              {/* SELECTOR DESLIZANTE DE FECHA (CALENDARIO / RUEDA) */}
              <Text style={styles.inputEtiqueta}>Fecha de la Cita</Text>
              <TouchableOpacity
                style={styles.btnSelectorPicker}
                onPress={() => setMostrarPickerCitaFecha(true)}
              >
                <Ionicons name="calendar" size={18} color="#C59A77" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearFechaHumana(citaFechaDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#A0958E" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {mostrarPickerCitaFecha && (
                <DateTimePicker
                  value={citaFechaDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(event, selectedDate) => {
                    setMostrarPickerCitaFecha(Platform.OS === 'ios');
                    if (selectedDate) setCitaFechaDate(selectedDate);
                  }}
                />
              )}

              {/* SELECTOR DESLIZANTE DE HORA */}
              <Text style={styles.inputEtiqueta}>Hora de Atención</Text>
              <TouchableOpacity
                style={styles.btnSelectorPicker}
                onPress={() => setMostrarPickerCitaHora(true)}
              >
                <Ionicons name="time" size={18} color="#C59A77" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearHora(citaHoraDate)}</Text>
                <Ionicons name="chevron-down" size={16} color="#A0958E" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>

              {mostrarPickerCitaHora && (
                <DateTimePicker
                  value={citaHoraDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setMostrarPickerCitaHora(Platform.OS === 'ios');
                    if (selectedDate) setCitaHoraDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.inputEtiqueta}>Notas / Indicaciones</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Llevar exámenes de sangre y carnet"
                placeholderTextColor="#A0958E"
                value={citaNotas}
                onChangeText={setCitaNotas}
              />

              <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarCita}>
                <Text style={styles.btnConfirmarModalTexto}>Agendar Cita</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tituloHeader: { fontSize: 22, fontWeight: 'bold', color: '#4A3B32' },
  subHeader: { fontSize: 12, color: '#8A7A70' },
  btnCrearPaciente: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C59A77', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10 },
  btnCrearPacienteTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, marginLeft: 5 },
  sinPacientesCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 25 },
  sinPacientesTitulo: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginTop: 12 },
  sinPacientesSub: { fontSize: 13, color: '#8A7A70', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  btnRegistrarPrimerPaciente: { marginTop: 16, backgroundColor: '#C59A77', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  btnRegistrarPrimerPacienteTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  pacientesCarousel: { maxHeight: 44, marginBottom: 12 },
  pacienteChip: { backgroundColor: '#FFFFFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E8DFD8' },
  pacienteChipActivo: { backgroundColor: '#4A3B32', borderColor: '#4A3B32' },
  pacienteChipTexto: { fontSize: 13, fontWeight: 'bold', color: '#665B54' },
  pacienteChipTextoActivo: { color: '#FFFFFF' },
  tabsSelector: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#E8DFD8' },
  tabBoton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabBotonActivo: { backgroundColor: '#F7EFE8' },
  tabBotonTexto: { fontSize: 12, fontWeight: 'bold', color: '#8A7A70', marginLeft: 4 },
  tabBotonTextoActivo: { color: '#4A3B32' },
  fichaCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E8DFD8' },
  fichaHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F7EFE8', paddingBottom: 12, marginBottom: 12 },
  fichaAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center' },
  fichaAvatarLetra: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  fichaNombre: { fontSize: 17, fontWeight: 'bold', color: '#4A3B32' },
  fichaEdad: { fontSize: 12, color: '#8A7A70', marginTop: 2 },
  btnBorrarFicha: { padding: 6 },
  campoDetalle: { marginBottom: 12 },
  campoEtiquetaFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  campoEtiqueta: { fontSize: 12, fontWeight: 'bold', color: '#4A3B32', marginLeft: 6 },
  campoValor: { fontSize: 13, color: '#554A43', backgroundColor: '#FAF6F0', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E8DFD8', lineHeight: 18 },
  statsFila: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  statsCard: { flex: 1, backgroundColor: '#FAF6F0', padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E8DFD8' },
  statsNumero: { fontSize: 20, fontWeight: 'bold', color: '#C59A77' },
  statsTexto: { fontSize: 12, color: '#8A7A70', marginTop: 2 },
  btnAgregarAccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#C59A77', paddingVertical: 10, borderRadius: 12, marginBottom: 12 },
  btnAgregarAccionTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, marginLeft: 6 },
  vacioBox: { alignItems: 'center', padding: 30 },
  vacioTexto: { fontSize: 13, color: '#8A7A70' },
  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8DFD8' },
  itemCardTomado: { backgroundColor: '#F0F9F0', borderColor: '#C8E6C9' },
  itemNombre: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32', marginBottom: 3 },
  itemNombreTomado: { textDecorationLine: 'line-through', color: '#689F38' },
  itemSubtexto: { fontSize: 13, color: '#554A43', marginTop: 2 },
  itemNotaExtra: { fontSize: 12, color: '#8A7A70', fontStyle: 'italic', marginTop: 4 },
  btnEstado: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, marginTop: 8 },
  btnEstadoTomado: { backgroundColor: '#4CAF50' },
  btnEstadoPendiente: { backgroundColor: '#F2EBE5' },
  btnEstadoTexto: { fontSize: 12, fontWeight: 'bold', color: '#8A7A70', marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, maxHeight: '88%' },
  modalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalCardTitulo: { fontSize: 17, fontWeight: 'bold', color: '#4A3B32' },
  inputEtiqueta: { fontSize: 12, fontWeight: 'bold', color: '#8A7A70', marginTop: 10, marginBottom: 4 },
  inputControl: { backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 10, padding: 10, fontSize: 14, color: '#333' },
  btnSelectorPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#C59A77', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginTop: 4 },
  btnSelectorPickerTexto: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginLeft: 8 },
  btnConfirmarModal: { backgroundColor: '#C59A77', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  btnConfirmarModalTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});