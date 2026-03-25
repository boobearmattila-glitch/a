import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/utils/colors';
import { useAuthStore } from '@/store/authStore';
import api from '@/utils/api';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  due_date?: string;
  created_by: string;
  is_shared: boolean;
  created_at: string;
}

export default function TasksScreen() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.partner_id) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleCreateTask = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/tasks', {
        title,
        description: description || null,
        status: 'todo',
        category,
        is_shared: true,
      });
      Alert.alert('Success', 'Task created!');
      setTitle('');
      setDescription('');
      setCategory('personal');
      setShowForm(false);
      loadTasks();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      loadTasks();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tasks/${taskId}`);
              loadTasks();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (!user?.partner_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPartnerContainer}>
          <Ionicons name="link-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.noPartnerText}>Link your partner first</Text>
          <Text style={styles.noPartnerSubtext}>Tasks are shared with your partner</Text>
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
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Task Manager</Text>
            <Text style={styles.headerSubtitle}>Organize your work with style</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addTaskButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={24} color={Colors.text} />
          <Text style={styles.addTaskText}>{showForm ? 'Cancel' : 'Add Task'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <Input
            label="Task Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task..."
          />
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            multiline
            numberOfLines={3}
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
                dropdownIconColor={Colors.textSecondary}
              >
                <Picker.Item label="Personal" value="personal" color={Colors.text} />
                <Picker.Item label="Work" value="work" color={Colors.text} />
                <Picker.Item label="Home" value="home" color={Colors.text} />
                <Picker.Item label="Relationship" value="relationship" color={Colors.text} />
              </Picker>
            </View>
          </View>
          <Button title="Create Task" onPress={handleCreateTask} loading={submitting} variant="secondary" />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.statusSection}>
          <View style={[styles.statusCard, { backgroundColor: '#F3E8FF' }]}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>To Do</Text>
              <View style={styles.statusBadge}>
                <Ionicons name="list" size={20} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.statusCount}>{todoTasks.length}</Text>
          </View>

          <View style={[styles.statusCard, { backgroundColor: '#CCFBF1' }]}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>In Progress</Text>
              <View style={styles.statusBadge}>
                <Ionicons name="time" size={20} color={Colors.secondary} />
              </View>
            </View>
            <Text style={styles.statusCount}>{inProgressTasks.length}</Text>
          </View>

          <View style={[styles.statusCard, { backgroundColor: '#D1FAE5' }]}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Completed</Text>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            </View>
            <Text style={styles.statusCount}>{completedTasks.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TO DO</Text>
          {todoTasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks</Text>
          ) : (
            todoTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IN PROGRESS</Text>
          {inProgressTasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks</Text>
          ) : (
            inProgressTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMPLETED</Text>
          {completedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No completed tasks</Text>
          ) : (
            completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const TaskCard = ({ task, onUpdateStatus, onDelete }: { task: Task; onUpdateStatus: (id: string, status: string) => void; onDelete: (id: string) => void }) => {
  const getNextStatus = () => {
    if (task.status === 'todo') return 'in_progress';
    if (task.status === 'in_progress') return 'completed';
    return 'todo';
  };

  const getStatusIcon = () => {
    if (task.status === 'todo') return 'play';
    if (task.status === 'in_progress') return 'checkmark';
    return 'refresh';
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}
          <View style={styles.taskMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(task.category) }]}>
              <Text style={styles.categoryText}>{task.category}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onUpdateStatus(task.id, getNextStatus())}
        >
          <Ionicons name={getStatusIcon()} size={20} color={Colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(task.id)}
        >
          <Ionicons name="trash" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getCategoryColor = (category: string) => {
  const colors: any = {
    work: '#3B82F6',
    personal: '#8B5CF6',
    home: '#10B981',
    relationship: '#EC4899',
  };
  return colors[category] || '#6B7280';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    marginTop: -16,
    marginBottom: 16,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addTaskText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  picker: {
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textMuted,
    marginBottom: 12,
    letterSpacing: 1,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  taskCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskHeader: {
    flex: 1,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  taskActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
});
