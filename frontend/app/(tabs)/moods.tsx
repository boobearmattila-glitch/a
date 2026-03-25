import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/colors';
import { useAuthStore } from '@/store/authStore';
import api from '@/utils/api';
import { format } from 'date-fns';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

interface MoodEntry {
  id: string;
  user_id: string;
  mood_type: string;
  intensity: number;
  note?: string;
  created_at: string;
}

const moodOptions = [
  { type: 'happy', emoji: '😊', color: '#10B981', label: 'Happy' },
  { type: 'peaceful', emoji: '😌', color: '#40E0D0', label: 'Peaceful' },
  { type: 'excited', emoji: '🤩', color: '#F59E0B', label: 'Excited' },
  { type: 'content', emoji: '😊', color: '#6B46C1', label: 'Content' },
  { type: 'anxious', emoji: '😰', color: '#EF4444', label: 'Anxious' },
  { type: 'sad', emoji: '😢', color: '#3B82F6', label: 'Sad' },
  { type: 'stressed', emoji: '😫', color: '#DC2626', label: 'Stressed' },
  { type: 'angry', emoji: '😠', color: '#991B1B', label: 'Angry' },
];

export default function MoodsScreen() {
  const { user } = useAuthStore();
  const [myMoods, setMyMoods] = useState<MoodEntry[]>([]);
  const [partnerMoods, setPartnerMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedMood, setSelectedMood] = useState('');
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);

  const loadMoods = async () => {
    try {
      const [myMoodsRes, partnerMoodsRes] = await Promise.all([
        api.get('/moods'),
        api.get('/moods/partner'),
      ]);
      setMyMoods(myMoodsRes.data);
      setPartnerMoods(partnerMoodsRes.data);
    } catch (error) {
      console.error('Error loading moods:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMoods();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMoods();
  };

  const handleLogMood = async () => {
    if (!selectedMood) {
      Alert.alert('Select a Mood', 'Please select how you\'re feeling');
      return;
    }

    setLogging(true);
    try {
      await api.post('/moods', {
        mood_type: selectedMood,
        intensity,
        note: note || null,
      });
      Alert.alert('Success', 'Mood logged!');
      setSelectedMood('');
      setIntensity(3);
      setNote('');
      setShowLog(false);
      loadMoods();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to log mood');
    } finally {
      setLogging(false);
    }
  };

  const getMoodEmoji = (moodType: string) => {
    const mood = moodOptions.find(m => m.type === moodType);
    return mood ? mood.emoji : '😊';
  };

  const getMoodColor = (moodType: string) => {
    const mood = moodOptions.find(m => m.type === moodType);
    return mood ? mood.color : Colors.primary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moods</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowLog(!showLog)}
        >
          <Ionicons name={showLog ? 'close' : 'add'} size={28} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      {showLog && (
        <View style={styles.logContainer}>
          <ScrollView>
            <Text style={styles.logTitle}>How are you feeling?</Text>
            <View style={styles.moodGrid}>
              {moodOptions.map((mood) => (
                <TouchableOpacity
                  key={mood.type}
                  style={[
                    styles.moodButton,
                    selectedMood === mood.type && styles.moodButtonActive,
                    { borderColor: mood.color }
                  ]}
                  onPress={() => setSelectedMood(mood.type)}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.intensityLabel}>Intensity: {intensity}/5</Text>
            <View style={styles.intensityContainer}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.intensityButton,
                    intensity >= level && styles.intensityButtonActive
                  ]}
                  onPress={() => setIntensity(level)}
                >
                  <Text style={styles.intensityText}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              placeholder="What's on your mind?"
              multiline
              numberOfLines={3}
            />

            <Button
              title="Log Mood"
              onPress={handleLogMood}
              loading={logging}
            />
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Moods</Text>
          {myMoods.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="happy-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No moods logged yet</Text>
              <Text style={styles.emptySubtext}>Track how you're feeling</Text>
            </View>
          ) : (
            myMoods.slice(0, 10).map((mood) => (
              <View key={mood.id} style={[styles.moodCard, { borderLeftColor: getMoodColor(mood.mood_type) }]}>
                <View style={styles.moodCardHeader}>
                  <Text style={styles.moodCardEmoji}>{getMoodEmoji(mood.mood_type)}</Text>
                  <View style={styles.moodCardInfo}>
                    <Text style={styles.moodCardType}>{mood.mood_type}</Text>
                    <Text style={styles.moodCardDate}>
                      {format(new Date(mood.created_at), 'MMM dd, h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.intensityBadge}>
                    <Text style={styles.intensityBadgeText}>{mood.intensity}/5</Text>
                  </View>
                </View>
                {mood.note && (
                  <Text style={styles.moodCardNote}>{mood.note}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {user?.partner_id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partner's Moods</Text>
            {partnerMoods.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No moods logged yet</Text>
              </View>
            ) : (
              partnerMoods.slice(0, 10).map((mood) => (
                <View key={mood.id} style={[styles.moodCard, { borderLeftColor: getMoodColor(mood.mood_type) }]}>
                  <View style={styles.moodCardHeader}>
                    <Text style={styles.moodCardEmoji}>{getMoodEmoji(mood.mood_type)}</Text>
                    <View style={styles.moodCardInfo}>
                      <Text style={styles.moodCardType}>{mood.mood_type}</Text>
                      <Text style={styles.moodCardDate}>
                        {format(new Date(mood.created_at), 'MMM dd, h:mm a')}
                      </Text>
                    </View>
                    <View style={styles.intensityBadge}>
                      <Text style={styles.intensityBadgeText}>{mood.intensity}/5</Text>
                    </View>
                  </View>
                  {mood.note && (
                    <Text style={styles.moodCardNote}>{mood.note}</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    maxHeight: 500,
  },
  logTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  moodButton: {
    width: '22%',
    aspectRatio: 1,
    margin: '1.5%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonActive: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  intensityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  intensityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  intensityButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  intensityText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  moodCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  moodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodCardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  moodCardInfo: {
    flex: 1,
  },
  moodCardType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  moodCardDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  intensityBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  intensityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  moodCardNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
