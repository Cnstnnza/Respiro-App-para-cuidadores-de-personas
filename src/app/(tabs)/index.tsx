import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function InicioForoScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [perfilesMap, setPerfilesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [notifNoLeidas, setNotifNoLeidas] = useState(0);

  // Estados modal comentarios
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');

  // Se ejecuta cada vez que la pantalla entra en foco (por ejemplo, al volver del perfil)
  useFocusEffect(
    useCallback(() => {
      obtenerUsuarioYPosts();
    }, [])
  );

  const obtenerUsuarioYPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      await cargarPublicaciones(user.id);
      cargarContadorNotificaciones(user.id);
    }
  };

  const onRefresh = async () => {
    setRefrescando(true);
    if (currentUser) {
      await cargarPublicaciones(currentUser.id);
      await cargarContadorNotificaciones(currentUser.id);
    }
    setRefrescando(false);
  };

  const cargarContadorNotificaciones = async (userId: string) => {
    try {
      const { count } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('leido', false);

      setNotifNoLeidas(count || 0);
    } catch (e) {
      console.log('Error contador notificaciones:', e);
    }
  };

  const cargarPublicaciones = async (userId: string) => {
    try {
      const { data: pubs, error } = await supabase
        .from('publicaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (pubs) {
        const { data: todosLikes } = await supabase.from('likes').select('*');
        const { data: todosComents } = await supabase.from('comentarios').select('id, publicacion_id');

        const formateadas = pubs.map((p) => {
          const misLikes = todosLikes ? todosLikes.filter((l) => l.publicacion_id === p.id) : [];
          const misComents = todosComents ? todosComents.filter((c) => c.publicacion_id === p.id) : [];

          return {
            ...p,
            totalLikes: misLikes.length,
            hasLiked: misLikes.some((l) => l.user_id === userId),
            totalComentarios: misComents.length,
          };
        });

        setPosts(formateadas);

        // Perfiles de los autores
        const { data: cuidadores } = await supabase
          .from('cuidadores')
          .select('id, nombre, foto_url, verificado');

        if (cuidadores) {
          const mapa: Record<string, any> = {};
          cuidadores.forEach((c) => {
            mapa[c.id] = c;
          });
          setPerfilesMap(mapa);
        }
      }
    } catch (err: any) {
      console.log('Detalle error carga:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (post: any) => {
    if (!currentUser) return;

    if (post.hasLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('publicacion_id', post.id)
        .eq('user_id', currentUser.id);
    } else {
      await supabase
        .from('likes')
        .insert([{ publicacion_id: post.id, user_id: currentUser.id }]);

      if (post.user_id !== currentUser.id) {
        await supabase.from('notificaciones').insert([
          {
            user_id: post.user_id,
            emisor_email: currentUser.email,
            publicacion_id: post.id,
            mensaje: `${currentUser.email} indicó que le gusta tu publicación`,
          },
        ]);
      }
    }
    cargarPublicaciones(currentUser.id);
  };

  const abrirComentarios = async (post: any) => {
    setSelectedPost(post);
    setModalVisible(true);
    cargarComentarios(post.id);
  };

  const cargarComentarios = async (postId: string) => {
    const { data } = await supabase
      .from('comentarios')
      .select('*')
      .eq('publicacion_id', postId)
      .order('created_at', { ascending: true });

    if (data) setComentarios(data);
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim() || !selectedPost || !currentUser) return;

    const { error } = await supabase.from('comentarios').insert([
      {
        publicacion_id: selectedPost.id,
        user_id: currentUser.id,
        autor_email: currentUser.email,
        contenido: nuevoComentario.trim(),
      },
    ]);

    if (!error) {
      if (selectedPost.user_id !== currentUser.id) {
        await supabase.from('notificaciones').insert([
          {
            user_id: selectedPost.user_id,
            emisor_email: currentUser.email,
            publicacion_id: selectedPost.id,
            mensaje: `${currentUser.email} comentó en tu publicación`,
          },
        ]);
      }
      setNuevoComentario('');
      cargarComentarios(selectedPost.id);
      cargarPublicaciones(currentUser.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado limpio con Notificaciones y Perfil */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Respiro</Text>
          <Text style={styles.headerSubtitle}>Comunidad de Cuidadores</Text>
        </View>

        <View style={styles.headerAcciones}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/notificaciones')}
          >
            <Ionicons name="notifications-outline" size={22} color="#4A3B32" />
            {notifNoLeidas > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifNoLeidas}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerBtn, { marginLeft: 8 }]}
            onPress={() => router.push('/perfil')}
          >
            <Ionicons name="person-circle-outline" size={26} color="#C59A77" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Principal */}
      {loading ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={['#C59A77']} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: '#8A7A70', fontSize: 15 }}>No hay publicaciones en el feed.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const perfil = perfilesMap[item.user_id];
            const tieneFoto = perfil && perfil.foto_url;
            const nombreMostrar = perfil?.nombre || item.autor_email;
            const esVerificado = Boolean(perfil?.verificado);

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeaderAutor}
                  onPress={() => router.push({ pathname: '/perfil', params: { userId: item.user_id } })}
                >
                  {tieneFoto ? (
                    <Image source={{ uri: perfil.foto_url }} style={styles.avatarMiniImg} />
                  ) : (
                    <View style={styles.avatarMini}>
                      <Text style={styles.avatarMiniLetra}>
                        {nombreMostrar.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cardAutor}>{nombreMostrar}</Text>
                      {esVerificado && (
                        <Ionicons
                          name="checkmark-circle"
                          size={15}
                          color="#1D9BF0"
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                    <Text style={styles.cardSubtexto}>Ver perfil</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.cardTexto}>{item.contenido}</Text>

                <View style={styles.cardFooter}>
                  <TouchableOpacity style={styles.accionBtn} onPress={() => toggleLike(item)}>
                    <Ionicons
                      name={item.hasLiked ? 'heart' : 'heart-outline'}
                      size={20}
                      color={item.hasLiked ? '#D9534F' : '#8A7A70'}
                    />
                    <Text style={styles.accionText}>{item.totalLikes}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.accionBtn} onPress={() => abrirComentarios(item)}>
                    <Ionicons name="chatbubble-outline" size={18} color="#8A7A70" />
                    <Text style={styles.accionText}>{item.totalComentarios}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal Comentarios */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comentarios</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={comentarios}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.comentarioItem}>
                  <Text style={styles.comentarioAutor}>{item.autor_email}</Text>
                  <Text style={styles.comentarioTexto}>{item.contenido}</Text>
                </View>
              )}
            />

            <View style={styles.inputComentarioContainer}>
              <TextInput
                placeholder="Escribe una respuesta..."
                placeholderTextColor="#A0958E"
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
                style={styles.inputComentario}
              />
              <TouchableOpacity style={styles.btnEnviarComentario} onPress={enviarComentario}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  headerSubtitle: { fontSize: 13, color: '#8A7A70' },
  headerAcciones: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { position: 'relative', padding: 8, backgroundColor: '#FFFFFF', borderRadius: 12 },
  badge: { position: 'absolute', right: -2, top: -2, backgroundColor: '#D9534F', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeaderAutor: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarMini: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E8DFD8', justifyContent: 'center', alignItems: 'center' },
  avatarMiniImg: { width: 38, height: 38, borderRadius: 19 },
  avatarMiniLetra: { fontSize: 15, fontWeight: 'bold', color: '#4A3B32' },
  cardAutor: { fontSize: 15, fontWeight: '600', color: '#4A3B32' },
  cardSubtexto: { fontSize: 11, color: '#C59A77' },
  cardTexto: { fontSize: 15, color: '#4A3B32', marginBottom: 12, lineHeight: 21 },
  cardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 10 },
  accionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  accionText: { marginLeft: 6, color: '#8A7A70', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', height: '65%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32' },
  comentarioItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F7EFE8' },
  comentarioAutor: { fontSize: 12, color: '#8A7A70', fontWeight: 'bold' },
  comentarioTexto: { fontSize: 14, color: '#4A3B32', marginTop: 2 },
  inputComentarioContainer: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  inputComentario: { flex: 1, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 10, padding: 10, marginRight: 8, color: '#333' },
  btnEnviarComentario: { backgroundColor: '#C59A77', padding: 12, borderRadius: 10 }
});