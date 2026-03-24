import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../utils/api';

export default function GuideScreen() {
  const [selectedType, setSelectedType] = useState<'meditation' | 'advice'>('meditation');
  const [input, setInput] = useState('');
  const [mood, setMood] = useState('');
  const [situation, setSituation] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMeditation = async () => {
    if (!input && !mood) {
      Alert.alert('Info', 'Please share your mood or what\'s on your mind');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/ai/meditation', {
        context: input || null,
        mood: mood || null,
      });
      setResponse(res.data.guidance);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to get guidance');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvice = async () => {
    if (!situation) {
      Alert.alert('Info', 'Please describe your situation');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/ai/advice', {
        situation,
        context: input || null,
      });
      setResponse(res.data.advice);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to get advice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Guide</Text>
        <Ionicons name="sparkles" size={28} color={Colors.secondary} />
      </View>

      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, selectedType === 'meditation' && styles.typeButtonActive]}
          onPress={() => {
            setSelectedType('meditation');
            setResponse('');
          }}
        >
          <Ionicons name="moon" size={20} color={selectedType === 'meditation' ? Colors.text : Colors.textMuted} />
          <Text style={[styles.typeButtonText, selectedType === 'meditation' && styles.typeButtonTextActive]}>
            Meditation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, selectedType === 'advice' && styles.typeButtonActive]}
          onPress={() => {
            setSelectedType('advice');
            setResponse('');
          }}
        >
          <Ionicons name="heart" size={20} color={selectedType === 'advice' ? Colors.text : Colors.textMuted} />
          <Text style={[styles.typeButtonText, selectedType === 'advice' && styles.typeButtonTextActive]}>
            Relationship Advice
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedType === 'meditation' ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Meditation & Spiritual Guidance</Text>
            <Text style={styles.formSubtitle}>Share what's on your mind for personalized guidance</Text>
            <Input
              label="How are you feeling?"
              value={mood}
              onChangeText={setMood}
              placeholder="Anxious, peaceful, confused..."
            />
            <Input
              label="What's on your mind? (optional)"
              value={input}
              onChangeText={setInput}
              placeholder="Share any thoughts or concerns..."
              multiline
              numberOfLines={4}
            />
            <Button
              title="Get Guidance"
              onPress={handleMeditation}
              loading={loading}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.formTitle}>Relationship Advice</Text>
            <Text style={styles.formSubtitle}>Get thoughtful guidance for your relationship</Text>
            <Input
              label="Describe your situation"
              value={situation}
              onChangeText={setSituation}
              placeholder="What would you like advice about?"
              multiline
              numberOfLines={4}
            />
            <Input
              label="Additional context (optional)"
              value={input}
              onChangeText={setInput}
              placeholder="Any other details to share..."
              multiline
              numberOfLines={3}
            />
            <Button
              title="Get Advice"
              onPress={handleAdvice}
              loading={loading}
            />
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Getting guidance from AI...</Text>
          </View>
        )}

        {response && !loading && (
          <View style={styles.responseCard}>
            <View style={styles.responseHeader}>
              <Ionicons name="sparkles" size={24} color={Colors.secondary} />
              <Text style={styles.responseTitle}>Your Guidance</Text>
            </View>
            <Text style={styles.responseText}>{response}</Text>
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
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  form: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
  },
  responseCard: {
    backgroundColor: Colors.surfaceLight,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  responseText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});