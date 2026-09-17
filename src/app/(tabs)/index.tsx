import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.cabecera}>
        <View>
          <Text style={styles.saludo}>Hola de nuevo 👋</Text>
          <Text style={styles.subtitulo}>Panel de Cuidados</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/perfil')} style={styles.botonPerfil}>
          <Ionicons name="person-circle-outline" size={38} color="#C59A77" />
        </TouchableOpacity>
      </View>

      <Text style={styles.seccionTitulo}>Accesos Rápidos</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/ficha')}>
        <Ionicons name="document-text-outline" size={24} color="#C59A77" />
        <View style={styles.cardTexto}>
          <Text style={styles.cardTitulo}>Ficha del Paciente</Text>
          <Text style={styles.cardSub}>Registrar o editar datos clínicos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/horas_medicas')}>
        <Ionicons name="calendar-outline" size={24} color="#C59A77" />
        <View style={styles.cardTexto}>
          <Text style={styles.cardTitulo}>Horas Médicas</Text>
          <Text style={styles.cardSub}>Ver próximas citas y controles</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#F7EFE8', padding: 24, paddingTop: 60 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  saludo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 15, color: '#8A7A70' },
  botonPerfil: { padding: 4 },
  seccionTitulo: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32', marginBottom: 14 },
  card: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTexto: { marginLeft: 14 },
  cardTitulo: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32' },
  cardSub: { fontSize: 13, color: '#8A7A70', marginTop: 2 },
});