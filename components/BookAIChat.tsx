import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Keyboard, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { FinnaSearchResult } from '../api/finna';
import { chatAboutBook, chatGeneralBookChat, ChatMessage, BookChatMode } from '../api/gemini';
import { useAuth } from '../context/AuthContext';
import { useBooksContext } from '../context/BooksContext';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { FormatBadge } from './FormatBadge';
import { colors, loaderColor, typography, touchTargetMin } from '../theme';
import { deleteAIChat } from '../firebase/aiChats';
import { SafeAreaView } from 'react-native-safe-area-context';

const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: typography.fontFamilyBody,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontFamily: typography.fontFamilyDisplay, color: colors.textPrimary },
  em: { fontStyle: 'italic', fontFamily: typography.fontFamilyBody, color: colors.textPrimary },
  text: { fontFamily: typography.fontFamilyBody, color: colors.textPrimary },
  bullet_list: { marginBottom: 8 },
  bullet_list_icon: { fontFamily: typography.fontFamilyBody, color: colors.primary, marginLeft: 2, marginRight: 8, fontSize: 14 },
  bullet_list_content: {},
  ordered_list: { marginBottom: 8 },
  ordered_list_icon: { fontFamily: typography.fontFamilyBody, color: colors.primary, marginLeft: 2, marginRight: 8, fontSize: 14 },
  list_item: { marginBottom: 6 },
  heading1: { fontSize: 17, fontFamily: typography.fontFamilyDisplay, color: colors.textPrimary, marginBottom: 6, marginTop: 4 },
  heading2: { fontSize: 16, fontFamily: typography.fontFamilyDisplay, color: colors.textPrimary, marginBottom: 4, marginTop: 2 },
  heading3: { fontSize: 15, fontFamily: typography.fontFamilyBody, fontWeight: '600', color: colors.textPrimary, marginBottom: 4, marginTop: 2 },
  blockquote: {
    backgroundColor: colors.surfaceVariant,
    borderLeftColor: colors.border,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    borderRadius: 4,
  },
  code_inline: {
    fontFamily: typography.fontFamilyBody,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
    color: colors.textPrimary,
  },
});

/** Markdown styles for user (sent) bubbles: light text on primary background. */
const markdownStylesUser = StyleSheet.create({
  body: {
    fontFamily: typography.fontFamilyBody,
    color: colors.white,
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontFamily: typography.fontFamilyDisplay, color: colors.white },
  em: { fontStyle: 'italic', fontFamily: typography.fontFamilyBody, color: colors.white },
  text: { fontFamily: typography.fontFamilyBody, color: colors.white },
  bullet_list: { marginBottom: 8 },
  bullet_list_icon: { fontFamily: typography.fontFamilyBody, color: colors.textLightOpacity, marginLeft: 2, marginRight: 8, fontSize: 14 },
  bullet_list_content: {},
  ordered_list: { marginBottom: 8 },
  ordered_list_icon: { fontFamily: typography.fontFamilyBody, color: colors.textLightOpacity, marginLeft: 2, marginRight: 8, fontSize: 14 },
  list_item: { marginBottom: 6 },
  heading1: { fontSize: 17, fontFamily: typography.fontFamilyDisplay, color: colors.white, marginBottom: 6, marginTop: 4 },
  heading2: { fontSize: 16, fontFamily: typography.fontFamilyDisplay, color: colors.white, marginBottom: 4, marginTop: 2 },
  heading3: { fontSize: 15, fontFamily: typography.fontFamilyBody, fontWeight: '600', color: colors.white, marginBottom: 4, marginTop: 2 },
  blockquote: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: colors.textLightOpacity,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    borderRadius: 4,
  },
  code_inline: {
    fontFamily: typography.fontFamilyBody,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
    color: colors.white,
  },
});

const MODES: { key: BookChatMode; label: string; icon: string }[] = [
  { key: 'description', label: 'Kuvaus', icon: 'text-box-outline' },
  { key: 'goodfit', label: 'Sopiiko minulle?', icon: 'account-check-outline' },
  { key: 'custom', label: 'Oma kysymys', icon: 'message-question-outline' },
];

interface BookAIChatProps {
  book: FinnaSearchResult;
  initialConversation?: ChatMessage[];
}

export const BookAIChat: React.FC<BookAIChatProps> = ({ book, initialConversation = [] }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { readBooks } = useBooksContext();
  const [mode, setMode] = useState<BookChatMode>('description');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPresetSheetVisible, setIsPresetSheetVisible] = useState(false);
  /** On follow-up turns, show the in-composer preset pill only after user picks from + menu. */
  const [followUpPresetPill, setFollowUpPresetPill] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  useEffect(() => {
    // Seed initial conversation only once (or when there is no local history yet)
    if (conversation.length === 0 && initialConversation && initialConversation.length > 0) {
      setConversation(initialConversation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversation, conversation.length]);

  const isGeneralChat = book?.id != null && book.id.startsWith('general');
  const canDeleteConversation = Boolean(user?.uid && book?.id && conversation.length > 0);
  const readBooksTitles = readBooks.map(b => `${b.title} by ${(b.authors || []).join(', ')}`);
  const isFirstTurn = conversation.length === 0;
  const canSendFirst = isFirstTurn && (mode !== 'custom' || userQuestion.trim().length > 0);
  const canSendFollowUp = !isFirstTurn && (userQuestion.trim().length > 0 || mode !== 'custom');
  const canSendGeneral = userQuestion.trim().length > 0;
  const canSend = isGeneralChat ? canSendGeneral : (canSendFirst || canSendFollowUp);

  const handleAsk = async () => {
    if (!book || !canSend) return;
    setLoading(true);
    setError(null);
    const currentQuestion = userQuestion.trim();
    if (!isFirstTurn && !isGeneralChat) setUserQuestion('');

    try {
      if (isGeneralChat) {
        const { response, newHistory } = await chatGeneralBookChat(currentQuestion, conversation, readBooksTitles);
        const history = Array.isArray(newHistory) ? newHistory : [];
        setConversation(history);
        setUserQuestion('');
        setFollowUpPresetPill(false);
        if (user) {
          const { incrementAIUsage } = await import('../firebase/aiUsage');
          incrementAIUsage(user.uid, 'chat').catch(() => {});
          const { saveAIChat } = await import('../firebase/aiChats');
          const firstUserMsg = history.find(m => m?.role === 'user');
          const rawTitle = firstUserMsg ? String(firstUserMsg.displayText ?? firstUserMsg.text ?? '').trim() : '';
          const conversationTitle = rawTitle.length > 0 ? rawTitle.slice(0, 50) : undefined;
          try {
            await saveAIChat(user.uid, book.id, { id: book.id, title: 'Yleinen keskustelu', authors: [] }, history, conversationTitle);
          } catch (err) {
            console.warn('Failed to save AI chat:', err);
          }
        }
      } else {
        if (isFirstTurn) setUserQuestion('');
        const authors = Array.isArray(book.authors) ? book.authors : (book.authors ? [String(book.authors)] : []);
        const modeConfig = MODES.find(m => m.key === mode);
        const isPresetOnly = mode !== 'custom' && currentQuestion.length === 0;
        const hasAdditionalInput = currentQuestion.length > 0;
        const displayLabel = mode !== 'custom' && !hasAdditionalInput ? modeConfig?.label : undefined;
        const displayIcon = mode !== 'custom' && !hasAdditionalInput ? modeConfig?.icon : undefined;
        const displayText = hasAdditionalInput ? currentQuestion : undefined;

        const { response, newHistory } = await chatAboutBook(
          { title: book.title, authors },
          {
            mode,
            readBooksTitles: mode === 'goodfit' ? readBooksTitles : undefined,
            userMessage: isFirstTurn
              ? (mode === 'custom' ? currentQuestion : undefined)
              : (isPresetOnly ? undefined : currentQuestion),
            displayLabel,
            displayIcon,
            displayText,
          },
          conversation
        );
        setConversation(newHistory);
        setUserQuestion('');
        setFollowUpPresetPill(false);
        if (user) {
          const { incrementAIUsage } = await import('../firebase/aiUsage');
          incrementAIUsage(user.uid, 'chat').catch(() => {});
          if (book.id) {
            const { saveAIChat } = await import('../firebase/aiChats');
            const authorsArr = Array.isArray(book.authors) ? book.authors : (book.authors ? [String(book.authors)] : []);
            try {
              await saveAIChat(user.uid, book.id, { id: book.id, title: book.title, authors: authorsArr, images: book.images }, newHistory);
            } catch (err) {
              console.warn('Failed to save AI chat:', err);
            }
          } else {
            console.warn('AI chat not saved: book.id is missing', { title: book.title });
          }
        }
      }
    } catch (e) {
      setError('Vastaus epäonnistui. Tarkista verkko ja kokeile uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!user?.uid || !book?.id) return;
    setIsDeletingConversation(true);
    setError(null);
    try {
      await deleteAIChat(user.uid, book.id);
      setIsDeleteModalVisible(false);
      navigation.goBack();
    } catch (deleteError) {
      console.warn('Failed to delete AI chat:', deleteError);
      setError('Keskustelun poisto epäonnistui. Yritä uudelleen.');
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const authors = Array.isArray(book.authors) ? book.authors : (book.authors ? [String(book.authors)] : []);
  const authorsStr = authors.length ? authors.join(', ') : ((book as { authorName?: string }).authorName || '');
  const format = ((book as FinnaSearchResult).absProgress ? 'audiobook' : ((book as { format?: string }).format || 'book')) as 'book' | 'audiobook' | 'ebook';
  const coverUrl = book.images?.[0]?.url;

  const isFirstTurnLocal = conversation.length === 0;
  const showFullModes = !isGeneralChat && isFirstTurnLocal;
  const showPresetPlus = !isGeneralChat;
  const activeModeConfig = MODES.find((m) => m.key === mode);
  const showPresetPill =
    showPresetPlus &&
    mode !== 'custom' &&
    (isFirstTurnLocal || followUpPresetPill);
  const inputPlaceholder = isGeneralChat
    ? 'Kysy suosituksia tai kirjakysymyksiä...'
    : (isFirstTurnLocal
      ? (mode === 'custom' ? 'Kirjoita kysymyksesi kirjasta...' : 'Voit kirjoittaa lisäkysymyksen (valinnainen)')
      : 'Kysy AI:lta');

  const renderHeader = () => (
    <View style={styles.header}>
      {isGeneralChat ? (
        <>
          <View style={styles.headerImageContainer}>
            <View style={[styles.coverImageWrapper, styles.headerIconWrapper]}>
              <MaterialCommunityIcons name="message-text-outline" size={40} color={colors.primary} />
            </View>
          </View>
          <View style={styles.headerTextContent}>
            <Text style={styles.title} numberOfLines={2}>Yleinen AI-keskustelu</Text>
            <Text style={styles.author} numberOfLines={1}>Kysy lukuvinkeistä tai kirjoista yleisesti</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.headerImageContainer}>
            {coverUrl ? (
              <View style={styles.coverImageWrapper}>
                <Image source={{ uri: coverUrl }} style={styles.headerCoverImage} />
                <FormatBadge format={format} />
              </View>
            ) : (
              <View style={[styles.coverImageWrapper, { backgroundColor: colors.surfaceVariant }]}>
                <BookCoverPlaceholder
                  id={book.id}
                  title={book.title}
                  authors={authors}
                  format={format}
                  compact={true}
                />
              </View>
            )}
          </View>
          <View style={styles.headerTextContent}>
            <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
            {!!authorsStr && <Text style={styles.author} numberOfLines={1}>{authorsStr}</Text>}
          </View>
        </>
      )}
    </View>
  );

  const renderModes = () => (
    showFullModes && (
      <View style={styles.modeTabs}>
        {MODES.map((m) => {
          const isActive = mode === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeTab, isActive && styles.modeTabActive]}
              onPress={() => setMode(m.key)}
              accessibilityLabel={m.label}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={m.icon as any}
                size={18}
                color={isActive ? colors.white : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeTabLabel, isActive && styles.modeTabLabelActive]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )
  );

  const handleSelectPresetMode = (selectedMode: BookChatMode) => {
    setIsPresetSheetVisible(false);
    setMode(selectedMode);
    setUserQuestion('');
    if (!isFirstTurnLocal) {
      setFollowUpPresetPill(selectedMode !== 'custom');
    }
  };

  const handleClearPresetPill = () => {
    setMode('custom');
    setFollowUpPresetPill(false);
  };

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderPresetQuickMenu = () => {
    if (!isPresetSheetVisible) return null;
    return (
      <View style={styles.presetMenuLayer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.presetMenuBackdrop}
          activeOpacity={1}
          onPress={() => setIsPresetSheetVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Sulje valmiiden kysymysten valikko"
        />
        <View style={styles.presetMenu}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={styles.presetMenuItem}
              onPress={() => handleSelectPresetMode(m.key)}
              accessibilityRole="button"
              accessibilityLabel={m.label}
            >
              <MaterialCommunityIcons
                name={m.icon as any}
                size={18}
                color={colors.primary}
                style={styles.presetMenuItemIcon}
              />
              <Text style={styles.presetMenuItemLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderMessages = () => (
    <ScrollView
      style={styles.messages}
      contentContainerStyle={styles.messagesContent}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={handleDismissKeyboard}
    >
      {conversation.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Mitä haluaisit tietää?</Text>
          <Text style={styles.emptyText}>
            {isGeneralChat
              ? 'Kysy suosituksia, kirjailijoita tai muuta lukemiseen liittyvää.'
              : 'Voit pyytää kirjan kuvauksen, arvioida sopivuutta sinulle tai esittää oman kysymyksen.'}
          </Text>
        </View>
      )}
      {conversation.map((msg, index) => {
        const isUser = msg.role === 'user';
        const showShortLabel = isUser && (msg.displayLabel || msg.displayIcon) && !msg.displayText;
        const visibleText = isUser
          ? (msg.displayText || (showShortLabel ? (msg.displayLabel || 'Kysymys') : msg.text))
          : msg.text;

        // Special case: short preset prompt like "Kuvaus" — show icon and text on a single row.
        if (isUser && showShortLabel) {
          return (
            <View
              key={index}
              style={[styles.messageBubble, styles.messageUser]}
            >
              <View style={styles.promptHeaderRow}>
                {msg.displayIcon && (
                  <MaterialCommunityIcons
                    name={msg.displayIcon as any}
                    size={20}
                    color={colors.white}
                  />
                )}
                <Text style={styles.messageLabelUser}>{visibleText}</Text>
              </View>
            </View>
          );
        }

        const hasPromptHeader = isUser && (msg.displayIcon || msg.displayLabel);

        return (
          <View
            key={index}
            style={[
              styles.messageBubble,
              isUser ? styles.messageUser : styles.messageAssistant,
            ]}
          >
            {isUser && hasPromptHeader && (
              <View style={styles.promptHeaderRow}>
                {msg.displayIcon && (
                  <MaterialCommunityIcons
                    name={msg.displayIcon as any}
                    size={20}
                    color={colors.white}
                  />
                )}
                {msg.displayLabel && !showShortLabel && (
                  <Text style={styles.messageLabelUser}>{msg.displayLabel}</Text>
                )}
              </View>
            )}
            {!isUser && (
              <View style={styles.aiHeaderRow}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.aiLabel}>AI</Text>
              </View>
            )}
            <Markdown style={isUser ? markdownStylesUser : markdownStyles}>{visibleText}</Markdown>
          </View>
        );
      })}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={loaderColor} />
          <Text style={styles.loadingText}>Ajatellaan hetki...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.delete} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.screenContainer}>
        <SafeAreaView edges={['top']} style={styles.topBarSafeArea}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeftSlot}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Takaisin"
                style={styles.backButton}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              AI-keskustelu
            </Text>
            <View style={styles.topBarRightSlot}>
              {canDeleteConversation ? (
                <TouchableOpacity
                  onPress={() => setIsDeleteModalVisible(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Poista tallennettu keskustelu"
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.white} />
                </TouchableOpacity>
              ) : (
                <View style={styles.deleteButtonPlaceholder} />
              )}
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.contentContainer}>
          {renderHeader()}
        {renderModes()}
        {renderMessages()}
        <View style={styles.inputRow}>
          {showPresetPlus && (
            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => setIsPresetSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Avaa valmiit kysymykset"
            >
              <MaterialCommunityIcons name="plus" size={20} color={colors.white} />
            </TouchableOpacity>
          )}
          {isGeneralChat ? (
            <TextInput
              style={styles.input}
              value={userQuestion}
              onChangeText={setUserQuestion}
              placeholder={inputPlaceholder}
              placeholderTextColor={colors.placeholder}
              multiline
            />
          ) : (
            <View style={styles.inputComposerShell} accessibilityLabel="Viestikenttä">
              <View style={styles.inputComposerRow}>
                {showPresetPill && activeModeConfig && (
                  <View
                    style={styles.presetPill}
                    accessible
                    accessibilityLabel={`Valmis kysymys: ${activeModeConfig.label}`}
                  >
                    <MaterialCommunityIcons
                      name={activeModeConfig.icon as any}
                      size={17}
                      color={colors.primary}
                      style={styles.presetPillLeadingIcon}
                    />
                    <Text style={styles.presetPillLabel} numberOfLines={1}>
                      {activeModeConfig.label}
                    </Text>
                    <TouchableOpacity
                      onPress={handleClearPresetPill}
                      style={styles.presetPillClear}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Poista valmis kysymys"
                    >
                      <MaterialCommunityIcons name="close-circle" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <TextInput
                  style={[styles.inputInner, showPresetPill && styles.inputInnerBelowPill]}
                  value={userQuestion}
                  onChangeText={setUserQuestion}
                  placeholder={inputPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  multiline
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={handleAsk}
            disabled={!canSend || loading}
            accessibilityLabel="Lähetä kysymys tekoälylle"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        {renderPresetQuickMenu()}
        <ConfirmDeleteModal
          isVisible={isDeleteModalVisible}
          onClose={() => {
            if (!isDeletingConversation) {
              setIsDeleteModalVisible(false);
            }
          }}
          onConfirm={handleDeleteConversation}
          bookTitle={book.title}
          message={`Haluatko varmasti poistaa tallennetun keskustelun "${isGeneralChat ? 'Yleinen keskustelu' : book.title}"?`}
          confirmButtonLabel={isDeletingConversation ? 'Poistetaan...' : 'Vahvista poisto'}
          accessibilityLabel="Poista AI-keskustelu"
        />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBarSafeArea: {
    backgroundColor: colors.primary,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
  },
  topBarLeftSlot: {
    width: 44,
    alignItems: 'flex-start',
  },
  topBarRightSlot: {
    width: 44,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  deleteButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.delete,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
  },
  headerDeleteButton: {
    // Legacy style (kept to avoid breaking references); delete button now lives in the custom top bar.
    minWidth: touchTargetMin,
    minHeight: touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImageContainer: {
    marginRight: 14,
  },
  coverImageWrapper: {
    width: 64,
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerIconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCoverImage: {
    width: '100%',
    height: '100%',
  },
  headerTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 18,
    color: colors.textPrimary,
  },
  author: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
  },
  modeTabLabel: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modeTabLabelActive: {
    color: colors.white,
  },
  messages: {
    flex: 1,
    minHeight: 0,
    marginTop: 12,
  },
  messagesContent: {
    paddingBottom: 8,
    gap: 8,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '100%',
  },
  messageUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  messageAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceVariant,
  },
  promptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 6,
  },
  messageLabel: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  messageLabelUser: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 13,
    color: colors.white,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    marginBottom: 4,
  },
  aiLabel: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorBg,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  errorText: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 13,
    color: colors.delete,
  },
  emptyState: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyTitle: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: typography.fontFamilyBody,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputComposerShell: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  inputComposerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    gap: 8,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.bgLight,
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  presetPillLeadingIcon: {
    marginRight: 6,
  },
  presetPillLabel: {
    flexShrink: 1,
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  presetPillClear: {
    marginLeft: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    flexGrow: 1,
    minWidth: 120,
    minHeight: 24,
    maxHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: 4,
    fontFamily: typography.fontFamilyBody,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },
  inputInnerBelowPill: {
    flexBasis: '100%',
    width: '100%',
    minWidth: '100%',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  presetMenuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  presetMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  presetMenu: {
    position: 'absolute',
    left: 16,
    right: 96,
    bottom: 56,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    paddingVertical: 6,
  },
  presetMenuItem: {
    minHeight: touchTargetMin,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetMenuItemIcon: {
    marginRight: 10,
  },
  presetMenuItemLabel: {
    fontFamily: typography.fontFamilyBody,
    fontSize: 14,
    color: colors.textPrimary,
  },
});

export default BookAIChat;

