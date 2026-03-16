import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { FinnaSearchResult } from '../api/finna';
import { ChatMessage } from '../api/gemini';
import BookAIChat from '../components/BookAIChat';
import { colors } from '../theme';

type AskAIBookRouteParams = {
  AskAIBook: {
    book: FinnaSearchResult;
    initialConversation?: ChatMessage[];
  };
};

export default function AskAIBookScreen() {
  const route = useRoute<RouteProp<AskAIBookRouteParams, 'AskAIBook'>>();
  const { book, initialConversation } = route.params;

  return (
    <View style={styles.container}>
      <BookAIChat book={book} initialConversation={initialConversation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

