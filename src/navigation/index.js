// Code documentation: Application navigation stacks and authenticated drawer routes.
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useApp } from '../context/AppContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import EarningsScreen from '../screens/EarningsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import IncomingRequestScreen from '../screens/IncomingRequestScreen';
import TripScreen from '../screens/TripScreen';
import PaymentSummaryScreen from '../screens/PaymentSummaryScreen';
import TripDetailScreen from '../screens/TripDetailScreen';
import TripRatingScreen from '../screens/TripRatingScreen';
import TripChatScreen from '../screens/TripChatScreen';
import TripCallScreen from '../screens/TripCallScreen';
import { colors } from '../config/theme';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const drawerIcon = (name) => ({ color, size }) => <Ionicons name={name} color={color} size={size} />;

function MainDrawer() {
  const { t } = useApp();
  return (
    <Drawer.Navigator screenOptions={{
      drawerActiveTintColor: colors.accent,
      drawerActiveBackgroundColor: colors.accentSoft,
      drawerLabelStyle: { fontWeight: '600' },
      headerStyle: { backgroundColor: colors.ink },
      headerTintColor: '#fff',
      sceneStyle: { backgroundColor: colors.paper },
    }}>
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: t('home'), drawerIcon: drawerIcon('map-outline') }} />
      <Drawer.Screen name="Earnings" component={EarningsScreen} options={{ title: t('earnings'), drawerIcon: drawerIcon('wallet-outline') }} />
      <Drawer.Screen name="History" component={HistoryScreen} options={{ title: t('history'), drawerIcon: drawerIcon('receipt-outline') }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile'), drawerIcon: drawerIcon('person-circle-outline') }} />
    </Drawer.Navigator>
  );
}

export default function Navigation() {
  const { user, driver, authReady, connectionError } = useApp();
  if (connectionError) {
    return (
      <View style={{ backgroundColor: '#F5F6F8', flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#1B2430', fontSize: 22, fontWeight: '700', marginBottom: 8 }}>Conexión interrumpida</Text>
        <Text style={{ color: '#6B7684', fontSize: 15, lineHeight: 23 }}>{connectionError}</Text>
      </View>
    );
  }
  if (!authReady || (user && driver === undefined)) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: colors.paper },
      }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : !driver ? (
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro de conductor' }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
            <Stack.Screen name="IncomingRequest" component={IncomingRequestScreen} options={{ title: 'Nueva solicitud', presentation: 'modal', gestureEnabled: false }} />
            <Stack.Screen name="Trip" component={TripScreen} options={{ title: 'Viaje en curso', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="TripChat" component={TripChatScreen} options={{ title: 'Chat del viaje' }} />
            <Stack.Screen name="TripCall" component={TripCallScreen} options={{ title: 'Llamada de voz', presentation: 'modal', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="TripRating" component={TripRatingScreen} options={{ title: 'Califica tu viaje', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="PaymentSummary" component={PaymentSummaryScreen} options={{ title: 'Cobro', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Detalle del viaje' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

