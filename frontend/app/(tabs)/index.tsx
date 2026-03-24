import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { useAuthStore } from '../../store/authStore';
import api from '../../utils/api';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [horoscope, setHoroscope] = useState<any>(null);
  const [compatibility, setCompatibility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const horoscopeRes = await api.get('/horoscope/daily');
      setHoroscope(horoscopeRes.data);

      if (user?.partner_id) {
        const compatRes = await api.get('/horoscope/compatibility');
        setCompatibility(compatRes.data);
      }
    } catch (error) {
      console.error('Error loading horoscope:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <Ionicons name="sparkles" size={32} color={Colors.secondary} />
        </View>

        {user?.partner_id && user?.partner_name && (
          <View style={styles.partnerCard}>
            <Ionicons name="heart" size={24} color={Colors.accent} />
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerLabel}>Connected with</Text>
              <Text style={styles.partnerName}>{user.partner_name}</Text>
            </View>
          </View>
        )}

        {!user?.partner_id && (
          <TouchableOpacity 
            style={styles.linkPartnerCard}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="link" size={24} color={Colors.secondary} />
            <View style={styles.linkPartnerInfo}>
              <Text style={styles.linkPartnerTitle}>Link Your Partner</Text>
              <Text style={styles.linkPartnerSubtitle}>Connect to share your journey</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Horoscope</Text>
          <View style={styles.horoscopeCard}>
            <View style={styles.horoscopeHeader}>
              <Ionicons name="moon" size={28} color={Colors.primary} />
              <Text style={styles.zodiacSign}>{horoscope?.sign}</Text>
            </View>
            <Text style={styles.horoscopeText}>{horoscope?.daily_reading}</Text>
          </View>
        </View>

        {compatibility && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compatibility</Text>
            <View style={styles.compatibilityCard}>
              <View style={styles.compatibilityHeader}>
                <Text style={styles.compatibilitySign}>{compatibility.sign1}</Text>
                <Ionicons name="heart" size={24} color={Colors.accent} />
                <Text style={styles.compatibilitySign}>{compatibility.sign2}</Text>
              </View>
              <View style={styles.scoreContainer}>
                <Text style={styles.score}>{compatibility.compatibility_score}</Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <Text style={styles.compatibilityText}>{compatibility.analysis}</Text>
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/journal')}
            >
              <Ionicons name="book" size={32} color={Colors.primary} />
              <Text style={styles.actionTitle}>Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/guide')}
            >
              <Ionicons name="sparkles" size={32} color={Colors.secondary} />
              <Text style={styles.actionTitle}>AI Guide</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/exercises')}
            >
              <Ionicons name="heart" size={32} color={Colors.accent} />
              <Text style={styles.actionTitle}>Exercises</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  partnerInfo: {
    marginLeft: 12,
  },
  partnerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  linkPartnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkPartnerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  linkPartnerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  linkPartnerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  horoscopeCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  horoscopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  zodiacSign: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  horoscopeText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  compatibilityCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  compatibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  compatibilitySign: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  scoreLabel: {
    fontSize: 20,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  compatibilityText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
});
