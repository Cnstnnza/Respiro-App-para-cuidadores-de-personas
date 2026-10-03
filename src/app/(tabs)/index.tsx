import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function MuroScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Modal y estados de comentarios
  const [postSeleccionado, setPostSeleccionado] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [cargandoComentarios, setCargandoComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  useEffect(() => {
    obtenerUsuarioYPosts();
  }, []);

  const obtenerUsuarioYPosts = async () => {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);
    await cargarPublicaciones(user?.id);
    setCargando(false);
  };

  const onRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarPublicaciones(currentUser?.id);
    setRefrescando(false);
  }, [currentUser]);

  const cargarPublicaciones = async (userIdActual?: string) => {
    try {
      const { data: posts, error } = await supabase
        .from('publicaciones')
        .select(`
          id,
          contenido,
          created_at,
          user_id,
          cuidadores:user_id (
            nombre,
            foto_url,
            verificado
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (posts) {
        const { data: todosLikes } = await supabase.from('likes').select('*');
        const { data: todosComents } = await supabase.from('comentarios').select('id, publicacion_id');

        const postsConMetricas = posts.map((p: any) => {
          const misLikes = todosLikes ? todosLikes.filter((l) => l.publicacion_id === p.id) : [];
          const misComents = todosComents ? todosComents.filter((c) => c.publicacion_id === p.id) : [];

          return {
            ...p,
            totalLikes: misLikes.length,
            hasLiked: userIdActual ? misLikes.some((l) => l.user_id === userIdActual) : false,
            totalComentarios: misComents.length,
          };
        });

        setPublicaciones(postsConMetricas);
      }
    } catch (err: any) {
      console.log('Error cargando muro:', err.message);
    }
  };

  const toggleLike = async (postId: string, hasLiked: boolean) => {
    if (!currentUser) return;

    setPublicaciones((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            hasLiked: !hasLiked,
            totalLikes: hasLiked ? p.totalLikes - 1 : p.totalLikes + 1,
          };
        }
        return p;
      })
    );

    if (hasLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('publicacion_id', postId)
        .eq('user_id', currentUser.id);
    } else {
      await supabase.from('likes').insert([
        {
          publicacion_id: postId,
          user_id: currentUser.id,
        },
      ]);
    }
  };

  const abrirComentarios = async (post: any) => {
    setPostSeleccionado(post);
    setCargandoComentarios(true);

    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select(`
          id,
          contenido,
          created_at,
          user_id,
          cuidadores:user_id (
            nombre,
            foto_url,
            verificado
          )
        `)
        .eq('publicacion_id', post.id)
        .order('created_at', { ascending: true });

      if (!error && data) setComentarios(data);
    } catch (err: any) {
      console.log('Error comentarios:', err.message);
    } finally {
      setCargandoComentarios(false);
    }
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim() || !postSeleccionado || !currentUser) return;

    setEnviandoComentario(true);
    const { data, error } = await supabase
      .from('comentarios')
      .insert([
        {
          publicacion_id: postSeleccionado.id,
          user_id: currentUser.id,
          contenido: nuevoComentario.trim(),
        },
      ])
      .select(`
        id,
        contenido,
        created_at,
        user_id,
        cuidadores:user_id (
          nombre,
          foto_url,
          verificado
        )
      `)
      .single();

    setEnviandoComentario(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setComentarios((prev) => [...prev, data]);
      setNuevoComentario('');
      setPublicaciones((prev) =>
        prev.map((p) =>
          p.id === postSeleccionado.id ? { ...p, totalComentarios: p.totalComentarios + 1 } : p
        )
      );
    }
  };

  const irAlPerfilUsuario = (userId: string) => {
    if (postSeleccionado) setPostSeleccionado(null);
    router.push({
      pathname: '/perfil',
      params: { userId },
    });
  };

  return (
    <View style={styles.container}>
      {/* Encabezado sin botón publicar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.tituloApp}>Respiro</Text>
          <Text style={styles.subtituloApp}>Comunidad de Cuidadores</Text>
        </View>
      </View>

      {cargando ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={['#C59A77']} />
          }
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#A0958E" />
              <Text style={styles.vacioTexto}>Aún no hay publicaciones en la comunidad.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardPost}>
              <View style={styles.postAutorFila}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => irAlPerfilUsuario(item.user_id)}
                >
                  {item.cuidadores?.foto_url ? (
                    <Image source={{ uri: item.cuidadores.foto_url }} style={styles.autorAvatarImg} />
                  ) : (
                    <View style={styles.autorAvatarPlaceholder}>
                      <Text style={styles.autorAvatarLetra}>
                        {item.cuidadores?.nombre ? item.cuidadores.nombre.charAt(0).toUpperCase() : 'C'}
                      </Text>
                    </View>
                  )}

                  <View style={{ marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.autorNombre}>
                        {item.cuidadores?.nombre || 'Cuidador Respiro'}
                      </Text>
                      {Boolean(item.cuidadores?.verificado) && (
                        <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                    <Text style={styles.postFecha}>
                      {new Date(item.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.postTexto}>{item.contenido}</Text>

              <View style={styles.postAccionesFila}>
                <TouchableOpacity
                  style={styles.accionBoton}
                  onPress={() => toggleLike(item.id, item.hasLiked)}
                >
                  <Ionicons
                    name={item.hasLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={item.hasLiked ? '#D9534F' : '#665B54'}
                  />
                  <Text style={[styles.accionTexto, item.hasLiked && { color: '#D9534F', fontWeight: 'bold' }]}>
                    {item.totalLikes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.accionBoton, { marginLeft: 20 }]}
                  onPress={() => abrirComentarios(item)}
                >
                  <Ionicons name="chatbubble-outline" size={19} color="#665B54" />
                  <Text style={styles.accionTexto}>{item.totalComentarios}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL COMENTARIOS */}
      <Modal visible={Boolean(postSeleccionado)} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.comentariosContenedor}>
            <View style={styles.comentariosHeader}>
              <Text style={styles.comentariosTitulo}>Comentarios</Text>
              <TouchableOpacity onPress={() => setPostSeleccionado(null)}>
                <Ionicons name="close" size={24} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            {cargandoComentarios ? (
              <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 20, flex: 1 }} />
            ) : (
              <FlatList
                data={comentarios}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                ListEmptyComponent={
                  <View style={styles.sinComentariosBox}>
                    <Text style={styles.sinComentariosTexto}>No hay comentarios aún.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.comentarioItem}>
                    <TouchableOpacity onPress={() => irAlPerfilUsuario(item.user_id)}>
                      {item.cuidadores?.foto_url ? (
                        <Image source={{ uri: item.cuidadores.foto_url }} style={styles.comentarioAvatarImg} />
                      ) : (
                        <View style={styles.comentarioAvatarPlaceholder}>
                          <Text style={styles.comentarioAvatarLetra}>
                            {item.cuidadores?.nombre ? item.cuidadores.nombre.charAt(0).toUpperCase() : 'C'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.comentarioCuerpo}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => irAlPerfilUsuario(item.user_id)}
                      >
                        <Text style={styles.comentarioAutor}>
                          {item.cuidadores?.nombre || 'Cuidador Respiro'}
                        </Text>
                        {Boolean(item.cuidadores?.verificado) && (
                          <Ionicons name="checkmark-circle" size={13} color="#1D9BF0" style={{ marginLeft: 4 }} />
                        )}
                        <Text style={styles.comentarioHora}>
                          {new Date(item.created_at).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.comentarioTexto}>{item.contenido}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.inputComentarioFila}>
              <TextInput
                style={styles.inputComentario}
                placeholder="Escribe una respuesta de apoyo..."
                placeholderTextColor="#A0958E"
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
              />
              <TouchableOpacity
                style={styles.btnEnviarComentario}
                onPress={enviarComentario}
                disabled={enviandoComentario}
              >
                {enviandoComentario ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  header: { marginBottom: 14 },
  tituloApp: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtituloApp: { fontSize: 13, color: '#8A7A70' },
  cardPost: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8DFD8' },
  postAutorFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  autorAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  autorAvatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center' },
  autorAvatarLetra: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  autorNombre: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32' },
  postFecha: { fontSize: 11, color: '#A0958E', marginTop: 1 },
  postTexto: { fontSize: 14, color: '#4A3B32', lineHeight: 21, marginBottom: 12 },
  postAccionesFila: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 10, alignItems: 'center' },
  accionBoton: { flexDirection: 'row', alignItems: 'center' },
  accionTexto: { fontSize: 13, color: '#665B54', marginLeft: 6 },
  vacioContainer: { alignItems: 'center', padding: 40 },
  vacioTexto: { fontSize: 14, color: '#8A7A70', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  comentariosContenedor: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '75%', padding: 16 },
  comentariosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F7EFE8', paddingBottom: 8 },
  comentariosTitulo: { fontSize: 17, fontWeight: 'bold', color: '#4A3B32' },
  sinComentariosBox: { alignItems: 'center', padding: 30 },
  sinComentariosTexto: { fontSize: 14, color: '#8A7A70' },
  comentarioItem: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  comentarioAvatarImg: { width: 34, height: 34, borderRadius: 17, marginRight: 8 },
  comentarioAvatarPlaceholder: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  comentarioAvatarLetra: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  comentarioCuerpo: { flex: 1, backgroundColor: '#FAF6F0', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E8DFD8' },
  comentarioAutor: { fontSize: 13, fontWeight: 'bold', color: '#4A3B32' },
  comentarioHora: { fontSize: 10, color: '#A0958E', marginLeft: 'auto' },
  comentarioTexto: { fontSize: 13, color: '#554A43', marginTop: 4, lineHeight: 18 },
  inputComentarioFila: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 10 },
  inputComentario: { flex: 1, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#333', marginRight: 8 },
  btnEnviarComentario: { backgroundColor: '#C59A77', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});