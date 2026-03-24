import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string;
  is_shared: boolean;
  created_at: string;
}

export default function JournalScreen() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadEntries = async () => {
    try {
      const response = await api.get('/journal');
      setEntries(response.data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/journal', {
        title,
        content,
        mood: mood || null,
        is_shared: isShared,
      });
      Alert.alert('Success', 'Journal entry created!');
      setTitle('');
      setContent('');
      setMood('');
      setIsShared(false);
      setShowForm(false);
      loadEntries();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create entry');
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={28} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <ScrollView>
            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Entry title..."
            />
            <Input
              label="Content"
              value={content}
              onChangeText={setContent}
              placeholder="Write your thoughts..."
              multiline
              numberOfLines={6}
            />
            <Input
              label="Mood (optional)"
              value={mood}
              onChangeText={setMood}
              placeholder="How are you feeling?"
            />
            <TouchableOpacity
              style={styles.shareToggle}
              onPress={() => setIsShared(!isShared)}
            >
              <Ionicons
                name={isShared ? 'checkbox' : 'square-outline'}
                size={24}
                color={isShared ? Colors.secondary : Colors.textMuted}
              />
              <Text style={styles.shareLabel}>Share with partner</Text>
            </TouchableOpacity>
            <Button title="Save Entry" onPress={handleSubmit} loading={submitting} />
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <Text style={styles.emptySubtext}>Start writing your thoughts</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryHeaderLeft}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  {entry.mood && (
                    <Text style={styles.entryMood}>{entry.mood}</Text>
                  )}
                </View>
                {entry.user_id !== user?.id && (
                  <Ionicons name="heart" size={20} color={Colors.accent} />
                )}
                {entry.is_shared && entry.user_id === user?.id && (
                  <Ionicons name="people" size={20} color={Colors.secondary} />
                )}
              </View>
              <Text style={styles.entryContent} numberOfLines={3}>
                {entry.content}
              </Text>
              <Text style={styles.entryDate}>
                {format(new Date(entry.created_at), 'MMM dd, yyyy')}
              </Text>
            </View>
          ))
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
  formContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    maxHeight: 400,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareLabel: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryHeaderLeft: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  entryMood: {
    fontSize: 14,
    color: Colors.secondary,
  },
  entryContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
