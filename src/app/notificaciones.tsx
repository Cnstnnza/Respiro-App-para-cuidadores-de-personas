import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function NotificacionesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const iniciar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && activo) {
          setCurrentUser(user);
          await cargarNotificaciones(user.id);
        }
        if (activo) setLoading(false);
      };

      iniciar();
      return () => {
        activo = false;
      };
    }, [])
  );

  const cargarNotificaciones = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_app')
        .select('*')
        .eq('usuario_destino_id', userId)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        setNotificaciones(data);
      }
    } catch (e) {
      console.log('Error cargando notificaciones:', e);
    }
  };

  const onRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await cargarNotificaciones(currentUser.id);
    setRefreshing(false);
  };

  const marcarComoLeida = async (item: any) => {
    if (item.leida) return;

    setNotificaciones((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, leida: true } : n))
    );

    await supabase
      .from('notificaciones_app')
      .update({ leida: true })
      .eq('id', item.id);
  };

  const marcarTodasLeidas = async () => {
    if (!currentUser) return;
    const haySinLeer = notificaciones.some((n) => !n.leida);
    if (!haySinLeer) return;

    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));

    await supabase
      .from('notificaciones_app')
      .update({ leida: true })
      .eq('usuario_destino_id', currentUser.id)
      .eq('leida', false);
  };

  const eliminarNotificacion = (id: string) => {
    Alert.alert('Eliminar alerta', '¿Deseas borrar esta notificación del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('notificaciones_app')
            .delete()
            .eq('id', id);

          if (!error) {
            setNotificaciones((prev) => prev.filter((n) => n.id !== id));
          }
        },
      },
    ]);
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

  const sinLeerCount = notificaciones.filter((n) => !n.leida).length;

  return (
    <View style={styles.container}>
      {/* Barra superior de estado y acción masiva */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Alertas del Equipo</Text>
          <Text style={styles.subtitulo}>
            {sinLeerCount > 0
              ? `Tienes ${sinLeerCount} alerta${sinLeerCount > 1 ? 's' : ''} sin leer`
              : 'Todas las alertas están al día'}
          </Text>
        </View>

        {sinLeerCount > 0 && (
          <TouchableOpacity style={styles.btnLeerTodas} onPress={marcarTodasLeidas}>
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            <Text style={styles.btnLeerTodasTexto}>Leer todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C221E" />
          }
          ListEmptyComponent={
            <View style={styles.vacioCard}>
              <Ionicons name="notifications-off-outline" size={60} color="#2C221E" />
              <Text style={styles.vacioTitulo}>Sin notificaciones aún</Text>
              <Text style={styles.vacioSub}>
                Cuando un cuidador de tu grupo administre un medicamento a un residente, recibirás aquí el aviso detallado con la hora y responsable.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const noLeida = !item.leida;
            return (
              <TouchableOpacity
                style={[styles.card, noLeida ? styles.cardNoLeida : styles.cardLeida]}
                onPress={() => marcarComoLeida(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.tituloRow}>
                    <View style={[styles.iconoBox, noLeida && styles.iconoBoxActivo]}>
                      <Ionicons
                        name={noLeida ? 'notifications' : 'checkmark-circle'}
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.cardTitulo}>{item.titulo}</Text>
                      <Text style={styles.cardFecha}>{formatearFecha(item.created_at)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => eliminarNotificacion(item.id)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash" size={20} color="#B71C1C" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardMensaje}>{item.mensaje}</Text>

                {noLeida && (
                  <View style={styles.badgeNuevo}>
                    <Text style={styles.badgeNuevoTexto}>Nueva • Toca para marcar como leída</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: { fontSize: 24, fontWeight: '900', color: '#141414' },
  subtitulo: { fontSize: 15, fontWeight: '600', color: '#2B2B2B', marginTop: 2 },

  btnLeerTodas: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C221E',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  btnLeerTodasTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },

  vacioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#2C221E',
  },
  vacioTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414', marginTop: 12, textAlign: 'center' },
  vacioSub: { fontSize: 16, color: '#2B2B2B', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  cardNoLeida: {
    backgroundColor: '#FFF8E1',
    borderColor: '#E65100',
  },
  cardLeida: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6E5D4F',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tituloRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconoBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6E5D4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoBoxActivo: {
    backgroundColor: '#E65100',
  },
  cardTitulo: { fontSize: 16, fontWeight: '900', color: '#141414' },
  cardFecha: { fontSize: 13, fontWeight: '600', color: '#333333', marginTop: 2 },
  cardMensaje: { fontSize: 16, color: '#141414', lineHeight: 24, fontWeight: '500' },

  badgeNuevo: {
    alignSelf: 'flex-start',
    backgroundColor: '#E65100',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  badgeNuevoTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
});