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
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function AdministracionSuperUsuarioScreen() {
  const [loading, setLoading] = useState(true);
  const [tabAdmin, setTabAdmin] = useState<'cuidadores' | 'grupos' | 'moderacion'>('cuidadores');

  // Datos globales
  const [cuidadores, setCuidadores] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);

  // Modal Crear / Editar Grupo
  const [modalGrupoVisible, setModalGrupoVisible] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [descGrupo, setDescGrupo] = useState('');
  // Mapa { cuidadorId: 'admin_grupo' | 'cuidador' }
  const [seleccionadosGrupo, setSeleccionadosGrupo] = useState<Record<string, 'admin_grupo' | 'cuidador'>>({});
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [])
  );

  const cargarTodo = async () => {
    setLoading(true);
    const [resCuid, resGrup, resPosts, resComs] = await Promise.all([
      supabase.from('cuidadores').select('*').order('nombre', { ascending: true }),
      supabase
        .from('grupos')
        .select('*, grupo_miembros(id, cuidador_id, rol, cuidadores(nombre, email))')
        .order('created_at', { ascending: false }),
      supabase.from('publicaciones').select('*').order('created_at', { ascending: false }).limit(40),
      supabase.from('comentarios').select('*').order('created_at', { ascending: false }).limit(40),
    ]);

    setCuidadores(resCuid.data || []);
    setGrupos(resGrup.data || []);
    setPublicaciones(resPosts.data || []);
    setComentarios(resComs.data || []);
    setLoading(false);
  };

  // --- GESTIÓN DE CUIDADORES ---
  const toggleVerificacion = async (cuidador: any) => {
    const nuevoEstado = !cuidador.verificado;
    const { error } = await supabase
      .from('cuidadores')
      .update({ verificado: nuevoEstado })
      .eq('id', cuidador.id);

    if (!error) {
      setCuidadores((prev) =>
        prev.map((c) => (c.id === cuidador.id ? { ...c, verificado: nuevoEstado } : c))
      );
      Alert.alert(
        nuevoEstado ? 'Perfil Verificado' : 'Verificación Retirada',
        nuevoEstado
          ? `${cuidador.nombre} ahora tiene insignia verificada y permiso para publicar guías.`
          : `${cuidador.nombre} ya no puede publicar guías.`
      );
    }
  };

  const toggleSuspension = async (cuidador: any) => {
    if (cuidador.es_super_admin) return;
    const nuevoEstado = !cuidador.suspendido;
    const { error } = await supabase
      .from('cuidadores')
      .update({ suspendido: nuevoEstado })
      .eq('id', cuidador.id);

    if (!error) {
      setCuidadores((prev) =>
        prev.map((c) => (c.id === cuidador.id ? { ...c, suspendido: nuevoEstado } : c))
      );
    }
  };

  const eliminarCuentaCuidador = (cuidador: any) => {
    if (cuidador.es_super_admin) return;
    Alert.alert(
      'Eliminar Cuenta',
      `¿Eliminar definitivamente el perfil de ${cuidador.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('cuidadores').delete().eq('id', cuidador.id);
            if (!error) {
              setCuidadores((prev) => prev.filter((c) => c.id !== cuidador.id));
            } else {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // --- GESTIÓN DE GRUPOS ELEAM ---
  const toggleMiembroSeleccion = (id: string) => {
    setSeleccionadosGrupo((prev) => {
      const copia = { ...prev };
      if (copia[id]) {
        delete copia[id];
      } else {
        copia[id] = 'cuidador';
      }
      return copia;
    });
  };

  const cambiarRolSeleccionado = (id: string) => {
    setSeleccionadosGrupo((prev) => ({
      ...prev,
      [id]: prev[id] === 'admin_grupo' ? 'cuidador' : 'admin_grupo',
    }));
  };

  const crearGrupoNuevo = async () => {
    if (!nombreGrupo.trim()) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el grupo (ej: ELEAM Pabellón Sur).');
      return;
    }

    const idsSeleccionados = Object.keys(seleccionadosGrupo);
    if (idsSeleccionados.length === 0) {
      Alert.alert('Selecciona integrantes', 'Elige al menos un cuidador para este grupo.');
      return;
    }

    setGuardandoGrupo(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: grupoCreado, error } = await supabase
      .from('grupos')
      .insert([
        {
          nombre: nombreGrupo.trim(),
          descripcion: descGrupo.trim(),
          creado_por: user?.id || null,
        },
      ])
      .select()
      .single();

    if (error || !grupoCreado) {
      setGuardandoGrupo(false);
      Alert.alert('Error al crear grupo', error?.message || 'Intenta nuevamente');
      return;
    }

    const filasMiembros = idsSeleccionados.map((cuidId) => ({
      grupo_id: grupoCreado.id,
      cuidador_id: cuidId,
      rol: seleccionadosGrupo[cuidId],
    }));

    await supabase.from('grupo_miembros').insert(filasMiembros);

    setGuardandoGrupo(false);
    setModalGrupoVisible(false);
    setNombreGrupo('');
    setDescGrupo('');
    setSeleccionadosGrupo({});
    await cargarTodo();
    Alert.alert('Grupo Creado', `El grupo "${grupoCreado.nombre}" quedó operativo.`);
  };

  const eliminarGrupo = (grupo: any) => {
    Alert.alert('Eliminar Grupo', `¿Eliminar el grupo "${grupo.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('grupos').delete().eq('id', grupo.id);
          await cargarTodo();
        },
      },
    ]);
  };

  // --- MODERACIÓN ---
  const borrarPost = async (id: string) => {
    await supabase.from('publicaciones').delete().eq('id', id);
    setPublicaciones((prev) => prev.filter((p) => p.id !== id));
  };

  const borrarComentario = async (id: string) => {
    await supabase.from('comentarios').delete().eq('id', id);
    setComentarios((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tituloHeader}>Administración RESPIRO</Text>
        <Text style={styles.subHeader}>Control total de perfiles, guías y grupos ELEAM</Text>
      </View>

      {/* Selector de Módulo */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tabAdmin === 'cuidadores' && styles.tabBtnActivo]}
          onPress={() => setTabAdmin('cuidadores')}
        >
          <Text style={[styles.tabText, tabAdmin === 'cuidadores' && styles.tabTextActivo]}>
            Perfiles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabAdmin === 'grupos' && styles.tabBtnActivo]}
          onPress={() => setTabAdmin('grupos')}
        >
          <Text style={[styles.tabText, tabAdmin === 'grupos' && styles.tabTextActivo]}>
            Grupos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tabAdmin === 'moderacion' && styles.tabBtnActivo]}
          onPress={() => setTabAdmin('moderacion')}
        >
          <Text style={[styles.tabText, tabAdmin === 'moderacion' && styles.tabTextActivo]}>
            Muro
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* MÓDULO 1: PERFILES Y VERIFICACIÓN */}
          {tabAdmin === 'cuidadores' && (
            <FlatList
              data={cuidadores}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitulo}>
                        {item.nombre} {item.es_super_admin ? '(OFICIAL)' : ''}
                      </Text>
                      <Text style={styles.cardSub}>{item.email || 'Sin correo'}</Text>
                    </View>
                    {item.verificado && (
                      <Ionicons name="checkmark-circle" size={24} color="#1B5E20" />
                    )}
                  </View>

                  {!item.es_super_admin && (
                    <View style={styles.accionesRow}>
                      <TouchableOpacity
                        style={[
                          styles.btnSmall,
                          item.verificado ? styles.btnVerde : styles.btnNeutro,
                        ]}
                        onPress={() => toggleVerificacion(item)}
                      >
                        <Text
                          style={[
                            styles.btnSmallText,
                            item.verificado && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.verificado ? 'Verificado + Guías ✓' : 'Dar Verificación'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnSmall,
                          item.suspendido ? styles.btnRojo : styles.btnNeutro,
                        ]}
                        onPress={() => toggleSuspension(item)}
                      >
                        <Text
                          style={[
                            styles.btnSmallText,
                            item.suspendido && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.suspendido ? 'Suspendido' : 'Suspender'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => eliminarCuentaCuidador(item)}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash" size={22} color="#B71C1C" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
          )}

          {/* MÓDULO 2: CREAR Y ADMINISTRAR GRUPOS ELEAM */}
          {tabAdmin === 'grupos' && (
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.btnCrearGrupo}
                onPress={() => setModalGrupoVisible(true)}
              >
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text style={styles.btnCrearGrupoText}>Crear Nuevo Grupo de Cuidadores</Text>
              </TouchableOpacity>

              <FlatList
                data={grupos}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.vacioText}>Aún no has creado grupos ELEAM.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.cardTitulo}>{item.nombre}</Text>
                      <TouchableOpacity onPress={() => eliminarGrupo(item)}>
                        <Ionicons name="trash" size={22} color="#B71C1C" />
                      </TouchableOpacity>
                    </View>
                    {item.descripcion ? <Text style={styles.cardSub}>{item.descripcion}</Text> : null}

                    <Text style={styles.miembrosHeader}>Integrantes ({item.grupo_miembros?.length || 0}):</Text>
                    {(item.grupo_miembros || []).map((m: any) => (
                      <Text key={m.id} style={styles.miembroItem}>
                        • {m.cuidadores?.nombre || 'Cuidador'} —{' '}
                        <Text style={{ fontWeight: 'bold', color: m.rol === 'admin_grupo' ? '#1B5E20' : '#141414' }}>
                          {m.rol === 'admin_grupo' ? 'ADMIN DE GRUPO' : 'Cuidador'}
                        </Text>
                      </Text>
                    ))}
                  </View>
                )}
              />
            </View>
          )}

          {/* MÓDULO 3: MODERACIÓN DE PUBLICACIONES Y COMENTARIOS */}
          {tabAdmin === 'moderacion' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modTitulo}>Publicaciones Recientes</Text>
              {publicaciones.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitulo}>{p.autor_nombre || 'Cuidador'}</Text>
                    <TouchableOpacity onPress={() => borrarPost(p.id)}>
                      <Ionicons name="trash" size={20} color="#B71C1C" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardSub}>{p.contenido}</Text>
                </View>
              ))}

              <Text style={styles.modTitulo}>Comentarios Recientes</Text>
              {comentarios.map((c) => (
                <View key={c.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitulo}>{c.autor_nombre || 'Cuidador'}</Text>
                    <TouchableOpacity onPress={() => borrarComentario(c.id)}>
                      <Ionicons name="trash" size={20} color="#B71C1C" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cardSub}>{c.contenido}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* MODAL CREAR GRUPO */}
      <Modal visible={modalGrupoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Agrupar Cuidadores</Text>
              <TouchableOpacity onPress={() => setModalGrupoVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre del Grupo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: ELEAM Turno Mañana / Casa Reposo"
                placeholderTextColor="#555555"
                value={nombreGrupo}
                onChangeText={setNombreGrupo}
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Pabellón 1 y 2"
                placeholderTextColor="#555555"
                value={descGrupo}
                onChangeText={setDescGrupo}
              />

              <Text style={styles.label}>Selecciona integrantes y define su rol:</Text>
              {cuidadores
                .filter((c) => !c.es_super_admin)
                .map((c) => {
                  const rolActual = seleccionadosGrupo[c.id];
                  const estaSeleccionado = Boolean(rolActual);

                  return (
                    <View key={c.id} style={styles.selectorCuidadorRow}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                        onPress={() => toggleMiembroSeleccion(c.id)}
                      >
                        <Ionicons
                          name={estaSeleccionado ? 'checkbox' : 'square-outline'}
                          size={24}
                          color="#141414"
                        />
                        <Text style={styles.selectorCuidadorNombre}>{c.nombre}</Text>
                      </TouchableOpacity>

                      {estaSeleccionado && (
                        <TouchableOpacity
                          style={[
                            styles.btnRolToggle,
                            rolActual === 'admin_grupo' && { backgroundColor: '#1B5E20' },
                          ]}
                          onPress={() => cambiarRolSeleccionado(c.id)}
                        >
                          <Text style={styles.btnRolToggleText}>
                            {rolActual === 'admin_grupo' ? 'Admin Grupo' : 'Cuidador'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

              <TouchableOpacity
                style={styles.btnConfirmar}
                onPress={crearGrupoNuevo}
                disabled={guardandoGrupo}
              >
                {guardandoGrupo ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnConfirmarText}>Guardar Grupo</Text>
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
  header: { marginBottom: 12 },
  tituloHeader: { fontSize: 25, fontWeight: '900', color: '#141414' },
  subHeader: { fontSize: 14, fontWeight: '600', color: '#333333' },

  tabsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, marginBottom: 14, borderWidth: 2, borderColor: '#2C221E' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActivo: { backgroundColor: '#2C221E' },
  tabText: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  tabTextActivo: { color: '#FFFFFF' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  cardTitulo: { fontSize: 18, fontWeight: 'bold', color: '#141414' },
  cardSub: { fontSize: 15, color: '#2B2B2B', marginTop: 3 },

  accionesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#141414' },
  btnNeutro: { backgroundColor: '#F2ECE4' },
  btnVerde: { backgroundColor: '#1B5E20', borderColor: '#1B5E20' },
  btnRojo: { backgroundColor: '#B71C1C', borderColor: '#B71C1C' },
  btnSmallText: { fontSize: 14, fontWeight: 'bold', color: '#141414' },

  btnCrearGrupo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 14, borderRadius: 14, marginBottom: 14 },
  btnCrearGrupoText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  miembrosHeader: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 10, marginBottom: 4 },
  miembroItem: { fontSize: 15, color: '#141414', marginTop: 2 },
  vacioText: { fontSize: 16, color: '#333333', textAlign: 'center', marginTop: 30 },

  modTitulo: { fontSize: 18, fontWeight: 'bold', color: '#141414', marginTop: 8, marginBottom: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, maxHeight: '88%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },

  selectorCuidadorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0D6CC' },
  selectorCuidadorNombre: { fontSize: 16, fontWeight: '600', color: '#141414', marginLeft: 10 },
  btnRolToggle: { backgroundColor: '#2C221E', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnRolToggleText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },

  btnConfirmar: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18, marginBottom: 8 },
  btnConfirmarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});