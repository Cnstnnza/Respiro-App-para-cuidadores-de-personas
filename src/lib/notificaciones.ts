import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

const esExpoGo = Constants.appOwnership === 'expo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function pedirPermisosNotificaciones(): Promise<boolean> {
  try {
    // Crear canal solo cuando sea APK compilado (no dentro de Expo Go)
    if (Platform.OS === 'android' && !esExpoGo) {
      await Notifications.setNotificationChannelAsync('recordatorios-respiro', {
        name: 'Recordatorios de Salud (Respiro)',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permiso de notificaciones',
        'Activa las notificaciones en los ajustes de tu teléfono para recibir alertas de remedios y citas médicas.'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.log('Aviso permisos notificación:', error);
    return false;
  }
}

export async function programarNotificacionMedicamento(
  nombrePaciente: string,
  nombreMed: string,
  dosis: string,
  fechaHora: Date
) {
  try {
    const tienePermiso = await pedirPermisosNotificaciones();
    if (!tienePermiso) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 Hora del remedio de ${nombrePaciente}`,
        body: `Administrar ${nombreMed} (${dosis}).`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: fechaHora.getHours(),
        minute: fechaHora.getMinutes(),
        ...(esExpoGo ? {} : { channelId: 'recordatorios-respiro' }),
      },
    });
  } catch (e) {
    console.log('Aviso alarma medicamento:', e);
  }
}

export async function programarNotificacionCita(
  nombrePaciente: string,
  doctor: string,
  lugar: string,
  fechaCita: Date,
  horaCita: Date
) {
  try {
    const tienePermiso = await pedirPermisosNotificaciones();
    if (!tienePermiso) return;

    const fechaHoraExacta = new Date(
      fechaCita.getFullYear(),
      fechaCita.getMonth(),
      fechaCita.getDate(),
      horaCita.getHours(),
      horaCita.getMinutes(),
      0
    );

    const ahora = new Date();
    const horaTexto = horaCita.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const unDiaAntes = new Date(fechaHoraExacta.getTime() - 24 * 60 * 60 * 1000);
    if (unDiaAntes > ahora) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 Mañana hay hora médica (${nombrePaciente})`,
          body: `Consulta con ${doctor} en ${lugar} a las ${horaTexto} hrs.`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: unDiaAntes,
          ...(esExpoGo ? {} : { channelId: 'recordatorios-respiro' }),
        },
      });
    }

    const unaHoraAntes = new Date(fechaHoraExacta.getTime() - 60 * 60 * 1000);
    if (unaHoraAntes > ahora) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏥 En 1 hora: Cita médica de ${nombrePaciente}`,
          body: `${doctor} en ${lugar} (${horaTexto} hrs). Recuerda llevar carnet y exámenes.`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: unaHoraAntes,
          ...(esExpoGo ? {} : { channelId: 'recordatorios-respiro' }),
        },
      });
    }
  } catch (e) {
    console.log('Aviso alerta cita:', e);
  }
}