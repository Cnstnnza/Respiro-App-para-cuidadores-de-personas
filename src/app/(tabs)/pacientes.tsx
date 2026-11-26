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
import {
  programarNotificacionMedicamento,
  programarNotificacionCita,
  notificarMedicamentoGrupo,
} from '../../lib/notificaciones';

export default function PacientesUnificadoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [miNombre, setMiNombre] = useState('Cuidador');
  const [noLeidas, setNoLeidas] = useState(0);

  // Selector de Modo Principal: 'personales' | 'grupo'
  const [modoVista, setModoVista] = useState<'personales' | 'grupo'>('personales');

  // --- ESTADO PACIENTES PERSONALES ---
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [subTab, setSubTab] = useState<'ficha' | 'medicamentos' | 'citas'>('ficha');
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [citas, setCitas] = useState<any[]>([]);

  // Modales Personales
  const [modalNuevoPaciente, setModalNuevoPaciente] = useState(false);
  const [modalNuevoMedicamento, setModalNuevoMedicamento] = useState(false);
  const [modalNuevaCita, setModalNuevaCita] = useState(false);

  // Campos Paciente Personal
  const [formNombre, setFormNombre] = useState('');
  const [formEdad, setFormEdad] = useState('');
  const [formDiagnostico, setFormDiagnostico] = useState('');
  const [formAlergias, setFormAlergias] = useState('');
  const [formGrupoSanguineo, setFormGrupoSanguineo] = useState('');
  const [formContactoEmergencia, setFormContactoEmergencia] = useState('');
  const [formNivelDependencia, setFormNivelDependencia] = useState('');
  const [formMovilidad, setFormMovilidad] = useState('');
  const [formNotasCuidado, setFormNotasCuidado] = useState('');

  // Campos Medicamento Personal
  const [medNombre, setMedNombre] = useState('');
  const [medDosis, setMedDosis] = useState('');
  const [medHoraDate, setMedHoraDate] = useState(new Date());
  const [mostrarPickerMedHora, setMostrarPickerMedHora] = useState(false);
  const [medInstrucciones, setMedInstrucciones] = useState('');

  // Campos Cita Personal
  const [citaDoctor, setCitaDoctor] = useState('');
  const [citaLugar, setCitaLugar] = useState('');
  const [citaFechaDate, setCitaFechaDate] = useState(new Date());
  const [citaHoraDate, setCitaHoraDate] = useState(new Date());
  const [mostrarPickerCitaFecha, setMostrarPickerCitaFecha] = useState(false);
  const [mostrarPickerCitaHora, setMostrarPickerCitaHora] = useState(false);
  const [citaNotas, setCitaNotas] = useState('');

  // --- ESTADO GRUPO / ELEAM ---
  const [misGrupos, setMisGrupos] = useState<any[]>([]);
  const [grupoActivo, setGrupoActivo] = useState<any>(null);
  const [esAdminGrupo, setEsAdminGrupo] = useState(false);
  const [pacientesGrupo, setPacientesGrupo] = useState<any[]>([]);
  const [pacienteGrupoActivo, setPacienteGrupoActivo] = useState<any>(null);
  const [subTabGrupo, setSubTabGrupo] = useState<'medicamentos' | 'citas' | 'ficha' | 'bitacora'>('medicamentos');
  const [medsGrupo, setMedsGrupo] = useState<any[]>([]);
  const [citasGrupo, setCitasGrupo] = useState<any[]>([]);
  const [bitacoraGrupo, setBitacoraGrupo] = useState<any[]>([]);

  // Modales Grupo
  const [modalResidenteGrupo, setModalResidenteGrupo] = useState(false);
  const [modalMedGrupo, setModalMedGrupo] = useState(false);
  const [modalCitaGrupo, setModalCitaGrupo] = useState(false);
  const [modalObsCita, setModalObsCita] = useState(false);
  const [citaEditandoObs, setCitaEditandoObs] = useState<any>(null);
  const [textoObservacionCita, setTextoObservacionCita] = useState('');

  // Campos Residente Grupo
  const [pNombre, setPNombre] = useState('');
  const [pEdad, setPEdad] = useState('');
  const [pGrupoSangre, setPGrupoSangre] = useState('');
  const [pDiagnostico, setPDiagnostico] = useState('');
  const [pAlergias, setPAlergias] = useState('');
  const [pMovilidad, setPMovilidad] = useState('');
  const [pNotas, setPNotas] = useState('');

  // Campos Medicamento Grupo
  const [mNombre, setMNombre] = useState('');
  const [mDosis, setMDosis] = useState('');
  const [mHoraDate, setMHoraDate] = useState(new Date());
  const [showPickerMedGrupo, setShowPickerMedGrupo] = useState(false);
  const [mNotas, setMNotas] = useState('');

  // Campos Cita Grupo
  const [cDoctor, setCDoctor] = useState('');
  const [cLugar, setCLugar] = useState('');
  const [cFechaDate, setCFechaDate] = useState(new Date());
  const [cHoraDate, setCHoraDate] = useState(new Date());
  const [showPickerCFechaGrupo, setShowPickerCFechaGrupo] = useState(false);
  const [showPickerCHoraGrupo, setShowPickerCHoraGrupo] = useState(false);
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

  const formatearFechaISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

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
      let isMounted = true;
      const cargarTodo = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;
        setCurrentUser(user);

        await contarNoLeidas(user.id);

        const { data: perfil } = await supabase
          .from('cuidadores')
          .select('nombre')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          setMiNombre(perfil?.nombre || user.email?.split('@')[0] || 'Cuidador');
        }

        // 1. Cargar Pacientes Personales (grupo_id IS NULL)
        const { data: listaPacientes } = await supabase
          .from('pacientes')
          .select('*')
          .eq('cuidador_id', user.id)
          .is('grupo_id', null)
          .order('created_at', { ascending: false });

        if (listaPacientes && listaPacientes.length > 0 && isMounted) {
          setPacientes(listaPacientes);
          const actual = pacienteSeleccionado
            ? listaPacientes.find((p) => p.id === pacienteSeleccionado.id) || listaPacientes[0]
            : listaPacientes[0];
          setPacienteSeleccionado(actual);
          await cargarDetallesPacientePersonal(actual.id);
        } else if (isMounted) {
          setPacientes([]);
          setPacienteSeleccionado(null);
        }

        // 2. Cargar Grupos del Cuidador
        const { data: membresias } = await supabase
          .from('grupo_miembros')
          .select('grupo_id, rol, grupos(id, nombre, descripcion)')
          .eq('cuidador_id', user.id);

        if (membresias && membresias.length > 0 && isMounted) {
          const listaGrupos = membresias
            .filter((m: any) => m.grupos)
            .map((m: any) => ({
              id: m.grupos.id,
              nombre: m.grupos.nombre,
              descripcion: m.grupos.descripcion,
              rol: m.rol,
            }));

          setMisGrupos(listaGrupos);
          if (listaGrupos.length > 0) {
            const gSel = grupoActivo
              ? listaGrupos.find((g) => g.id === grupoActivo.id) || listaGrupos[0]
              : listaGrupos[0];
            await seleccionarGrupo(gSel);
          }
        } else if (isMounted) {
          setMisGrupos([]);
          setGrupoActivo(null);
        }

        if (isMounted) setLoading(false);
      };

      cargarTodo();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // ==========================================
  // LÓGICA PACIENTES PERSONALES
  // ==========================================
  const cargarDetallesPacientePersonal = async (pacienteId: string) => {
    const { data: meds } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: true });
    setMedicamentos(meds || []);

    const { data: appointments } = await supabase
      .from('citas_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    setCitas(appointments || []);
  };

  const guardarPacientePersonal = async () => {
    if (!formNombre.trim()) {
      Alert.alert('Atención', 'Debes ingresar el nombre del paciente.');
      return;
    }

    const { data: cuidadorExistente } = await supabase
      .from('cuidadores')
      .select('id')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (!cuidadorExistente) {
      await supabase.from('cuidadores').insert([
        {
          id: currentUser.id,
          nombre: miNombre,
          email: currentUser.email,
          biografia: '',
          verificado: false,
        },
      ]);
    }

    const payload: any = {
      cuidador_id: currentUser.id,
      grupo_id: null,
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
      setPacientes((prev) => [data, ...prev]);
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
      await cargarDetallesPacientePersonal(data.id);
    }
  };

  const eliminarPacientePersonal = (id: string) => {
    Alert.alert('Eliminar Ficha', '¿Deseas eliminar a este paciente y todos sus registros?', [
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
              await cargarDetallesPacientePersonal(actualizados[0].id);
            } else {
              setPacienteSeleccionado(null);
              setMedicamentos([]);
              setCitas([]);
            }
          }
        },
      },
    ]);
  };

  const guardarMedicamentoPersonal = async () => {
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

    if (medInstrucciones.trim()) payloadMed.contraindicaciones = medInstrucciones.trim();

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([payloadMed])
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await programarNotificacionMedicamento(
        pacienteSeleccionado.nombre,
        medNombre.trim(),
        medDosis.trim(),
        medHoraDate
      );
      setMedicamentos((prev) => [...prev, data]);
      setModalNuevoMedicamento(false);
      setMedNombre('');
      setMedDosis('');
      setMedInstrucciones('');
      setMedHoraDate(new Date());
      Alert.alert('Recordatorio activo', 'Te avisaremos todos los días a esta hora.');
    }
  };

  const toggleTomadoPersonal = async (med: any) => {
    const nuevoEstado = !med.tomado_hoy;
    setMedicamentos((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, tomado_hoy: nuevoEstado } : m))
    );
    await supabase.from('medicamentos').update({ tomado_hoy: nuevoEstado }).eq('id', med.id);
  };

  const eliminarMedicamentoPersonal = async (id: string) => {
    await supabase.from('medicamentos').delete().eq('id', id);
    setMedicamentos((prev) => prev.filter((m) => m.id !== id));
  };

  const guardarCitaPersonal = async () => {
    if (!citaDoctor.trim() || !citaLugar.trim()) {
      Alert.alert('Atención', 'Completa el especialista y el centro de salud.');
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
    if (citaNotas.trim()) payloadCita.notas = citaNotas.trim();

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([payloadCita])
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await programarNotificacionCita(
        pacienteSeleccionado.nombre,
        citaDoctor.trim(),
        citaLugar.trim(),
        citaFechaDate,
        citaHoraDate
      );
      setCitas((prev) => [...prev, data]);
      setModalNuevaCita(false);
      setCitaDoctor('');
      setCitaLugar('');
      setCitaNotas('');
      setCitaFechaDate(new Date());
      setCitaHoraDate(new Date());
      Alert.alert('Cita agendada', 'Recibirás alerta 1 día antes y 1 hora antes.');
    }
  };

  const toggleCitaPersonal = async (cita: any) => {
    const nuevoEstado = !cita.realizada;
    setCitas((prev) =>
      prev.map((c) => (c.id === cita.id ? { ...c, realizada: nuevoEstado } : c))
    );
    await supabase.from('citas_medicas').update({ realizada: nuevoEstado }).eq('id', cita.id);
  };

  const eliminarCitaPersonal = async (id: string) => {
    await supabase.from('citas_medicas').delete().eq('id', id);
    setCitas((prev) => prev.filter((c) => c.id !== id));
  };

  // ==========================================
  // LÓGICA GRUPO / ELEAM
  // ==========================================
  const seleccionarGrupo = async (grupo: any) => {
    setGrupoActivo(grupo);
    const admin = grupo.rol === 'admin_grupo';
    setEsAdminGrupo(admin);
    if (!admin && subTabGrupo === 'bitacora') {
      setSubTabGrupo('medicamentos');
    }

    const { data: pacs } = await supabase
      .from('pacientes')
      .select('*')
      .eq('grupo_id', grupo.id)
      .order('nombre', { ascending: true });

    if (pacs && pacs.length > 0) {
      setPacientesGrupo(pacs);
      setPacienteGrupoActivo(pacs[0]);
      await cargarDatosPacienteGrupo(pacs[0].id, grupo.id);
    } else {
      setPacientesGrupo([]);
      setPacienteGrupoActivo(null);
      setMedsGrupo([]);
      setCitasGrupo([]);
    }

    if (admin) {
      await cargarBitacoraGrupo(grupo.id);
    }
  };

  const cargarDatosPacienteGrupo = async (pacienteId: string, grupoId: string) => {
    const hoy = obtenerFechaHoyISO();

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
    setMedsGrupo(medsActualizados);

    const { data: appointments } = await supabase
      .from('citas_medicas')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    setCitasGrupo(appointments || []);

    await cargarBitacoraGrupo(grupoId);
  };

  const cargarBitacoraGrupo = async (grupoId: string) => {
    const { data } = await supabase
      .from('historial_medicaciones')
      .select('*')
      .eq('grupo_id', grupoId)
      .order('created_at', { ascending: false })
      .limit(50);

    setBitacoraGrupo(data || []);
  };

  const crearResidenteGrupo = async () => {
    if (!pNombre.trim()) {
      Alert.alert('Atención', 'Ingresa el nombre del residente.');
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
      Alert.alert('Error', error.message);
    } else if (data) {
      setPacientesGrupo((prev) => [...prev, data]);
      setPacienteGrupoActivo(data);
      setModalResidenteGrupo(false);
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

  const agregarMedGrupo = async () => {
    if (!mNombre.trim() || !mDosis.trim()) {
      Alert.alert('Atención', 'Ingresa fármaco y dosis.');
      return;
    }

    const { data, error } = await supabase
      .from('medicamentos')
      .insert([
        {
          paciente_id: pacienteGrupoActivo.id,
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
      setMedsGrupo((prev) => [...prev, data]);
      setModalMedGrupo(false);
      setMNombre('');
      setMDosis('');
      setMNotas('');
    }
  };

  const agregarCitaGrupo = async () => {
    if (!cDoctor.trim() || !cLugar.trim()) {
      Alert.alert('Atención', 'Ingresa especialista y lugar.');
      return;
    }

    const { data, error } = await supabase
      .from('citas_medicas')
      .insert([
        {
          paciente_id: pacienteGrupoActivo.id,
          especialidad_doctor: cDoctor.trim(),
          lugar: cLugar.trim(),
          fecha: formatearFechaISO(cFechaDate),
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
      setCitasGrupo((prev) => [...prev, data]);
      setModalCitaGrupo(false);
      setCDoctor('');
      setCLugar('');
      setCNotas('');
    }
  };

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
      Alert.alert('Error', error.message);
      return;
    }

    await supabase.from('historial_medicaciones').insert([
      {
        grupo_id: grupoActivo.id,
        paciente_id: pacienteGrupoActivo.id,
        paciente_nombre: pacienteGrupoActivo.nombre,
        medicamento_id: med.id,
        medicamento_nombre: med.nombre,
        dosis: med.dosis,
        administrado_por_id: currentUser.id,
        administrado_por_nombre: miNombre,
        fecha: hoy,
        hora: horaActual,
      },
    ]);

    setMedsGrupo((prev) =>
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
      pacienteNombre: pacienteGrupoActivo.nombre,
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
      setCitasGrupo((prev) =>
        prev.map((c) =>
          c.id === cita.id
            ? { ...c, realizada: nuevoEstado, actualizado_por_nombre: miNombre }
            : c
        )
      );
    }
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

    if (!error) {
      setCitasGrupo((prev) =>
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

  return (
    <View style={styles.container}>
      {/* ENCABEZADO SUPERIOR + CAMPANITA */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tituloHeader}>Gestión de Cuidados</Text>
          <Text style={styles.subHeader}>
            {modoVista === 'personales'
              ? 'Fichas personales y recordatorios'
              : grupoActivo
              ? `${grupoActivo.nombre} (${esAdminGrupo ? 'Admin Grupo' : 'Equipo'})`
              : 'Residentes compartidos ELEAM'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {modoVista === 'personales' && (
            <TouchableOpacity
              style={styles.btnCrearPaciente}
              onPress={() => setModalNuevoPaciente(true)}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.btnCrearPacienteTexto}>Nuevo</Text>
            </TouchableOpacity>
          )}

          {modoVista === 'grupo' && grupoActivo && esAdminGrupo && (
            <TouchableOpacity
              style={styles.btnCrearPaciente}
              onPress={() => setModalResidenteGrupo(true)}
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
              <Text style={styles.btnCrearPacienteTexto}>Residente</Text>
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

      {/* INTERRUPTOR PRINCIPAL: MIS PACIENTES vs MI GRUPO */}
      <View style={styles.modoSwitchBar}>
        <TouchableOpacity
          style={[styles.modoBtn, modoVista === 'personales' && styles.modoBtnActivo]}
          onPress={() => setModoVista('personales')}
        >
          <Ionicons
            name="heart"
            size={18}
            color={modoVista === 'personales' ? '#FFFFFF' : '#141414'}
          />
          <Text style={[styles.modoBtnText, modoVista === 'personales' && styles.modoBtnTextActivo]}>
            Mis Pacientes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modoBtn, modoVista === 'grupo' && styles.modoBtnActivo]}
          onPress={() => setModoVista('grupo')}
        >
          <Ionicons
            name="people"
            size={18}
            color={modoVista === 'grupo' ? '#FFFFFF' : '#141414'}
          />
          <Text style={[styles.modoBtnText, modoVista === 'grupo' && styles.modoBtnTextActivo]}>
            Mi Grupo {misGrupos.length > 0 ? `(${misGrupos.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : modoVista === 'personales' ? (
        /* =========================================================
           SECCIÓN A: MIS PACIENTES PERSONALES
        ========================================================= */
        pacientes.length === 0 ? (
          <View style={styles.sinPacientesCard}>
            <Ionicons name="heart-circle-outline" size={64} color="#2C221E" />
            <Text style={styles.sinPacientesTitulo}>No tienes pacientes personales</Text>
            <Text style={styles.sinPacientesSub}>
              Registra aquí a tu familiar o paciente particular para controlar sus remedios y horas médicas.
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
                      cargarDetallesPacientePersonal(p.id);
                    }}
                  >
                    <Text style={[styles.pacienteChipTexto, seleccionado && styles.pacienteChipTextoActivo]}>
                      {p.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.tabsSelector}>
              <TouchableOpacity
                style={[styles.tabBoton, subTab === 'ficha' && styles.tabBotonActivo]}
                onPress={() => setSubTab('ficha')}
              >
                <Text style={[styles.tabBotonTexto, subTab === 'ficha' && styles.tabBotonTextoActivo]}>
                  Ficha
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBoton, subTab === 'medicamentos' && styles.tabBotonActivo]}
                onPress={() => setSubTab('medicamentos')}
              >
                <Text style={[styles.tabBotonTexto, subTab === 'medicamentos' && styles.tabBotonTextoActivo]}>
                  Remedios
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBoton, subTab === 'citas' && styles.tabBotonActivo]}
                onPress={() => setSubTab('citas')}
              >
                <Text style={[styles.tabBotonTexto, subTab === 'citas' && styles.tabBotonTextoActivo]}>
                  Citas
                </Text>
              </TouchableOpacity>
            </View>

            {subTab === 'ficha' && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={styles.fichaCard}>
                  <View style={styles.fichaHeaderFila}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={styles.fichaAvatar}>
                        <Text style={styles.fichaAvatarLetra}>
                          {pacienteSeleccionado?.nombre?.charAt(0).toUpperCase() || 'P'}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.fichaNombre}>{pacienteSeleccionado?.nombre}</Text>
                        <Text style={styles.fichaEdad}>
                          {pacienteSeleccionado?.edad ? `${pacienteSeleccionado.edad} años` : 'Edad no informada'}
                          {pacienteSeleccionado?.grupo_sanguineo ? ` • Grupo ${pacienteSeleccionado.grupo_sanguineo}` : ''}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => eliminarPacientePersonal(pacienteSeleccionado.id)}>
                      <Ionicons name="trash" size={24} color="#B71C1C" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.campoEtiqueta}>Diagnóstico Principal</Text>
                  <Text style={styles.campoValor}>
                    {pacienteSeleccionado?.diagnostico || 'Sin diagnóstico registrado.'}
                  </Text>

                  <Text style={[styles.campoEtiqueta, { color: '#B71C1C', marginTop: 12 }]}>
                    Alergias y Contraindicaciones
                  </Text>
                  <Text style={[styles.campoValor, { borderColor: '#B71C1C', backgroundColor: '#FFF5F5' }]}>
                    {pacienteSeleccionado?.alergias || 'Sin alergias conocidas.'}
                  </Text>

                  {pacienteSeleccionado?.contacto_emergencia && (
                    <>
                      <Text style={[styles.campoEtiqueta, { color: '#1B5E20', marginTop: 12 }]}>
                        Contacto de Emergencia
                      </Text>
                      <Text style={styles.campoValor}>{pacienteSeleccionado.contacto_emergencia}</Text>
                    </>
                  )}

                  <Text style={[styles.campoEtiqueta, { marginTop: 12 }]}>Notas de Cuidado</Text>
                  <Text style={styles.campoValor}>
                    {pacienteSeleccionado?.notas_cuidado || 'Sin instrucciones adicionales.'}
                  </Text>
                </View>
              </ScrollView>
            )}

            {subTab === 'medicamentos' && (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.btnAgregarAccion}
                  onPress={() => setModalNuevoMedicamento(true)}
                >
                  <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.btnAgregarAccionTexto}>Agregar Medicamento</Text>
                </TouchableOpacity>

                <FlatList
                  data={medicamentos}
                  keyExtractor={(item) => String(item.id)}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.vacioTexto}>No hay medicamentos registrados.</Text>}
                  renderItem={({ item }) => (
                    <View style={[styles.itemCard, item.tomado_hoy && styles.itemCardTomado]}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
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
                        <TouchableOpacity onPress={() => eliminarMedicamentoPersonal(item.id)}>
                          <Ionicons name="trash" size={22} color="#B71C1C" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnEstado, item.tomado_hoy ? styles.btnEstadoTomado : styles.btnEstadoPendiente]}
                          onPress={() => toggleTomadoPersonal(item)}
                        >
                          <Text style={[styles.btnEstadoTexto, item.tomado_hoy && { color: '#FFFFFF' }]}>
                            {item.tomado_hoy ? 'Tomado ✓' : 'Pendiente'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}

            {subTab === 'citas' && (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.btnAgregarAccion}
                  onPress={() => setModalNuevaCita(true)}
                >
                  <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.btnAgregarAccionTexto}>Agendar Hora Médica</Text>
                </TouchableOpacity>

                <FlatList
                  data={citas}
                  keyExtractor={(item) => String(item.id)}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={styles.vacioTexto}>No hay citas médicas registradas.</Text>}
                  renderItem={({ item }) => (
                    <View style={[styles.itemCard, item.realizada && styles.itemCardTomado]}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[styles.itemNombre, item.realizada && styles.itemNombreTomado]}>
                          {item.especialidad_doctor}
                        </Text>
                        <Text style={styles.itemSubtexto}>🏥 Lugar: {item.lugar}</Text>
                        <Text style={styles.itemSubtexto}>📅 {item.fecha} • ⏰ {item.hora}</Text>
                        {item.notas ? <Text style={styles.itemNotaExtra}>Nota: {item.notas}</Text> : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <TouchableOpacity onPress={() => eliminarCitaPersonal(item.id)}>
                          <Ionicons name="trash" size={22} color="#B71C1C" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnEstado, item.realizada ? styles.btnEstadoTomado : styles.btnEstadoPendiente]}
                          onPress={() => toggleCitaPersonal(item)}
                        >
                          <Text style={[styles.btnEstadoTexto, item.realizada && { color: '#FFFFFF' }]}>
                            {item.realizada ? 'Asistió ✓' : 'Pendiente'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        )
      ) : (
        /* =========================================================
           SECCIÓN B: MI GRUPO / ELEAM
        ========================================================= */
        misGrupos.length === 0 ? (
          <View style={styles.sinPacientesCard}>
            <Ionicons name="people-circle-outline" size={68} color="#2C221E" />
            <Text style={styles.sinPacientesTitulo}>Aún no perteneces a un grupo</Text>
            <Text style={styles.sinPacientesSub}>
              Cuando la administración de RESPIRO te asigne a un equipo o residencia, aquí verás los residentes compartidos, horarios de remedios y alertas del turno.
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {misGrupos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pacientesCarousel}>
                {misGrupos.map((g) => {
                  const act = grupoActivo?.id === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.pacienteChip, act && styles.pacienteChipActivo]}
                      onPress={() => seleccionarGrupo(g)}
                    >
                      <Text style={[styles.pacienteChipTexto, act && styles.pacienteChipTextoActivo]}>
                        {g.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {pacientesGrupo.length === 0 ? (
              <View style={styles.sinPacientesCard}>
                <Text style={styles.sinPacientesTitulo}>Sin residentes en este grupo</Text>
                <Text style={styles.sinPacientesSub}>
                  {esAdminGrupo
                    ? 'Presiona "+ Residente" arriba para crear la primera ficha compartida.'
                    : 'El encargado de tu grupo aún no ha registrado residentes.'}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pacientesCarousel}>
                  {pacientesGrupo.map((p) => {
                    const sel = pacienteGrupoActivo?.id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.pacienteChip, sel && styles.pacienteChipActivo]}
                        onPress={() => {
                          setPacienteGrupoActivo(p);
                          cargarDatosPacienteGrupo(p.id, grupoActivo.id);
                        }}
                      >
                        <Text style={[styles.pacienteChipTexto, sel && styles.pacienteChipTextoActivo]}>
                          {p.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.tabsSelector}>
                  <TouchableOpacity
                    style={[styles.tabBoton, subTabGrupo === 'medicamentos' && styles.tabBotonActivo]}
                    onPress={() => setSubTabGrupo('medicamentos')}
                  >
                    <Text style={[styles.tabBotonTexto, subTabGrupo === 'medicamentos' && styles.tabBotonTextoActivo]}>
                      Remedios
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBoton, subTabGrupo === 'citas' && styles.tabBotonActivo]}
                    onPress={() => setSubTabGrupo('citas')}
                  >
                    <Text style={[styles.tabBotonTexto, subTabGrupo === 'citas' && styles.tabBotonTextoActivo]}>
                      Citas
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabBoton, subTabGrupo === 'ficha' && styles.tabBotonActivo]}
                    onPress={() => setSubTabGrupo('ficha')}
                  >
                    <Text style={[styles.tabBotonTexto, subTabGrupo === 'ficha' && styles.tabBotonTextoActivo]}>
                      Ficha
                    </Text>
                  </TouchableOpacity>

                  {esAdminGrupo && (
                    <TouchableOpacity
                      style={[styles.tabBoton, subTabGrupo === 'bitacora' && styles.tabBotonActivo]}
                      onPress={() => setSubTabGrupo('bitacora')}
                    >
                      <Text style={[styles.tabBotonTexto, subTabGrupo === 'bitacora' && styles.tabBotonTextoActivo]}>
                        Bitácora
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {subTabGrupo === 'medicamentos' && (
                  <View style={{ flex: 1 }}>
                    {esAdminGrupo && (
                      <TouchableOpacity
                        style={styles.btnAgregarAccion}
                        onPress={() => setModalMedGrupo(true)}
                      >
                        <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                        <Text style={styles.btnAgregarAccionTexto}>Agregar Medicamento al Residente</Text>
                      </TouchableOpacity>
                    )}

                    <FlatList
                      data={medsGrupo}
                      keyExtractor={(item) => String(item.id)}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={<Text style={styles.vacioTexto}>No hay medicamentos registrados.</Text>}
                      renderItem={({ item }) => (
                        <View style={[styles.itemCard, item.tomado_hoy && styles.itemCardTomado]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemNombre}>{item.nombre}</Text>
                            <Text style={styles.itemSubtexto}>💊 Dosis: {item.dosis}</Text>
                            <Text style={styles.itemSubtexto}>⏰ Horario: {item.horario}</Text>
                            {item.contraindicaciones ? (
                              <Text style={styles.itemNotaExtra}>Nota: {item.contraindicaciones}</Text>
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

                {subTabGrupo === 'citas' && (
                  <View style={{ flex: 1 }}>
                    {esAdminGrupo && (
                      <TouchableOpacity
                        style={styles.btnAgregarAccion}
                        onPress={() => setModalCitaGrupo(true)}
                      >
                        <Ionicons name="calendar" size={22} color="#FFFFFF" />
                        <Text style={styles.btnAgregarAccionTexto}>Agendar Hora Médica</Text>
                      </TouchableOpacity>
                    )}

                    <FlatList
                      data={citasGrupo}
                      keyExtractor={(item) => String(item.id)}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={<Text style={styles.vacioTexto}>No hay citas médicas agendadas.</Text>}
                      renderItem={({ item }) => (
                        <View style={[styles.itemCard, item.realizada && styles.itemCardTomado]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemNombre}>{item.especialidad_doctor}</Text>
                            <Text style={styles.itemSubtexto}>🏥 Lugar: {item.lugar}</Text>
                            <Text style={styles.itemSubtexto}>📅 {item.fecha} • ⏰ {item.hora}</Text>

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
                                onPress={() => {
                                  setCitaEditandoObs(item);
                                  setTextoObservacionCita(item.observaciones_post_cita || '');
                                  setModalObsCita(true);
                                }}
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

                {subTabGrupo === 'ficha' && pacienteGrupoActivo && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.fichaCard}>
                      <Text style={styles.fichaNombre}>{pacienteGrupoActivo.nombre}</Text>
                      <Text style={styles.fichaEdad}>
                        {pacienteGrupoActivo.edad ? `${pacienteGrupoActivo.edad} años` : 'Edad no registrada'}
                        {pacienteGrupoActivo.grupo_sanguineo ? ` • Grupo ${pacienteGrupoActivo.grupo_sanguineo}` : ''}
                      </Text>

                      <Text style={[styles.campoEtiqueta, { marginTop: 12 }]}>Diagnóstico Principal</Text>
                      <Text style={styles.campoValor}>
                        {pacienteGrupoActivo.diagnostico || 'Sin diagnóstico registrado.'}
                      </Text>

                      <Text style={[styles.campoEtiqueta, { color: '#B71C1C', marginTop: 12 }]}>Alergias</Text>
                      <Text style={[styles.campoValor, { borderColor: '#B71C1C', backgroundColor: '#FFF5F5' }]}>
                        {pacienteGrupoActivo.alergias || 'Sin alergias conocidas.'}
                      </Text>

                      <Text style={[styles.campoEtiqueta, { marginTop: 12 }]}>Movilidad y Cuidados</Text>
                      <Text style={styles.campoValor}>
                        {`Movilidad: ${pacienteGrupoActivo.movilidad || 'Normal'}\n${pacienteGrupoActivo.notas_cuidado || ''}`}
                      </Text>
                    </View>
                  </ScrollView>
                )}

                {subTabGrupo === 'bitacora' && esAdminGrupo && (
                  <FlatList
                    data={bitacoraGrupo}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.vacioTexto}>Aún no hay registros.</Text>}
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
        )
      )}

      {/* =========================================================
         MODALES PERSONALES Y DE GRUPO
      ========================================================= */}
      <Modal visible={modalNuevoPaciente} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Nueva Ficha Personal</Text>
              <TouchableOpacity onPress={() => setModalNuevoPaciente(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Nombre completo *</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Rosa Gómez" placeholderTextColor="#555555" value={formNombre} onChangeText={setFormNombre} />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputEtiqueta}>Edad</Text>
                  <TextInput style={styles.inputControl} placeholder="78" placeholderTextColor="#555555" keyboardType="numeric" value={formEdad} onChangeText={setFormEdad} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputEtiqueta}>Grupo Sanguíneo</Text>
                  <TextInput style={styles.inputControl} placeholder="O+" placeholderTextColor="#555555" value={formGrupoSanguineo} onChangeText={setFormGrupoSanguineo} />
                </View>
              </View>

              <Text style={styles.inputEtiqueta}>Diagnóstico Principal</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Hipertensión" placeholderTextColor="#555555" value={formDiagnostico} onChangeText={setFormDiagnostico} />

              <Text style={styles.inputEtiqueta}>Alergias</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Penicilina" placeholderTextColor="#555555" value={formAlergias} onChangeText={setFormAlergias} />

              <Text style={styles.inputEtiqueta}>Contacto de Emergencia</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Hijo Carlos +56912345678" placeholderTextColor="#555555" value={formContactoEmergencia} onChangeText={setFormContactoEmergencia} />

              <Text style={styles.inputEtiqueta}>Notas de Cuidado</Text>
              <TextInput style={[styles.inputControl, { minHeight: 70 }]} multiline placeholder="Rutinas o cuidados..." placeholderTextColor="#555555" value={formNotasCuidado} onChangeText={setFormNotasCuidado} />

              <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarPacientePersonal}>
                <Text style={styles.btnConfirmarModalTexto}>Crear Ficha</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalNuevoMedicamento} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Nuevo Medicamento</Text>
              <TouchableOpacity onPress={() => setModalNuevoMedicamento(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputEtiqueta}>Fármaco *</Text>
            <TextInput style={styles.inputControl} placeholder="Ej: Paracetamol" placeholderTextColor="#555555" value={medNombre} onChangeText={setMedNombre} />
            <Text style={styles.inputEtiqueta}>Dosis *</Text>
            <TextInput style={styles.inputControl} placeholder="Ej: 500 mg" placeholderTextColor="#555555" value={medDosis} onChangeText={setMedDosis} />
            <Text style={styles.inputEtiqueta}>Horario de Toma</Text>
            <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setMostrarPickerMedHora(true)}>
              <Ionicons name="time" size={22} color="#141414" />
              <Text style={styles.btnSelectorPickerTexto}>{formatearHora(medHoraDate)}</Text>
            </TouchableOpacity>
            {mostrarPickerMedHora && (
              <DateTimePicker
                value={medHoraDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => {
                  setMostrarPickerMedHora(Platform.OS === 'ios');
                  if (d) setMedHoraDate(d);
                }}
              />
            )}
            <Text style={styles.inputEtiqueta}>Instrucciones</Text>
            <TextInput style={styles.inputControl} placeholder="Ej: Con desayuno" placeholderTextColor="#555555" value={medInstrucciones} onChangeText={setMedInstrucciones} />
            <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarMedicamentoPersonal}>
              <Text style={styles.btnConfirmarModalTexto}>Guardar y Activar Alarma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalNuevaCita} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Agendar Cita Médica</Text>
              <TouchableOpacity onPress={() => setModalNuevaCita(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Especialista *</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Cardiología" placeholderTextColor="#555555" value={citaDoctor} onChangeText={setCitaDoctor} />
              <Text style={styles.inputEtiqueta}>Lugar *</Text>
              <TextInput style={styles.inputControl} placeholder="Ej: Hospital Clínico" placeholderTextColor="#555555" value={citaLugar} onChangeText={setCitaLugar} />
              <Text style={styles.inputEtiqueta}>Fecha</Text>
              <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setMostrarPickerCitaFecha(true)}>
                <Ionicons name="calendar" size={22} color="#141414" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearFechaHumana(citaFechaDate)}</Text>
              </TouchableOpacity>
              {mostrarPickerCitaFecha && (
                <DateTimePicker
                  value={citaFechaDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e, d) => {
                    setMostrarPickerCitaFecha(Platform.OS === 'ios');
                    if (d) setCitaFechaDate(d);
                  }}
                />
              )}
              <Text style={styles.inputEtiqueta}>Hora</Text>
              <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setMostrarPickerCitaHora(true)}>
                <Ionicons name="time" size={22} color="#141414" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearHora(citaHoraDate)}</Text>
              </TouchableOpacity>
              {mostrarPickerCitaHora && (
                <DateTimePicker
                  value={citaHoraDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    setMostrarPickerCitaHora(Platform.OS === 'ios');
                    if (d) setCitaHoraDate(d);
                  }}
                />
              )}
              <Text style={styles.inputEtiqueta}>Notas</Text>
              <TextInput style={styles.inputControl} placeholder="Indicaciones..." placeholderTextColor="#555555" value={citaNotas} onChangeText={setCitaNotas} />
              <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarCitaPersonal}>
                <Text style={styles.btnConfirmarModalTexto}>Agendar Cita</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODALES GRUPO */}
      <Modal visible={modalResidenteGrupo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Nuevo Residente en Grupo</Text>
              <TouchableOpacity onPress={() => setModalResidenteGrupo(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Nombre completo *</Text>
              <TextInput style={styles.inputControl} value={pNombre} onChangeText={setPNombre} placeholder="Ej: Señora Sara" placeholderTextColor="#555555" />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputEtiqueta}>Edad</Text>
                  <TextInput style={styles.inputControl} value={pEdad} onChangeText={setPEdad} keyboardType="numeric" placeholder="82" placeholderTextColor="#555555" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputEtiqueta}>Grupo Sangre</Text>
                  <TextInput style={styles.inputControl} value={pGrupoSangre} onChangeText={setPGrupoSangre} placeholder="O+" placeholderTextColor="#555555" />
                </View>
              </View>
              <Text style={styles.inputEtiqueta}>Diagnóstico</Text>
              <TextInput style={styles.inputControl} value={pDiagnostico} onChangeText={setPDiagnostico} placeholder="Diagnóstico..." placeholderTextColor="#555555" />
              <Text style={styles.inputEtiqueta}>Alergias</Text>
              <TextInput style={styles.inputControl} value={pAlergias} onChangeText={setPAlergias} placeholder="Alergias..." placeholderTextColor="#555555" />
              <Text style={styles.inputEtiqueta}>Movilidad</Text>
              <TextInput style={styles.inputControl} value={pMovilidad} onChangeText={setPMovilidad} placeholder="Ej: Andador" placeholderTextColor="#555555" />
              <Text style={styles.inputEtiqueta}>Notas de cuidado</Text>
              <TextInput style={[styles.inputControl, { minHeight: 70 }]} multiline value={pNotas} onChangeText={setPNotas} placeholder="Notas..." placeholderTextColor="#555555" />
              <TouchableOpacity style={styles.btnConfirmarModal} onPress={crearResidenteGrupo}>
                <Text style={styles.btnConfirmarModalTexto}>Guardar Residente</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalMedGrupo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Medicamento del Residente</Text>
              <TouchableOpacity onPress={() => setModalMedGrupo(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputEtiqueta}>Fármaco *</Text>
            <TextInput style={styles.inputControl} value={mNombre} onChangeText={setMNombre} placeholder="Ej: Losartán" placeholderTextColor="#555555" />
            <Text style={styles.inputEtiqueta}>Dosis *</Text>
            <TextInput style={styles.inputControl} value={mDosis} onChangeText={setMDosis} placeholder="Ej: 50 mg" placeholderTextColor="#555555" />
            <Text style={styles.inputEtiqueta}>Horario</Text>
            <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setShowPickerMedGrupo(true)}>
              <Ionicons name="time" size={20} color="#141414" />
              <Text style={styles.btnSelectorPickerTexto}>{formatearHora(mHoraDate)}</Text>
            </TouchableOpacity>
            {showPickerMedGrupo && (
              <DateTimePicker
                value={mHoraDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e, d) => {
                  setShowPickerMedGrupo(Platform.OS === 'ios');
                  if (d) setMHoraDate(d);
                }}
              />
            )}
            <Text style={styles.inputEtiqueta}>Indicaciones</Text>
            <TextInput style={styles.inputControl} value={mNotas} onChangeText={setMNotas} placeholder="Ej: Con desayuno" placeholderTextColor="#555555" />
            <TouchableOpacity style={styles.btnConfirmarModal} onPress={agregarMedGrupo}>
              <Text style={styles.btnConfirmarModalTexto}>Guardar Medicamento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalCitaGrupo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Agendar Cita del Residente</Text>
              <TouchableOpacity onPress={() => setModalCitaGrupo(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputEtiqueta}>Especialista *</Text>
              <TextInput style={styles.inputControl} value={cDoctor} onChangeText={setCDoctor} placeholder="Ej: Geriatra" placeholderTextColor="#555555" />
              <Text style={styles.inputEtiqueta}>Lugar *</Text>
              <TextInput style={styles.inputControl} value={cLugar} onChangeText={setCLugar} placeholder="Ej: Hospital" placeholderTextColor="#555555" />
              <Text style={styles.inputEtiqueta}>Fecha</Text>
              <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setShowPickerCFechaGrupo(true)}>
                <Ionicons name="calendar" size={20} color="#141414" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearFechaHumana(cFechaDate)}</Text>
              </TouchableOpacity>
              {showPickerCFechaGrupo && (
                <DateTimePicker
                  value={cFechaDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                  onChange={(_e, d) => {
                    setShowPickerCFechaGrupo(Platform.OS === 'ios');
                    if (d) setCFechaDate(d);
                  }}
                />
              )}
              <Text style={styles.inputEtiqueta}>Hora</Text>
              <TouchableOpacity style={styles.btnSelectorPicker} onPress={() => setShowPickerCHoraGrupo(true)}>
                <Ionicons name="time" size={20} color="#141414" />
                <Text style={styles.btnSelectorPickerTexto}>{formatearHora(cHoraDate)}</Text>
              </TouchableOpacity>
              {showPickerCHoraGrupo && (
                <DateTimePicker
                  value={cHoraDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    setShowPickerCHoraGrupo(Platform.OS === 'ios');
                    if (d) setCHoraDate(d);
                  }}
                />
              )}
              <Text style={styles.inputEtiqueta}>Notas</Text>
              <TextInput style={styles.inputControl} value={cNotas} onChangeText={setCNotas} placeholder="Notas..." placeholderTextColor="#555555" />
              <TouchableOpacity style={styles.btnConfirmarModal} onPress={agregarCitaGrupo}>
                <Text style={styles.btnConfirmarModalTexto}>Agendar Cita</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalObsCita} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitulo}>Observación Post-Cita</Text>
              <TouchableOpacity onPress={() => setModalObsCita(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputEtiqueta}>Indicaciones médicas para el equipo:</Text>
            <TextInput
              style={[styles.inputControl, { minHeight: 100, textAlignVertical: 'top' }]}
              multiline
              placeholder="Ej: No puede comer hasta mañana..."
              placeholderTextColor="#555555"
              value={textoObservacionCita}
              onChangeText={setTextoObservacionCita}
            />
            <TouchableOpacity style={styles.btnConfirmarModal} onPress={guardarObservacionPostCita}>
              <Text style={styles.btnConfirmarModalTexto}>Guardar Observación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tituloHeader: { fontSize: 24, fontWeight: '900', color: '#141414' },
  subHeader: { fontSize: 14, fontWeight: '700', color: '#2C221E' },

  btnCrearPaciente: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C221E', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  btnCrearPacienteTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, marginLeft: 5 },

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
  badgeCampanaTexto: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  modoSwitchBar: {
    flexDirection: 'row',
    backgroundColor: '#E4D8CA',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2C221E',
  },
  modoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modoBtnActivo: { backgroundColor: '#2C221E' },
  modoBtnText: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginLeft: 6 },
  modoBtnTextActivo: { color: '#FFFFFF' },

  sinPacientesCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center', marginTop: 20, borderWidth: 2, borderColor: '#2C221E' },
  sinPacientesTitulo: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginTop: 12, textAlign: 'center' },
  sinPacientesSub: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 8, lineHeight: 23 },
  btnRegistrarPrimerPaciente: { marginTop: 18, backgroundColor: '#2C221E', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14 },
  btnRegistrarPrimerPacienteTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  pacientesCarousel: { maxHeight: 48, marginBottom: 12 },
  pacienteChip: { backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 22, marginRight: 8, borderWidth: 2, borderColor: '#2C221E' },
  pacienteChipActivo: { backgroundColor: '#2C221E' },
  pacienteChipTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  pacienteChipTextoActivo: { color: '#FFFFFF' },

  tabsSelector: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 12, borderWidth: 2, borderColor: '#2C221E' },
  tabBoton: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabBotonActivo: { backgroundColor: '#2C221E' },
  tabBotonTexto: { fontSize: 14, fontWeight: 'bold', color: '#141414' },
  tabBotonTextoActivo: { color: '#FFFFFF' },

  fichaCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#6E5D4F' },
  fichaHeaderFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#D5C9BC', paddingBottom: 12, marginBottom: 12 },
  fichaAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2C221E', justifyContent: 'center', alignItems: 'center' },
  fichaAvatarLetra: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  fichaNombre: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  fichaEdad: { fontSize: 15, fontWeight: '600', color: '#333333', marginTop: 2 },
  campoEtiqueta: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginBottom: 5 },
  campoValor: { fontSize: 16, color: '#141414', backgroundColor: '#F2ECE4', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#6E5D4F', lineHeight: 22 },

  btnAgregarAccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 13, borderRadius: 14, marginBottom: 12 },
  btnAgregarAccionTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },

  vacioTexto: { fontSize: 16, fontWeight: '600', color: '#2B2B2B', textAlign: 'center', marginTop: 25 },

  itemCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  itemCardTomado: { backgroundColor: '#E8F5E9', borderColor: '#1B5E20' },
  itemNombre: { fontSize: 18, fontWeight: 'bold', color: '#141414', marginBottom: 4 },
  itemNombreTomado: { textDecorationLine: 'line-through', color: '#1B5E20' },
  itemSubtexto: { fontSize: 16, fontWeight: '600', color: '#141414', marginTop: 2 },
  itemNotaExtra: { fontSize: 15, color: '#333333', fontStyle: 'italic', marginTop: 5 },

  btnEstado: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 16, marginTop: 10, borderWidth: 1.5, borderColor: '#141414' },
  btnEstadoTomado: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  btnEstadoPendiente: { backgroundColor: '#F2ECE4' },
  btnEstadoTexto: { fontSize: 14, fontWeight: 'bold', color: '#141414' },

  badgeTomaConfirmada: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C8E6C9', padding: 10, borderRadius: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#1B5E20' },
  badgeTomaConfirmadaTexto: { fontSize: 15, fontWeight: 'bold', color: '#1B5E20', marginLeft: 8, flex: 1 },
  btnMarcarTomado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  btnMarcarTomadoTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  obsBox: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#F57F17', borderRadius: 12, padding: 10, marginTop: 10 },
  obsTitulo: { fontSize: 14, fontWeight: 'bold', color: '#E65100', marginBottom: 2 },
  obsTexto: { fontSize: 15, color: '#141414', lineHeight: 21 },
  btnCitaAccion: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  btnCitaAccionText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  btnObsCita: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', paddingHorizontal: 12, borderRadius: 12 },
  btnObsCitaText: { fontSize: 14, fontWeight: 'bold', color: '#141414', marginLeft: 5 },

  bitacoraCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#2C221E' },
  bitacoraPaciente: { fontSize: 16, fontWeight: 'bold', color: '#141414' },
  bitacoraDetalle: { fontSize: 15, fontWeight: '600', color: '#2C221E', marginTop: 2 },
  bitacoraResponsable: { fontSize: 14, fontWeight: 'bold', color: '#1B5E20', marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, maxHeight: '88%', borderWidth: 2, borderColor: '#141414' },
  modalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalCardTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  inputEtiqueta: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 10, marginBottom: 6 },
  inputControl: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  btnSelectorPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12 },
  btnSelectorPickerTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 10 },
  btnConfirmarModal: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  btnConfirmarModalTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});