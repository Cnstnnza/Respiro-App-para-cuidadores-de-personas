import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function FichaScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [rut, setRut] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [alergias, setAlergias] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [telefonoEmergencia, setTelefonoEmergencia] = useState('');

  function handleGuardar() {
    if (!nombre.trim() || !edad.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa al menos el nombre y la edad del paciente.');
      return;
    }

    Alert.alert('Éxito', 'Ficha clínica guardada correctamente.', [
      { text: 'Aceptar', onPress: () => router.back() },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Ficha del Paciente</Text>
      <Text style={styles.subtitulo}>Información clínica y contactos clave</Text>

      <View style={styles.tarjeta}>
        <Text style={styles.seccionHeader}>Datos Personales</Text>

        <Text style={styles.label}>Nombre Completo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: María Elena Pérez"
          placeholderTextColor="#A0958E"
          value={nombre}
          onChangeText={setNombre}
        />

        <View style={styles.fila}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Edad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 78"
              placeholderTextColor="#A0958E"
              keyboardType="numeric"
              value={edad}
              onChangeText={setEdad}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>RUT</Text>
            <TextInput
              style={styles.input}
              placeholder="12.345.678-9"
              placeholderTextColor="#A0958E"
              value={rut}
              onChangeText={setRut}
            />
          </View>
        </View>

        <Text style={styles.seccionHeader}>Antecedentes Clínicos</Text>

        <Text style={styles.label}>Diagnósticos / Condiciones</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ej: Hipertensión, movilidad reducida, demencia leve"
          placeholderTextColor="#A0958E"
          multiline
          numberOfLines={3}
          value={diagnostico}
          onChangeText={setDiagnostico}
        />

        <Text style={styles.label}>Alergias Conocidas</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Penicilina, mariscos, ninguna"
          placeholderTextColor="#A0958E"
          value={alergias}
          onChangeText={setAlergias}
        />

        <Text style={styles.seccionHeader}>Contacto de Emergencia</Text>

        <Text style={styles.label}>Nombre del Familiar / Tutor</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Juan Pérez (Hijo)"
          placeholderTextColor="#A0958E"
          value={contactoEmergencia}
          onChangeText={setContactoEmergencia}
        />

        <Text style={styles.label}>Teléfono de Emergencia</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 9 8765 4321"
          placeholderTextColor="#A0958E"
          keyboardType="phone-pad"
          value={telefonoEmergencia}
          onChangeText={setTelefonoEmergencia}
        />

        <TouchableOpacity style={styles.botonGuardar} onPress={handleGuardar}>
          <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.textoBoton}>Guardar Ficha</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F7EFE8', flexGrow: 1, paddingBottom: 40 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 14, color: '#8A7A70', marginBottom: 16 },
  tarjeta: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 2 },
  seccionHeader: { fontSize: 16, fontWeight: 'bold', color: '#C59A77', marginTop: 14, marginBottom: 8 },
  fila: { flexDirection: 'row' },
  label: { fontSize: 13, fontWeight: '600', color: '#5C4E45', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  textArea: { height: 70, textAlignVertical: 'top' },
  botonGuardar: { backgroundColor: '#C59A77', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center' },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});