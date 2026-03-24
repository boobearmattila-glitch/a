import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';

interface Challenge {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Exercise {
  id: string;
  exercise_type: string;
  question: string;
  user_responses: { [key: string]: string };
  created_at: string;
}

export default function ExercisesScreen() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<'exercises' | 'challenges'>('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New exercise form
  const [exerciseType, setExerciseType] = useState('communication');
  const [creatingExercise, setCreatingExercise] = useState(false);
  
  // New challenge form
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const loadData = async () => {
    try {
      const [exercisesRes, challengesRes] = await Promise.all([
        api.get('/exercises'),
        api.get('/challenges'),
      ]);
      setExercises(exercisesRes.data);
      setChallenges(challengesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.partner_id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateExercise = async () => {
    setCreatingExercise(true);
    try {
      await api.post('/exercises', { exercise_type: exerciseType });
      Alert.alert('Success', 'New exercise created!');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create exercise');
    } finally {
      setCreatingExercise(false);
    }
  };

  const handleRespondToExercise = async (exerciseId: string, response: string) => {
    if (!response.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      await api.post('/exercises/respond', { exercise_id: exerciseId, response });
      Alert.alert('Success', 'Response saved!');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save response');
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle || !challengeDesc) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setCreatingChallenge(true);
    try {
      await api.post('/challenges', {
        title: challengeTitle,
        description: challengeDesc,
        status: 'active',
      });
      Alert.alert('Success', 'Challenge created!');
      setChallengeTitle('');
      setChallengeDesc('');
      setShowChallengeForm(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create challenge');
    } finally {
      setCreatingChallenge(false);
    }
  };

  if (!user?.partner_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPartnerContainer}>
          <Ionicons name="link-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.noPartnerText}>Link your partner first</Text>
          <Text style={styles.noPartnerSubtext}>Exercises and challenges are shared with your partner</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Together</Text>
        <Ionicons name="heart" size={28} color={Colors.accent} />
      </View>

      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'exercises' && styles.tabActive]}
          onPress={() => setSelectedTab('exercises')}
        >
          <Text style={[styles.tabText, selectedTab === 'exercises' && styles.tabTextActive]}>
            Exercises
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'challenges' && styles.tabActive]}
          onPress={() => setSelectedTab('challenges')}
        >
          <Text style={[styles.tabText, selectedTab === 'challenges' && styles.tabTextActive]}>
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {selectedTab === 'exercises' ? (
          <>
            <View style={styles.createSection}>
              <Text style={styles.sectionTitle}>Create New Exercise</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={exerciseType}
                  onValueChange={setExerciseType}
                  style={styles.picker}
                  dropdownIconColor={Colors.textSecondary}
                >
                  <Picker.Item label="Communication" value="communication" color={Colors.text} />
                  <Picker.Item label="Boundary Setting" value="boundary" color={Colors.text} />
                  <Picker.Item label="Gratitude" value="gratitude" color={Colors.text} />
                </Picker>
              </View>
              <Button
                title="Generate Exercise"
                onPress={handleCreateExercise}
                loading={creatingExercise}
                variant="secondary"
              />
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No exercises yet</Text>
                <Text style={styles.emptySubtext}>Create one to get started!</Text>
              </View>
            ) : (
              exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  userId={user.id}
                  onRespond={handleRespondToExercise}
                />
              ))
            )}
          </>
        ) : (
          <>
            {!showChallengeForm ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowChallengeForm(true)}
              >
                <Ionicons name="add-circle" size={24} color={Colors.secondary} />
                <Text style={styles.addButtonText}>Add New Challenge</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.challengeForm}>
                <Input
                  label="Challenge Title"
                  value={challengeTitle}
                  onChangeText={setChallengeTitle}
                  placeholder="e.g., Better communication"
                />
                <Input
                  label="Description"
                  value={challengeDesc}
                  onChangeText={setChallengeDesc}
                  placeholder="Describe the challenge..."
                  multiline
                  numberOfLines={3}
                />
                <Button
                  title="Create Challenge"
                  onPress={handleCreateChallenge}
                  loading={creatingChallenge}
                />
                <Button
                  title="Cancel"
                  onPress={() => setShowChallengeForm(false)}
                  variant="outline"
                />
              </View>
            )}

            {challenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No challenges yet</Text>
                <Text style={styles.emptySubtext}>Track obstacles you're working through together</Text>
              </View>
            ) : (
              challenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeCard}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDesc}>{challenge.description}</Text>
                  <View style={styles.challengeFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: challenge.status === 'resolved' ? Colors.success : Colors.warning }]}>
                      <Text style={styles.statusText}>{challenge.status}</Text>
                    </View>
                    <Text style={styles.challengeDate}>{format(new Date(challenge.created_at), 'MMM dd, yyyy')}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ExerciseCard = ({ exercise, userId, onRespond }: { exercise: Exercise; userId: string; onRespond: (id: string, response: string) => void }) => {
  const [response, setResponse] = useState('');
  const [showInput, setShowInput] = useState(false);
  const userResponded = exercise.user_responses[userId];

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.exerciseType}>{exercise.exercise_type}</Text>
      <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
      
      {userResponded ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Your response:</Text>
          <Text style={styles.responseText}>{userResponded}</Text>
        </View>
      ) : (
        <>
          {!showInput ? (
            <TouchableOpacity
              style={styles.respondButton}
              onPress={() => setShowInput(true)}
            >
              <Text style={styles.respondButtonText}>Respond</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Input
                value={response}
                onChangeText={setResponse}
                placeholder="Your response..."
                multiline
                numberOfLines={3}
              />
              <Button
                title="Save Response"
                onPress={() => {
                  onRespond(exercise.id, response);
                  setResponse('');
                  setShowInput(false);
                }}
              />
            </View>
          )}
        </>
      )}

      {Object.keys(exercise.user_responses).length > 1 && (
        <View style={styles.partnerResponseContainer}>
          <Text style={styles.partnerResponseLabel}>Partner's response:</Text>
          {Object.entries(exercise.user_responses)
            .filter(([id]) => id !== userId)
            .map(([id, resp]) => (
              <Text key={id} style={styles.partnerResponseText}>{resp}</Text>
            ))}
        </View>
      )}
    </View>
  );
};

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
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  tabActive: {
    borderBottomColor: Colors.secondary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.secondary,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  noPartnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noPartnerText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  noPartnerSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  createSection: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  picker: {
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  exerciseType: {
    fontSize: 12,
    color: Colors.secondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  exerciseQuestion: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 16,
  },
  respondButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  respondButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  responseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
  },
  responseLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  partnerResponseContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
  partnerResponseLabel: {
    fontSize: 12,
    color: Colors.accent,
    marginBottom: 4,
  },
  partnerResponseText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  challengeForm: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  challengeCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  challengeDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  challengeDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});