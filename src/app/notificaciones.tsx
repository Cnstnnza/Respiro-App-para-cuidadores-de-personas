import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarYMarcarLeidas();
  }, []);

  const cargarYMarcarLeidas = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setNotificaciones(data);

      await supabase
        .from('notificaciones')
        .update({ leido: true })
        .eq('user_id', user.id)
        .eq('leido', false);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>No tienes notificaciones aún.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.leido && styles.cardNoLeida]}>
              <Text style={styles.mensaje}>{item.mensaje}</Text>
              <Text style={styles.fecha}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8DFD8' },
  cardNoLeida: { backgroundColor: '#FAF6F0', borderColor: '#C59A77' },
  mensaje: { fontSize: 14, color: '#4A3B32', marginBottom: 4 },
  fecha: { fontSize: 12, color: '#8A7A70' },
  empty: { textAlign: 'center', marginTop: 40, color: '#8A7A70', fontSize: 15 }
});