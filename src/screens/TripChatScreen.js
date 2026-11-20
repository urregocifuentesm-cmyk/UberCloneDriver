// Code documentation: Application screen and its user interactions.
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from '../config/firestore';
import { db } from '../config/firebase';
import { colors } from '../config/theme';
import { useApp } from '../context/AppContext';

const MAX_MESSAGE_LENGTH = 1000;

function formatTime(value) {
  const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ item, mine }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10, paddingHorizontal: 14 }}>
      <View style={{
        backgroundColor: mine ? colors.accent : colors.card,
        borderColor: mine ? colors.accent : colors.line,
        borderRadius: 18,
        borderWidth: 1,
        maxWidth: '84%',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}>
        {!mine && <Text style={{ color: colors.accentDark, fontSize: 12, fontWeight: '700', marginBottom: 3 }}>{item.senderName || 'Pasajero'}</Text>}
        <Text style={{ color: mine ? '#fff' : colors.ink, fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
        <Text style={{ color: mine ? '#D8F3EA' : colors.muted, fontSize: 10, marginTop: 5, textAlign: 'right' }}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function TripChatScreen({ route }) {
  const { tripId, passengerName } = route.params;
  const { driver } = useApp();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'tripMessages'),
      where('tripId', '==', tripId),
      orderBy('createdAt', 'asc'),
      limit(200),
    );
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((message) => ({ id: message.id, ...message.data() })));
      setLoading(false);
      setError('');
    }, (snapshotError) => {
      console.error('No se pudo cargar el chat del viaje:', snapshotError);
      setLoading(false);
      setError('No se pudo cargar el chat. Revisa tu conexión y las reglas de Firestore.');
    });
  }, [tripId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await setDoc(doc(db, 'tripMessages', id), {
        tripId,
        senderId: driver.id,
        senderRole: 'driver',
        senderName: driver.fullName,
        text: text.slice(0, MAX_MESSAGE_LENGTH),
        createdAt: serverTimestamp(),
      });
      setDraft('');
    } catch (sendError) {
      console.error('No se pudo enviar el mensaje del viaje:', sendError);
      setError('No se pudo enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={{ backgroundColor: colors.paper, flex: 1 }}
    >
      <View style={{ alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', padding: 14 }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 11, width: 44 }}>
          <Ionicons name="person-outline" size={21} color={colors.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }}>{passengerName || 'Pasajero'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Chat privado de este viaje</Text>
        </View>
        <Ionicons name="lock-closed-outline" size={17} color={colors.muted} />
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={{ flexGrow: 1, justifyContent: messages.length ? 'flex-end' : 'center', paddingVertical: 18 }}
          data={messages}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={(
            <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
              <Ionicons name="chatbubbles-outline" size={38} color={colors.accent} />
              <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Inicia la conversación</Text>
              <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 5, textAlign: 'center' }}>Coordina el punto de encuentro o comparte una actualización del viaje.</Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <MessageBubble item={item} mine={item.senderId === driver.id} />}
        />
      )}

      {!!error && <Text style={{ color: colors.danger, paddingHorizontal: 14, paddingTop: 8 }}>{error}</Text>}
      <View style={{ alignItems: 'flex-end', backgroundColor: colors.card, borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', padding: 10 }}>
        <TextInput
          accessibilityLabel="Escribe un mensaje"
          editable={!sending}
          maxLength={MAX_MESSAGE_LENGTH}
          multiline
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.muted}
          style={{ backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 22, borderWidth: 1, color: colors.ink, flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 15, paddingVertical: 10, textAlignVertical: 'center' }}
          value={draft}
        />
        <Pressable
          accessibilityLabel="Enviar mensaje"
          accessibilityRole="button"
          disabled={!draft.trim() || sending}
          hitSlop={6}
          onPress={send}
          style={{ alignItems: 'center', backgroundColor: !draft.trim() || sending ? colors.line : colors.accent, borderRadius: 23, height: 46, justifyContent: 'center', marginLeft: 8, width: 46 }}
        >
          <Ionicons name="send" size={19} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

