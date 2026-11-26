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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { notificarMedicamentoGrupo } from '../../lib/notificaciones';

export default function GrupoEleamScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [miNombre, setMiNombre] = useState('Cuidador');
  const [noLeidas, setNoLeidas] = useState(0);

  // Grupos del usuario
  const [misGrupos, setMisGrupos] = useState<any[]>([]);
  const [grupoActivo, setGrupoActivo] = useState<any>(null);
  const [esAdminGrupo, setEsAdminGrupo] = useState(false);

  // Pacientes del grupo
  const [pacientesGrupo, setPacientesGrupo] = useState<any[]>([]);
  const [pacienteActivo, setPacienteActivo] = useState<any>(null);

  // Subpestañas: ficha | medicamentos | citas | bitacora (solo admin grupo)
  const [subTab, setSubTab] = useState<'ficha' | 'medicamentos' | 'citas' | 'bitacora'>('medicamentos');

  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [citas, setCitas] = useState<any[]>([]);
  const [bitacora, setBitacora] = useState<any[]>([]);

  // Modales Admin de Grupo
  const [modalNuevoPaciente, setModalNuevoPaciente] = useState(false);
  const [modalNuevoMed, setModalNuevoMed] = useState(false);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);

  // Modal Observación Post-Cita (Cualquier miembro del grupo)
  const [modalObsCita, setModalObsCita] = useState(false);
  const [citaEditandoObs, setCitaEditandoObs] = useState<any>(null);
  const [textoObservacionCita, setTextoObservacionCita] = useState('');

  // Form Nuevo Paciente Grupo
  const [pNombre, setPNombre] = useState('');
  const [pEdad, setPEdad] = useState('');
  const [pGrupoSangre, setPGrupoSangre] = useState('');
  const [pDiagnostico, setPDiagnostico] = useState('');
  const [pAlergias, setPAlergias] = useState('');
  const [pMovilidad, setPMovilidad] = useState('');
  const [pNotas, setPNotas] = useState('');

  // Form Nuevo Medicamento Grupo
  const [mNombre, setMNombre] = useState('');
  const [mDosis, setMDosis] = useState('');
  const [mHoraDate, setMHoraDate] = useState(new Date());
  const [showPickerMed, setShowPickerMed] = useState(false);
  const [mNotas, setMNotas] = useState('');

  // Form Nueva Cita Grupo
  const [cDoctor, setCDoctor] = useState('');
  const [cLugar, setCLugar] = useState('');
  const [cFechaDate, setCFechaDate] = useState(new Date());
  const [cHoraDate, setCHoraDate] = useState(new Date());
  const [showPickerCFecha, setShowPickerCFecha] = useState(false);
  const [showPickerCHora, setShowPickerCHora] = useState(false);
  const [cNotas, setCNotas] = useState('');

  const obtenerFechaHoyISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatearHora = (d: Date) =>
    d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + ' hrs';

  const formatearFechaHumana = (d: Date) =>
    d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const contarNoLeidas = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('notificaciones_app')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_destino_id', userId)
        .eq('leida', false);

      setNoLeidas(count || 0);
    } catch {
      setNoLeidas(0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const cargar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !activo) return;
        setCurrentUser(user);

        await contarNoLeidas(user.id);

        const { data: perfil } = await supabase
          .from('cuidadores')
          .select('nombre')
          .eq('id', user.id)
          .maybeSingle();

        setMiNombre(perfil?.nombre || user.email?.split('@')[0] || 'Cuidador');

        // Buscar grupos donde participa el cuidador
        const { data: membresias } = await supabase
          .from('grupo_miembros')
          .select('grupo_id, rol, grupos(id, nombre, descripcion)')
          .eq('cuidador_id', user.id);

        if (membresias && membresias.length > 0 && activo) {
          const listaFormateada = membresias
            .filter((m: any) => m.grupos)
            .map((m: any) => ({
              id: m.grupos.id,
              nombre: m.grupos.nombre,
              descripcion: m.grupos.descripcion,
              rol: m.rol,
            }));

          setMisGrupos(listaFormateada);

          if (listaFormateada.length > 0) {
            const seleccionado = grupoActivo
              ? listaFormateada.find((g) => g.id === grupoActivo.id) || listaFormateada[0]
              : listaFormateada[0];

            await seleccionarGrupo(seleccionado);
          }
        } else if (activo) {
          setMisGrupos([]);
          setGrupoActivo(null);
        }

        if (activo) setLoading(false);
      };

      cargar();
      return () => {
        activo = false;
      };
    }, [])
  );

  const seleccionarGrupo = async (grupo: any) => {
    setGrupoActivo(grupo);
    const admin = grupo.rol === 'admin_grupo';
    setEsAdminGrupo(admin);
    if (!admin && subTab === 'bitacora') {
      setSubTab('medicamentos');
    }

    const { data: pacs } = await supabase
      .from('pacientes')
      .select('*')
      .eq('grupo_id', grupo.id)
      .order('nombre', { ascending: true });

    if (pacs && pacs.length > 0) {
      setPacientesGrupo(pacs);
      setPacienteActivo(pacs[0]);
      await cargarDatosPacienteGrupo(pacs[0].id, grupo.id);
    } else {
      setPacientesGrupo([]);
      setPacienteActivo(null);
      setMedicamentos([]);
      setCitas([]);
    }

    if (admin) {
      await cargarBitacoraGrupo(grupo.id);
    }
  };

  const cargarDatosPacienteGrupo = async (pacienteId: string, grupoId: string) => {
    const hoy = obtenerFechaHoyISO();

    // 1. Cargar medicamentos y aplicar reinicio diario automático
    const { data: meds } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true });

    const medsActualizados: any[] = [];
    for (const m of meds || []) {
      if (m.tomado_hoy && m.fecha_ultima_toma && m.fecha_ultima_toma !== hoy) {
        await supabase
          .from('medicamentos')
          .update({
            tomado_hoy: false,
            hora_ultima_toma: null,
            tomado_por_id: null,
            tomado_por_nombre: null,
          })
          .eq('id', m.id);

        medsActualizados.push({
          ...m,
          tomado_hoy: false,
          hora_ultima_toma: null,
          tomado_por_nombre: null,
        });
      } else {
        medsActualizados.push(m);
      }
    }
    setMedicamentos(medsActualizados);

    // 2. Cargar citas médicas
    const { data: appointments } = await supabase
      .from('citas_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    setCitas(appointments || []);

    // 3. Refrescar bitácora del grupo
    await cargarBitacoraGrupo(grupoId);
  };

  const cargarBitacoraGrupo = async (grupoId: string) => {
    const { data } = await supabase
      .from('historial_medicaciones')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('created_at', { ascending: false })
      .limit(50);

    setBitacora(data || []);
  };

  // --- ACCIONES EXCLUSIVAS ADMIN DE GRUPO ---
  const crearPacienteEnGrupo = async () => {
    if (!pNombre.trim()) {
      Alert.alert('Atención', 'Ingresa el nombre del residente/paciente.');
      return;
    }

    const payload: any = {
      cuidador_id: currentUser.id,
      grupo_id: grupoActivo.id,
      nombre: pNombre.trim(),
    };

    if (pEdad.trim()) payload.edad = parseInt(pEdad.trim(), 10);
    if (pGrupoSangre.trim()) payload.grupo_sanguineo = pGrupoSangre.trim();
    if (pDiagnostico.trim()) {
      payload.diagnostico = pDiagnostico.trim();
      payload.padecimiento_principal = pDiagnostico.trim();
    }
    if (pAlergias.trim()) payload.alergias = pAlergias.trim();
    if (pMovilidad.trim()) payload.movilidad = pMovilidad.trim();
    if (pNotas.trim()) payload.notas_cuidado = pNotas.trim();

    const { data, error } = await supabase
      .from('pacientes')
      .insert([payload])
      .select()
      .single();

    if (error) {
      Alert.alert('Error al crear ficha', error.message);
    } else if (data) {
      const lista = [...pacientesGrupo, data];
      setPacientesGrupo(lista);
      setPacienteActivo(data);
      setModalNuevoPaciente(false);
      setPNombre('');
      setPEdad('');
      setPGrupoSangre('');
      setPDiagnostico('');
      setPAlergias('');
      setPMovilidad('');
      setPNotas('');
      await cargarDatosPacienteGrupo(data.id, grupoActivo.id);
    }
  };

  const agregarMedicamentoGrupo = async () => {
    if (!mNombre.trim() || !mDosis.trim()) {
      Alert.alert('Atención', 'Ingresa el nombre del medicamento y la dosis.');
      return;
    }

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([
        {
          paciente_id: pacienteActivo.id,
          nombre: mNombre.trim(),
          dosis: mDosis.trim(),
          horario: formatearHora(mHoraDate),
          contraindicaciones: mNotas.trim() || null,
          tomado_hoy: false,
        },
      ])
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setMedicamentos((prev) => [...prev, data]);
      setModalNuevoMed(false);
      setMNombre('');
      setMDosis('');
      setMNotas('');
    }
  };

  const agregarCitaGrupo = async () => {
    if (!cDoctor.trim() || !cLugar.trim()) {
      Alert.alert('Atención', 'Ingresa el especialista y el centro médico.');
      return;
    }

    const yyyy = cFechaDate.getFullYear();
    const mm = String(cFechaDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cFechaDate.getDate()).padStart(2, '0');

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([
        {
          paciente_id: pacienteActivo.id,
          especialidad_doctor: cDoctor.trim(),
          lugar: cLugar.trim(),
          fecha: `${yyyy}-${mm}-${dd}`,
          hora: formatearHora(cHoraDate),
          notas: cNotas.trim() || null,
          realizada: false,
        },
      ])
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setCitas((prev) => [...prev, data]);
      setModalNuevaCita(false);
      setCDoctor('');
      setCLugar('');
      setCNotas('');
    }
  };

  // --- ACCIONES PARA TODOS LOS CUIDADORES DEL GRUPO ---
  const marcarMedicamentoTomadoGrupo = async (med: any) => {
    if (med.tomado_hoy) {
      Alert.alert(
        'Ya administrado',
        `Este medicamento ya fue registrado por ${med.tomado_por_nombre || 'otro cuidador'} a las ${med.hora_ultima_toma}.`
      );
      return;
    }

    const hoy = obtenerFechaHoyISO();
    const horaActual = formatearHora(new Date());

    const { error } = await supabase
      .from('medicamentos')
      .update({
        tomado_hoy: true,
        fecha_ultima_toma: hoy,
        hora_ultima_toma: horaActual,
        tomado_por_id: currentUser.id,
        tomado_por_nombre: miNombre,
      })
      .eq('id', med.id);

    if (error) {
      Alert.alert('Error al registrar toma', error.message);
      return;
    }

    await supabase.from('historial_medicaciones').insert([
      {
        grupo_id: grupoActivo.id,
        paciente_id: pacienteActivo.id,
        paciente_nombre: pacienteActivo.nombre,
        medicamento_id: med.id,
        medicamento_nombre: med.nombre,
        dosis: med.dosis,
        administrado_por_id: currentUser.id,
        administrado_por_nombre: miNombre,
        fecha: hoy,
        hora: horaActual,
      },
    ]);

    setMedicamentos((prev) =>
      prev.map((item) =>
        item.id === med.id
          ? {
              ...item,
              tomado_hoy: true,
              fecha_ultima_toma: hoy,
              hora_ultima_toma: horaActual,
              tomado_por_nombre: miNombre,
            }
          : item
      )
    );

    await notificarMedicamentoGrupo({
      grupoId: grupoActivo.id,
      cuidadorQueAdministroId: currentUser.id,
      cuidadorNombre: miNombre,
      medicamentoNombre: med.nombre,
      dosis: med.dosis,
      pacienteNombre: pacienteActivo.nombre,
      horaTexto: horaActual,
    });

    await cargarBitacoraGrupo(grupoActivo.id);
    Alert.alert('Registrado y notificado', 'Se avisó a todo el equipo del grupo.');
  };

  const toggleAsistenciaCitaGrupo = async (cita: any) => {
    const nuevoEstado = !cita.realizada;
    const { error } = await supabase
      .from('citas_medicas')
      .update({
        realizada: nuevoEstado,
        actualizado_por_nombre: miNombre,
      })
      .eq('id', cita.id);

    if (!error) {
      setCitas((prev) =>
        prev.map((c) =>
          c.id === cita.id
            ? { ...c, realizada: nuevoEstado, actualizado_por_nombre: miNombre }
            : c
        )
      );
    }
  };

  const abrirModalObservacionCita = (cita: any) => {
    setCitaEditandoObs(cita);
    setTextoObservacionCita(cita.observaciones_post_cita || '');
    setModalObsCita(true);
  };

  const guardarObservacionPostCita = async () => {
    if (!citaEditandoObs) return;

    const { error } = await supabase
      .from('citas_medicas')
      .update({
        observaciones_post_cita: textoObservacionCita.trim(),
        actualizado_por_nombre: miNombre,
      })
      .eq('id', citaEditandoObs.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCitas((prev) =>
        prev.map((c) =>
          c.id === citaEditandoObs.id
            ? {
                ...c,
                observaciones_post_cita: textoObservacionCita.trim(),
                actualizado_por_nombre: miNombre,
              }
            : c
        )
      );
      setModalObsCita(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#2C221E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Encabezado con Campanita y Botón Residente */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.tituloHeader}>Equipo y Turnos</Text>
          <Text style={styles.subHeader}>
            {grupoActivo
              ? `${grupoActivo.nombre} • ${esAdminGrupo ? 'Admin de Grupo' : 'Cuidador'}`
              : 'Pacientes compartidos ELEAM'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {grupoActivo && esAdminGrupo && (
            <TouchableOpacity
              style={styles.btnNuevoPaciente}
              onPress={() => setModalNuevoPaciente(true)}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.btnNuevoPacienteTexto}>Residente</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.btnCampana}
            onPress={() => router.push('/notificaciones')}
            accessibilityLabel="Ver notificaciones"
          >
            <Ionicons name="notifications" size={24} color="#141414" />
            {noLeidas > 0 && (
              <View style={styles.badgeCampana}>
                <Text style={styles.badgeCampanaTexto}>
                  {noLeidas > 99 ? '99+' : noLeidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {misGrupos.length === 0 ? (
        <View style={styles.sinGrupoCard}>
          <Ionicons name="people-circle-outline" size={68} color="#2C221E" />
          <Text style={styles.sinGrupoTitulo}>Aún no perteneces a un grupo</Text>
          <Text style={styles.sinGrupoSub}>
            Cuando la administración de RESPIRO te asigne a un equipo o residencia, aquí verás los residentes compartidos, sus horarios de remedios y alertas del turno.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {misGrupos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48, marginBottom: 10 }}>
              {misGrupos.map((g) => {
                const activo = grupoActivo?.id === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.chip, activo && styles.chipActivo]}
                    onPress={() => seleccionarGrupo(g)}
                  >
                    <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{g.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {pacientesGrupo.length === 0 ? (
            <View style={styles.sinGrupoCard}>
              <Text style={styles.sinGrupoTitulo}>Sin residentes en este grupo</Text>
              <Text style={styles.sinGrupoSub}>
                {esAdminGrupo
                  ? 'Presiona "+ Residente" arriba para crear la primera ficha compartida.'
                  : 'El encargado de tu grupo aún no ha registrado residentes.'}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: 50, marginBottom: 12 }}
              >
                {pacientesGrupo.map((p) => {
                  const sel = pacienteActivo?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, sel && styles.chipActivo]}
                      onPress={() => {
                        setPacienteActivo(p);
                        cargarDatosPacienteGrupo(p.id, grupoActivo.id);
                      }}
                    >
                      <Text style={[styles.chipTexto, sel && styles.chipTextoActivo]}>{p.nombre}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Subpestañas */}
              <View style={styles.subTabsBar}>
                <TouchableOpacity
                  style={[styles.subTabBtn, subTab === 'medicamentos' && styles.subTabBtnActivo]}
                  onPress={() => setSubTab('medicamentos')}
                >
                  <Text style={[styles.subTabText, subTab === 'medicamentos' && styles.subTabTextActivo]}>
                    Remedios
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTabBtn, subTab === 'citas' && styles.subTabBtnActivo]}
                  onPress={() => setSubTab('citas')}
                >
                  <Text style={[styles.subTabText, subTab === 'citas' && styles.subTabTextActivo]}>
                    Citas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTabBtn, subTab === 'ficha' && styles.subTabBtnActivo]}
                  onPress={() => setSubTab('ficha')}
                >
                  <Text style={[styles.subTabText, subTab === 'ficha' && styles.subTabTextActivo]}>
                    Ficha
                  </Text>
                </TouchableOpacity>

                {esAdminGrupo && (
                  <TouchableOpacity
                    style={[styles.subTabBtn, subTab === 'bitacora' && styles.subTabBtnActivo]}
                    onPress={() => setSubTab('bitacora')}
                  >
                    <Text style={[styles.subTabText, subTab === 'bitacora' && styles.subTabTextActivo]}>
                      Bitácora
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* VISTA 1: MEDICAMENTOS DEL GRUPO */}
              {subTab === 'medicamentos' && (
                <View style={{ flex: 1 }}>
                  {esAdminGrupo && (
                    <TouchableOpacity
                      style={styles.btnAccionAdmin}
                      onPress={() => setModalNuevoMed(true)}
                    >
                      <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                      <Text style={styles.btnAccionAdminText}>Agregar Medicamento al Residente</Text>
                    </TouchableOpacity>
                  )}

                  <FlatList
                    data={medicamentos}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <Text style={styles.vacioTexto}>No hay medicamentos registrados.</Text>
                    }
                    renderItem={({ item }) => (
                      <View style={[styles.cardItem, item.tomado_hoy && styles.cardItemVerde]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitulo}>{item.nombre}</Text>
                          <Text style={styles.itemLinea}>💊 Dosis: {item.dosis}</Text>
                          <Text style={styles.itemLinea}>⏰ Horario: {item.horario}</Text>
                          {item.contraindicaciones ? (
                            <Text style={styles.itemNota}>Nota: {item.contraindicaciones}</Text>
                          ) : null}

                          {item.tomado_hoy ? (
                            <View style={styles.badgeTomaConfirmada}>
                              <Ionicons name="checkmark-done-circle" size={20} color="#1B5E20" />
                              <Text style={styles.badgeTomaConfirmadaTexto}>
                                Tomado a las {item.hora_ultima_toma} por {item.tomado_por_nombre}
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.btnMarcarTomado}
                              onPress={() => marcarMedicamentoTomadoGrupo(item)}
                            >
                              <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                              <Text style={styles.btnMarcarTomadoTexto}>Marcar como Tomado</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* VISTA 2: CITAS Y OBSERVACIONES POST-CITA */}
              {subTab === 'citas' && (
                <View style={{ flex: 1 }}>
                  {esAdminGrupo && (
                    <TouchableOpacity
                      style={styles.btnAccionAdmin}
                      onPress={() => setModalNuevaCita(true)}
                    >
                      <Ionicons name="calendar" size={22} color="#FFFFFF" />
                      <Text style={styles.btnAccionAdminText}>Agendar Hora Médica</Text>
                    </TouchableOpacity>
                  )}

                  <FlatList
                    data={citas}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <Text style={styles.vacioTexto}>No hay citas médicas agendadas.</Text>
                    }
                    renderItem={({ item }) => (
                      <View style={[styles.cardItem, item.realizada && styles.cardItemVerde]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitulo}>{item.especialidad_doctor}</Text>
                          <Text style={styles.itemLinea}>🏥 Lugar: {item.lugar}</Text>
                          <Text style={styles.itemLinea}>
                            📅 {item.fecha} • ⏰ {item.hora}
                          </Text>
                          {item.notas ? <Text style={styles.itemNota}>Indicaciones: {item.notas}</Text> : null}

                          {item.observaciones_post_cita ? (
                            <View style={styles.obsBox}>
                              <Text style={styles.obsTitulo}>
                                Observación post-cita ({item.actualizado_por_nombre || 'Equipo'}):
                              </Text>
                              <Text style={styles.obsTexto}>{item.observaciones_post_cita}</Text>
                            </View>
                          ) : null}

                          <View style={{ flexDirection: 'row', marginTop: 10 }}>
                            <TouchableOpacity
                              style={[
                                styles.btnCitaAccion,
                                item.realizada ? { backgroundColor: '#1B5E20' } : { backgroundColor: '#2C221E' },
                              ]}
                              onPress={() => toggleAsistenciaCitaGrupo(item)}
                            >
                              <Text style={styles.btnCitaAccionText}>
                                {item.realizada ? 'Asistió ✓' : 'Marcar Asistencia'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.btnObsCita}
                              onPress={() => abrirModalObservacionCita(item)}
                            >
                              <Ionicons name="create" size={18} color="#141414" />
                              <Text style={styles.btnObsCitaText}>Observación</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* VISTA 3: FICHA CLÍNICA DE SOLO LECTURA */}
              {subTab === 'ficha' && pacienteActivo && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.fichaCard}>
                    <Text style={styles.fichaNombre}>{pacienteActivo.nombre}</Text>
                    <Text style={styles.fichaSub}>
                      {pacienteActivo.edad ? `${pacienteActivo.edad} años` : 'Edad no registrada'}
                      {pacienteActivo.grupo_sanguineo ? ` • Grupo ${pacienteActivo.grupo_sanguineo}` : ''}
                    </Text>

                    <Text style={styles.fichaLabel}>Diagnóstico Principal</Text>
                    <Text style={styles.fichaValor}>
                      {pacienteActivo.diagnostico || 'Sin diagnóstico registrado.'}
                    </Text>

                    <Text style={[styles.fichaLabel, { color: '#B71C1C' }]}>Alergias</Text>
                    <Text style={[styles.fichaValor, { borderColor: '#B71C1C', backgroundColor: '#FFF5F5' }]}>
                      {pacienteActivo.alergias || 'Sin alergias conocidas.'}
                    </Text>

                    <Text style={styles.fichaLabel}>Movilidad y Cuidados</Text>
                    <Text style={styles.fichaValor}>
                      {`Movilidad: ${pacienteActivo.movilidad || 'Normal'}\n${pacienteActivo.notas_cuidado || ''}`}
                    </Text>
                  </View>
                </ScrollView>
              )}

              {/* VISTA 4: BITÁCORA DE MEDICACIONES (SOLO ADMIN DE GRUPO) */}
              {subTab === 'bitacora' && esAdminGrupo && (
                <FlatList
                  data={bitacora}
                  keyExtractor={(item) => String(item.id)}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.vacioTexto}>Aún no hay registros de administración.</Text>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.bitacoraCard}>
                      <Text style={styles.bitacoraPaciente}>Residente: {item.paciente_nombre}</Text>
                      <Text style={styles.bitacoraDetalle}>
                        💊 {item.medicamento_nombre} ({item.dosis})
                      </Text>
                      <Text style={styles.bitacoraResponsable}>
                        ✅ Administrado por {item.administrado_por_nombre} • {item.fecha} a las {item.hora}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* MODAL OBSERVACIÓN POST-CITA */}
      <Modal visible={modalObsCita} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Observación Post-Cita</Text>
              <TouchableOpacity onPress={() => setModalObsCita(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>
              Indicaciones médicas para el equipo (ej: "No puede comer hasta mañana", "Reposo 48 hrs"):
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              multiline
              placeholder="Escribe las indicaciones..."
              placeholderTextColor="#555555"
              value={textoObservacionCita}
              onChangeText={setTextoObservacionCita}
            />
            <TouchableOpacity style={styles.btnGuardarModal} onPress={guardarObservacionPostCita}>
              <Text style={styles.btnGuardarModalTexto}>Guardar Observación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL CREAR RESIDENTE (SOLO ADMIN GRUPO) */}
      <Modal visible={modalNuevoPaciente} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nuevo Residente en Grupo</Text>
              <TouchableOpacity onPress={() => setModalNuevoPaciente(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nombre completo *</Text>
              <TextInput style={styles.input} value={pNombre} onChangeText={setPNombre} placeholder="Ej: Señora Sara" placeholderTextColor="#555555" />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Edad</Text>
                  <TextInput style={styles.input} value={pEdad} onChangeText={setPEdad} keyboardType="numeric" placeholder="82" placeholderTextColor="#555555" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Grupo Sangre</Text>
                  <TextInput style={styles.input} value={pGrupoSangre} onChangeText={setPGrupoSangre} placeholder="O+" placeholderTextColor="#555555" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Diagnóstico</Text>
              <TextInput style={styles.input} value={pDiagnostico} onChangeText={setPDiagnostico} placeholder="Ej: Diabetes / Hipertensión" placeholderTextColor="#555555" />

              <Text style={styles.inputLabel}>Alergias</Text>
              <TextInput style={styles.input} value={pAlergias} onChangeText={setPAlergias} placeholder="Ej: Penicilina" placeholderTextColor="#555555" />

              <Text style={styles.inputLabel}>Movilidad</Text>
              <TextInput style={styles.input} value={pMovilidad} onChangeText={setPMovilidad} placeholder="Ej: Silla de ruedas" placeholderTextColor="#555555" />

              <Text style={styles.inputLabel}>Notas de cuidado</Text>
              <TextInput style={[styles.input, { minHeight: 70 }]} multiline value={pNotas} onChangeText={setPNotas} placeholder="Cuidados especiales..." placeholderTextColor="#555555" />

              <TouchableOpacity style={styles.btnGuardarModal} onPress={crearPacienteEnGrupo}>
                <Text style={styles.btnGuardarModalTexto}>Guardar Residente</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL NUEVO MEDICAMENTO (SOLO ADMIN GRUPO) */}
      <Modal visible={modalNuevoMed} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalNuevoMed(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Fármaco *</Text>
            <TextInput style={styles.input} value={mNombre} onChangeText={setMNombre} placeholder="Ej: Losartán" placeholderTextColor="#555555" />

            <Text style={styles.inputLabel}>Dosis *</Text>
            <TextInput style={styles.input} value={mDosis} onChangeText={setMDosis} placeholder="Ej: 50 mg" placeholderTextColor="#555555" />

            <Text style={styles.inputLabel}>Horario</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPickerMed(true)}>
              <Ionicons name="time" size={20} color="#141414" />
              <Text style={styles.pickerBtnText}>{formatearHora(mHoraDate)}</Text>
            </TouchableOpacity>
            {showPickerMed && (
              <DateTimePicker
                value={mHoraDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => {
                  setShowPickerMed(Platform.OS === 'ios');
                  if (d) setMHoraDate(d);
                }}
              />
            )}

            <Text style={styles.inputLabel}>Indicaciones</Text>
            <TextInput style={styles.input} value={mNotas} onChangeText={setMNotas} placeholder="Ej: Con desayuno" placeholderTextColor="#555555" />

            <TouchableOpacity style={styles.btnGuardarModal} onPress={agregarMedicamentoGrupo}>
              <Text style={styles.btnGuardarModalTexto}>Guardar Medicamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL NUEVA CITA (SOLO ADMIN GRUPO) */}
      <Modal visible={modalNuevaCita} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Agendar Cita Médica</Text>
              <TouchableOpacity onPress={() => setModalNuevaCita(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Especialista *</Text>
              <TextInput style={styles.input} value={cDoctor} onChangeText={setCDoctor} placeholder="Ej: Geriatra" placeholderTextColor="#555555" />

              <Text style={styles.inputLabel}>Lugar *</Text>
              <TextInput style={styles.input} value={cLugar} onChangeText={setCLugar} placeholder="Ej: Hospital Clínico" placeholderTextColor="#555555" />

              <Text style={styles.inputLabel}>Fecha</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPickerCFecha(true)}>
                <Ionicons name="calendar" size={20} color="#141414" />
                <Text style={styles.pickerBtnText}>{formatearFechaHumana(cFechaDate)}</Text>
              </TouchableOpacity>
              {showPickerCFecha && (
                <DateTimePicker
                  value={cFechaDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e, d) => {
                    setShowPickerCFecha(Platform.OS === 'ios');
                    if (d) setCFechaDate(d);
                  }}
                />
              )}

              <Text style={styles.inputLabel}>Hora</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPickerCHora(true)}>
                <Ionicons name="time" size={20} color="#141414" />
                <Text style={styles.pickerBtnText}>{formatearHora(cHoraDate)}</Text>
              </TouchableOpacity>
              {showPickerCHora && (
                <DateTimePicker
                  value={cHoraDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    setShowPickerCHora(Platform.OS === 'ios');
                    if (d) setCHoraDate(d);
                  }}
                />
              )}

              <Text style={styles.inputLabel}>Notas previas</Text>
              <TextInput style={styles.input} value={cNotas} onChangeText={setCNotas} placeholder="Ej: Llevar exámenes" placeholderTextColor="#555555" />

              <TouchableOpacity style={styles.btnGuardarModal} onPress={agregarCitaGrupo}>
                <Text style={styles.btnGuardarModalTexto}>Agendar Cita</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2ECE4' },
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tituloHeader: { fontSize: 25, fontWeight: '900', color: '#141414' },
  subHeader: { fontSize: 14, fontWeight: '700', color: '#2C221E' },

  btnNuevoPaciente: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C221E', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  btnNuevoPacienteTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },

  btnCampana: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2C221E',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeCampana: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#B71C1C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCampanaTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  sinGrupoCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 28, alignItems: 'center', marginTop: 24, borderWidth: 2, borderColor: '#2C221E' },
  sinGrupoTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414', marginTop: 12, textAlign: 'center' },
  sinGrupoSub: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  chip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22, marginRight: 8, borderWidth: 2, borderColor: '#2C221E' },
  chipActivo: { backgroundColor: '#2C221E' },
  chipTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  chipTextoActivo: { color: '#FFFFFF' },

  subTabsBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 2, borderColor: '#2C221E' },
  subTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabBtnActivo: { backgroundColor: '#2C221E' },
  subTabText: { fontSize: 14, fontWeight: 'bold', color: '#141414' },
  subTabTextActivo: { color: '#FFFFFF' },

  btnAccionAdmin: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 13, borderRadius: 14, marginBottom: 12 },
  btnAccionAdminText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },

  vacioTexto: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 30 },

  cardItem: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  cardItemVerde: { backgroundColor: '#E8F5E9', borderColor: '#1B5E20' },
  itemTitulo: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginBottom: 4 },
  itemLinea: { fontSize: 16, fontWeight: '600', color: '#141414', marginTop: 2 },
  itemNota: { fontSize: 15, color: '#333333', fontStyle: 'italic', marginTop: 4 },

  badgeTomaConfirmada: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C8E6C9', padding: 10, borderRadius: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#1B5E20' },
  badgeTomaConfirmadaTexto: { fontSize: 15, fontWeight: 'bold', color: '#1B5E20', marginLeft: 8, flex: 1 },

  btnMarcarTomado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  btnMarcarTomadoTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  obsBox: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#F57F17', borderRadius: 12, padding: 10, marginTop: 10 },
  obsTitulo: { fontSize: 14, fontWeight: 'bold', color: '#E65100', marginBottom: 2 },
  obsTexto: { fontSize: 15, color: '#141414', lineHeight: 21 },

  btnCitaAccion: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  btnCitaAccionText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  btnObsCita: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', paddingHorizontal: 14, borderRadius: 12 },
  btnObsCitaText: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginLeft: 6 },

  fichaCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#6E5D4F' },
  fichaNombre: { fontSize: 22, fontWeight: 'bold', color: '#141414' },
  fichaSub: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 12 },
  fichaLabel: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 12, marginBottom: 4 },
  fichaValor: { fontSize: 16, color: '#141414', backgroundColor: '#F2ECE4', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#6E5D4F', lineHeight: 22 },

  bitacoraCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#2C221E' },
  bitacoraPaciente: { fontSize: 16, fontWeight: 'bold', color: '#141414' },
  bitacoraDetalle: { fontSize: 15, fontWeight: '600', color: '#2C221E', marginTop: 2 },
  bitacoraResponsable: { fontSize: 14, fontWeight: 'bold', color: '#1B5E20', marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, maxHeight: '88%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  inputLabel: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12 },
  pickerBtnText: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 10 },
  btnGuardarModal: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  btnGuardarModalTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});