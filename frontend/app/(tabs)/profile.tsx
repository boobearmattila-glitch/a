import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../utils/colors';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../utils/api';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [showLinkPartner, setShowLinkPartner] = useState(false);
  const [partnerEmail, setPartnerEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLinkPartner = async () => {
    if (!partnerEmail) {
      Alert.alert('Error', 'Please enter your partner\'s email');
      return;
    }

    setLinking(true);
    try {
      const response = await api.post('/profile/link-partner', { partner_email: partnerEmail });
      Alert.alert('Success', response.data.message);
      setPartnerEmail('');
      setShowLinkPartner(false);
      
      // Refresh user data
      const profileRes = await api.get('/profile');
      updateUser(profileRes.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to link partner');
    } finally {
      setLinking(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>Birthday: {user?.birthday}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="moon-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>Zodiac: {user?.zodiac_sign}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partnership</Text>
          
          {user?.partner_id ? (
            <View style={styles.partnerCard}>
              <Ionicons name="heart" size={32} color={Colors.accent} />
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerLabel}>Connected with</Text>
                <Text style={styles.partnerName}>{user.partner_name}</Text>
                <Text style={styles.partnerStatus}>Sharing your journey together</Text>
              </View>
            </View>
          ) : (
            <>
              {!showLinkPartner ? (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => setShowLinkPartner(true)}
                >
                  <Ionicons name="link" size={24} color={Colors.secondary} />
                  <Text style={styles.linkButtonText}>Link Your Partner</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.linkForm}>
                  <Text style={styles.linkFormTitle}>Link Partner</Text>
                  <Text style={styles.linkFormSubtitle}>
                    Enter your partner's email address. They must have an account first.
                  </Text>
                  <Input
                    label="Partner's Email"
                    value={partnerEmail}
                    onChangeText={setPartnerEmail}
                    placeholder="partner@email.com"
                  />
                  <Button
                    title="Link Partner"
                    onPress={handleLinkPartner}
                    loading={linking}
                    variant="secondary"
                  />
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowLinkPartner(false);
                      setPartnerEmail('');
                    }}
                    variant="outline"
                  />
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <Ionicons name="sparkles" size={24} color={Colors.primary} />
              <View style={styles.infoCardText}>
                <Text style={styles.infoCardTitle}>AI Guide</Text>
                <Text style={styles.infoCardDesc}>Powered by Claude AI</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardRow}>
              <Ionicons name="moon" size={24} color={Colors.secondary} />
              <View style={styles.infoCardText}>
                <Text style={styles.infoCardTitle}>Horoscope & Compatibility</Text>
                <Text style={styles.infoCardDesc}>Daily readings and insights</Text>
              </View>
            </View>
          </View>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
        />
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
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
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
  partnerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  partnerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  partnerLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  partnerStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
  },
  linkForm: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
  },
  linkFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  linkFormSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCardText: {
    marginLeft: 16,
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  infoCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
