// Code documentation: Application screen and its user interactions.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { doc, onSnapshot, serverTimestamp, updateDoc } from '../config/firestore';
import { db } from '../config/firebase';
import { colors } from '../config/theme';
import { Button, Card, s } from '../components/ui';

const ratings = ['Muy mala', 'Mala', 'Regular', 'Muy buena', 'Excelente'];
const feedbackOptions = ['Amable', 'Puntual', 'Buen trato', 'Buena comunicación', 'Todo bien'];

export default function TripRatingScreen({ route, navigation }) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => onSnapshot(
    doc(db, 'trips', tripId),
    (snapshot) => {
      if (!snapshot.exists()) {
        setError('No encontramos este viaje para guardar la calificación.');
        return;
      }
      const data = snapshot.data();
      setTrip(data);
      if (data.rating) setRating(data.rating);
    },
    (snapshotError) => {
      console.error('No se pudo cargar el viaje para calificarlo:', snapshotError);
      setError('No se pudo cargar el viaje. Revisa la conexión e inténtalo de nuevo.');
    },
  ), [tripId]);

  const toggleFeedback = (item) => {
    setFeedback((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item]);
  };

  const submitRating = async () => {
    if (!rating || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'trips', tripId), {
        rating,
        ratingFeedback: feedback,
        ratingComment: comment.trim(),
        ratedAt: serverTimestamp(),
      });
      navigation.replace('PaymentSummary', { tripId });
    } catch (saveError) {
      console.error('No se pudo guardar la calificación:', saveError);
      setError('No se pudo guardar la calificación. Inténtalo otra vez.');
      setSaving(false);
    }
  };

  if (!trip) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        {error ? <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text> : <ActivityIndicator color={colors.accent} />}
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
      <View style={{ alignItems: 'center', marginBottom: 14, marginTop: 8 }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 30, height: 56, justifyContent: 'center', marginBottom: 12, width: 56 }}>
          <Text style={{ color: colors.accent, fontSize: 28, fontWeight: '800' }}>✓</Text>
        </View>
        <Text style={{ color: colors.accentDark, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}>
          VIAJE COMPLETADO
        </Text>
      </View>

      <Text style={[s.h1, { fontSize: 25, lineHeight: 32, textAlign: 'center' }]}>
        ¿Cómo fue tu viaje con {trip.passengerName || 'el pasajero'}?
      </Text>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12, textAlign: 'center' }}>
        Tu opinión ayuda a que cada viaje en Rumbora sea mejor.
      </Text>

      <Card style={{ alignItems: 'center', paddingBottom: 22, paddingTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {ratings.map((_, index) => {
            const value = index + 1;
            const selected = value <= rating;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Calificar ${value} estrellas`}
                accessibilityState={{ selected: rating === value }}
                onPress={() => setRating(value)}
                style={{ paddingHorizontal: 5, paddingVertical: 2 }}
              >
                <Text style={{ color: selected ? colors.gold : '#C7D1D8', fontSize: 42, lineHeight: 50 }}>★</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: rating ? colors.ink : colors.muted, fontSize: 16, fontWeight: '700', marginTop: 8 }}>
          {rating ? ratings[rating - 1] : 'Toca una estrella para calificar'}
        </Text>
      </Card>

      <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 12 }}>
        ¿Qué salió bien? <Text style={{ color: colors.muted, fontWeight: '400' }}>Opcional</Text>
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {feedbackOptions.map((item) => {
          const selected = feedback.includes(item);
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => toggleFeedback(item)}
              style={{
                backgroundColor: selected ? colors.accentSoft : colors.card,
                borderColor: selected ? colors.accent : colors.line,
                borderRadius: 18,
                borderWidth: 1,
                marginBottom: 8,
                marginRight: 8,
                paddingHorizontal: 13,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: selected ? colors.accentDark : colors.ink, fontSize: 13, fontWeight: '600' }}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        accessibilityLabel="Comentario opcional"
        maxLength={250}
        multiline
        onChangeText={setComment}
        placeholder="Deja un comentario (opcional)"
        placeholderTextColor={colors.muted}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.line,
          borderRadius: 14,
          borderWidth: 1,
          color: colors.ink,
          minHeight: 88,
          padding: 14,
          textAlignVertical: 'top',
        }}
        value={comment}
      />
      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 5, textAlign: 'right' }}>{comment.length}/250</Text>
      {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}
      <Button
        disabled={!rating || saving}
        onPress={submitRating}
        style={{ marginTop: 14 }}
        title={saving ? 'Guardando…' : 'Enviar calificación'}
      />
    </ScrollView>
  );
}

