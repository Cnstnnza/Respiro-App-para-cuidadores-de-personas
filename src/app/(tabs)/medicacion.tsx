import { StyleSheet, Text, View } from 'react-native';

export default function MedicacionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Medicación y Dosis</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 24, paddingTop: 60 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#4A3B32' },
});