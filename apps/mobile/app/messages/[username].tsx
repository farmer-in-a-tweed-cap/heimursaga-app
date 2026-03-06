import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { MessageBubble } from '@/components/ui/MessageBubble';
import { messagesApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Message } from '@/types/api';

export default function MessageDetailScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();
  const [text, setText] = useState('');

  const { data: messages, loading, refetch } = useApi<Message[]>(
    ready && username ? `/messages/conversations/${username}` : null,
  );

  const handleSend = useCallback(async () => {
    if (!text.trim() || !username) return;
    try {
      await messagesApi.send(username, text.trim());
      setText('');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send message');
    }
  }, [text, username, refetch]);

  const reversedMessages = useMemo(() => [...(messages ?? [])].reverse(), [messages]);

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title={username ?? ''} />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title={username ?? ''} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          inverted
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <MessageBubble
              text={item.content ?? item.body ?? ''}
              time={formatTime(item.createdAt ?? item.created_at ?? '')}
              isMe={(item.senderUsername ?? item.sender_username) === user?.username}
            />
          )}
        />

        <View style={styles.inputBarWrap}>
          <HCard style={{ marginBottom: 0 }}>
            <View style={styles.inputBar}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Write message..."
                placeholderTextColor={colors.textTertiary}
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                <Text style={styles.sendText}>SEND</Text>
              </TouchableOpacity>
            </View>
          </HCard>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loader: { flex: 1 },
  messageList: {
    padding: 16,
  },
  inputBarWrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inputBar: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: borders.thick,
    borderRightWidth: 0,
    fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: brandColors.copper,
    borderWidth: borders.thick,
    borderColor: brandColors.copper,
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
