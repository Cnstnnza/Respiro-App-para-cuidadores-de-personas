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
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function MuroComunidadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nombreCuidador, setNombreCuidador] = useState('Cuidador');
  const [noLeidas, setNoLeidas] = useState(0);

  // Publicaciones
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [nuevoPost, setNuevoPost] = useState('');
  const [publicando, setPublicando] = useState(false);

  // Modal de Comentarios
  const [modalComentariosVisible, setModalComentariosVisible] = useState(false);
  const [publicacionActiva, setPublicacionActiva] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const iniciar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && activo) {
          setCurrentUser(user);
          const { data: perfil } = await supabase
            .from('cuidadores')
            .select('nombre')
            .eq('id', user.id)
            .maybeSingle();

          setNombreCuidador(
            perfil?.nombre ||
              user.user_metadata?.nombre ||
              user.email?.split('@')[0] ||
              'Cuidador'
          );

          await contarNoLeidas(user.id);
        }
        await cargarMuro();
        if (activo) setLoading(false);
      };

      iniciar();
      return () => {
        activo = false;
      };
    }, [])
  );

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

  const cargarMuro = async () => {
    try {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error cargando muro:', error.message);
      } else {
        setPublicaciones(data || []);
      }
    } catch (e: any) {
      console.log('Error cargando muro:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentUser) await contarNoLeidas(currentUser.id);
    await cargarMuro();
    setRefreshing(false);
  };

  const publicarEnMuro = async () => {
    if (!nuevoPost.trim()) {
      Alert.alert('Mensaje vacío', 'Escribe un comentario o experiencia para compartir.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Sesión requerida', 'Inicia sesión nuevamente para publicar.');
      return;
    }

    setPublicando(true);
    const { data, error } = await supabase
      .from('publicaciones')
      .insert([
        {
          user_id: currentUser.id,
          autor_id: currentUser.id,
          autor_nombre: nombreCuidador,
          autor_email: currentUser.email,
          contenido: nuevoPost.trim(),
        },
      ])
      .select()
      .single();

    setPublicando(false);

    if (error) {
      Alert.alert('Error al publicar', error.message);
    } else if (data) {
      setPublicaciones((prev) => [data, ...prev]);
      setNuevoPost('');
    }
  };

  const eliminarPublicacion = async (id: string) => {
    Alert.alert('Eliminar mensaje', '¿Deseas borrar esta publicación del muro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('publicaciones').delete().eq('id', id);
          if (!error) {
            setPublicaciones((prev) => prev.filter((p) => p.id !== id));
          } else {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const abrirComentarios = async (post: any) => {
    setPublicacionActiva(post);
    setModalComentariosVisible(true);
    setCargandoComentarios(true);
    setComentarios([]);

    const { data, error } = await supabase
      .from('comentarios')
      .select('*')
      .eq('publicacion_id', post.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComentarios(data);
    }
    setCargandoComentarios(false);
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) {
      Alert.alert('Aviso', 'Escribe tu respuesta antes de enviar.');
      return;
    }

    if (!currentUser || !publicacionActiva) return;

    setEnviandoComentario(true);
    const { data, error } = await supabase
      .from('comentarios')
      .insert([
        {
          publicacion_id: publicacionActiva.id,
          user_id: currentUser.id,
          autor_id: currentUser.id,
          autor_nombre: nombreCuidador,
          autor_email: currentUser.email,
          contenido: nuevoComentario.trim(),
        },
      ])
      .select()
      .single();

    setEnviandoComentario(false);

    if (error) {
      Alert.alert('Error al comentar', error.message);
    } else if (data) {
      setComentarios((prev) => [...prev, data]);
      setNuevoComentario('');
    }
  };

  const eliminarComentario = async (comentarioId: string) => {
    const { error } = await supabase.from('comentarios').delete().eq('id', comentarioId);
    if (!error) {
      setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
    }
  };

  const formatearFecha = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Encabezado con Campanita */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tituloHeader}>Comunidad Respiro</Text>
          <Text style={styles.subHeader}>Apoyo mutuo entre cuidadores</Text>
        </View>

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

      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C221E" />
          }
          ListHeaderComponent={
            <View style={styles.cajaNuevaPublicacion}>
              <Text style={styles.cajaTitulo}>¿Qué quieres compartir hoy?</Text>
              <TextInput
                style={styles.inputPost}
                placeholder="Escribe un desahogo, duda o consejo para otros cuidadores..."
                placeholderTextColor="#555555"
                multiline
                value={nuevoPost}
                onChangeText={setNuevoPost}
              />
              <TouchableOpacity
                style={styles.btnPublicar}
                onPress={publicarEnMuro}
                disabled={publicando}
              >
                {publicando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.btnPublicarTexto}>Publicar en el Muro</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.vacioCard}>
              <Ionicons name="chatbubbles-outline" size={54} color="#2C221E" />
              <Text style={styles.vacioTitulo}>Aún no hay publicaciones</Text>
              <Text style={styles.vacioSub}>
                Sé el primero en compartir un mensaje de apoyo con la comunidad.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const esMio =
              currentUser &&
              (item.user_id === currentUser.id || item.autor_id === currentUser.id);

            return (
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.postAutorFila}>
                    <View style={styles.avatarCirculo}>
                      <Text style={styles.avatarLetra}>
                        {(item.autor_nombre || item.autor_email || 'C')
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.postAutor}>
                        {item.autor_nombre || item.autor_email?.split('@')[0] || 'Cuidador'}
                      </Text>
                      <Text style={styles.postFecha}>{formatearFecha(item.created_at)}</Text>
                    </View>
                  </View>

                  {esMio && (
                    <TouchableOpacity
                      onPress={() => eliminarPublicacion(item.id)}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="trash" size={22} color="#B71C1C" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.postContenido}>{item.contenido}</Text>

                <View style={styles.postFooter}>
                  <TouchableOpacity
                    style={styles.btnComentar}
                    onPress={() => abrirComentarios(item)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={20} color="#141414" />
                    <Text style={styles.btnComentarTexto}>Ver y Responder Comentarios</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL COMENTARIOS */}
      <Modal visible={modalComentariosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Comentarios</Text>
              <TouchableOpacity onPress={() => setModalComentariosVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            {publicacionActiva && (
              <View style={styles.postOriginalBox}>
                <Text style={styles.postOriginalAutor}>
                  {publicacionActiva.autor_nombre || 'Cuidador'}:
                </Text>
                <Text style={styles.postOriginalTexto} numberOfLines={3}>
                  {publicacionActiva.contenido}
                </Text>
              </View>
            )}

            {cargandoComentarios ? (
              <ActivityIndicator size="large" color="#2C221E" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={comentarios}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 300, marginBottom: 12 }}
                ListEmptyComponent={
                  <Text style={styles.sinComentariosTexto}>
                    Nadie ha comentado aún. Escribe el primer mensaje de apoyo.
                  </Text>
                }
                renderItem={({ item }) => {
                  const esComentarioMio =
                    currentUser &&
                    (item.user_id === currentUser.id || item.autor_id === currentUser.id);

                  return (
                    <View style={styles.comentarioItem}>
                      <View style={styles.comentarioHeader}>
                        <Text style={styles.comentarioAutor}>
                          {item.autor_nombre || item.autor_email?.split('@')[0] || 'Cuidador'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.comentarioFecha}>
                            {formatearFecha(item.created_at)}
                          </Text>
                          {esComentarioMio && (
                            <TouchableOpacity
                              onPress={() => eliminarComentario(item.id)}
                              style={{ marginLeft: 8 }}
                            >
                              <Ionicons name="trash" size={18} color="#B71C1C" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={styles.comentarioContenido}>{item.contenido}</Text>
                    </View>
                  );
                }}
              />
            )}

            <View style={styles.inputComentarioRow}>
              <TextInput
                style={styles.inputComentario}
                placeholder="Escribe una respuesta..."
                placeholderTextColor="#555555"
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
              />
              <TouchableOpacity
                style={styles.btnEnviarComentario}
                onPress={enviarComentario}
                disabled={enviandoComentario}
              >
                {enviandoComentario ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tituloHeader: { fontSize: 26, fontWeight: '900', color: '#141414' },
  subHeader: { fontSize: 15, fontWeight: '600', color: '#333333' },

  btnCampana: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B71C1C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeCampanaTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  cajaNuevaPublicacion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2C221E',
    marginBottom: 16,
  },
  cajaTitulo: { fontSize: 17, fontWeight: 'bold', color: '#141414', marginBottom: 8 },
  inputPost: {
    backgroundColor: '#F2ECE4',
    borderWidth: 2,
    borderColor: '#2C221E',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#141414',
    minHeight: 75,
    textAlignVertical: 'top',
  },
  btnPublicar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C221E',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 12,
  },
  btnPublicarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  vacioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6E5D4F',
  },
  vacioTitulo: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginTop: 10 },
  vacioSub: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 6, lineHeight: 23 },

  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#6E5D4F',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAutorFila: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarCirculo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2C221E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetra: { fontSize: 19, fontWeight: 'bold', color: '#FFFFFF' },
  postAutor: { fontSize: 17, fontWeight: 'bold', color: '#141414' },
  postFecha: { fontSize: 13, fontWeight: '600', color: '#333333' },
  postContenido: { fontSize: 17, color: '#141414', lineHeight: 25, marginBottom: 12 },

  postFooter: { borderTopWidth: 1.5, borderTopColor: '#E0D6CC', paddingTop: 10 },
  btnComentar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2ECE4',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2C221E',
  },
  btnComentarTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, maxHeight: '88%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitulo: { fontSize: 21, fontWeight: 'bold', color: '#141414' },

  postOriginalBox: {
    backgroundColor: '#F2ECE4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6E5D4F',
    marginBottom: 12,
  },
  postOriginalAutor: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginBottom: 4 },
  postOriginalTexto: { fontSize: 15, color: '#2B2B2B', lineHeight: 21 },

  sinComentariosTexto: { fontSize: 15, color: '#333333', textAlign: 'center', marginVertical: 20 },
  comentarioItem: {
    backgroundColor: '#F2ECE4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6E5D4F',
  },
  comentarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  comentarioAutor: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  comentarioFecha: { fontSize: 12, fontWeight: '600', color: '#333333' },
  comentarioContenido: { fontSize: 16, color: '#141414', lineHeight: 22 },

  inputComentarioRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  inputComentario: {
    flex: 1,
    backgroundColor: '#F2ECE4',
    borderWidth: 2,
    borderColor: '#2C221E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#141414',
    marginRight: 8,
  },
  btnEnviarComentario: {
    backgroundColor: '#2C221E',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});