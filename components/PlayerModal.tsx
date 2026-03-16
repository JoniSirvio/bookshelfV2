import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, SafeAreaView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { getABSCoverUrl } from '../api/abs';
import Slider from '@react-native-community/slider';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { colors, touchTargetMin, typography } from '../theme';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const formatTime = (seconds: number) => {
    if (!seconds || seconds < 0 || isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const PlayerModal = () => {
    const {
        currentBook,
        currentFileIndex,
        isPlaying,
        togglePlay,
        seek,
        skip,
        position,
        duration,
        computedTotalDuration,
        isPlayerModalVisible,
        hidePlayer,
        isLoading,
        playbackRate,
        setRate
    } = useAudio();
    const { url, token } = useABSCredentials();
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [imgError, setImgError] = useState(false);

    // Speed Control State
    const [isSpeedControlVisible, setIsSpeedControlVisible] = useState(false);

    // Update slider value from actual position unless user is dragging
    useEffect(() => {
        if (!isSeeking) {
            setSeekValue(position);
        }
    }, [position, isSeeking]);

    if (!currentBook) return null;

    // Safety check for media
    const coverUrl = (url && token && currentBook.media?.coverPath)
        ? getABSCoverUrl(url, token, currentBook.id)
        : null;

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={isPlayerModalVisible}
            onRequestClose={hidePlayer}
            presentationStyle="pageSheet" // iOS native feel
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={hidePlayer}
                        style={styles.headerButton}
                        accessibilityLabel="Sulje soittimo"
                        accessibilityRole="button"
                    >
                        <MaterialCommunityIcons name="chevron-down" size={32} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Toistetaan nyt</Text>
                    <View style={styles.headerButton} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Cover Art */}
                    <View style={styles.artworkContainer}>
                        {coverUrl ? (
                            <Image source={{ uri: coverUrl }} style={styles.artwork} />
                        ) : (
                            <BookCoverPlaceholder
                                id={currentBook.id}
                                title={currentBook.media.metadata.title}
                                authors={currentBook.media.metadata.authors?.map(a => a.name)}
                                format="audiobook"
                            />
                        )}
                    </View>

                    {/* Metadata */}
                    <View style={styles.metadata}>
                        <Text style={styles.title} numberOfLines={2}>
                            {currentBook.media.metadata.title}
                        </Text>
                        <Text style={styles.author} numberOfLines={1}>
                            {currentBook.media.metadata.authorName || currentBook.media.metadata.authors?.[0]?.name}
                        </Text>

                        {/* Info Block: Part & Total Duration */}
                        <View style={styles.infoBlock}>
                            <Text style={styles.infoText}>
                                {`Osa ${currentFileIndex + 1} / ${currentBook.media.audioFiles?.length || 1}`}
                            </Text>
                            <Text style={styles.infoSeparator}>•</Text>
                            <Text style={styles.infoText}>
                                {computedTotalDuration > 0 ? `Kesto: ${formatTime(computedTotalDuration / playbackRate)}` : ''}
                            </Text>
                        </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.progressContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={duration || 1} // Avoid 0/0
                            value={seekValue}
                            onValueChange={(val) => {
                                setIsSeeking(true);
                                setSeekValue(val);
                            }}
                            onSlidingComplete={async (val) => {
                                await seek(val);
                                setIsSeeking(false);
                            }}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor={colors.border}
                            thumbTintColor={colors.primary}
                        />
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(seekValue)}</Text>
                            <Text style={styles.timeText}>-{formatTime(((duration || 0) - seekValue) / playbackRate)}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={() => skip(-30)} style={styles.subControl}>
                            {/* Explicit 30s Rewind */}
                            <MaterialCommunityIcons name="rewind-30" size={36} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={togglePlay}
                            style={styles.mainControl}
                            accessibilityLabel={isPlaying ? 'Tauko' : 'Toisto'}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: isLoading }}
                        >
                            {isLoading ? (
                                <MaterialCommunityIcons name="loading" size={48} color={colors.textPrimary} />
                            ) : (
                                <MaterialCommunityIcons
                                    name={isPlaying ? "pause-circle" : "play-circle"}
                                    size={80}
                                    color={colors.primary}
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => skip(30)} style={styles.subControl}>
                            {/* Explicit 30s Forward */}
                            <MaterialCommunityIcons name="fast-forward-30" size={36} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Inline Speed Control */}
                    <View style={[styles.speedContainer, { justifyContent: isSpeedControlVisible ? 'flex-start' : 'center' }]}>
                        <TouchableOpacity
                            style={[
                                styles.speedButton,
                                isSpeedControlVisible && styles.speedButtonActive
                            ]}
                            onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                                setIsSpeedControlVisible(!isSpeedControlVisible);
                            }}
                        >
                            <Text style={styles.speedButtonText}>{playbackRate.toFixed(2)}x</Text>
                        </TouchableOpacity>

                        {isSpeedControlVisible && (
                            <View style={styles.inlineSliderContainer}>
                                <Slider
                                    style={styles.inlineSlider}
                                    minimumValue={1.0}
                                    maximumValue={2.0}
                                    step={0.05}
                                    value={playbackRate}
                                    onValueChange={(val) => setRate(parseFloat(val.toFixed(2)))}
                                    minimumTrackTintColor={colors.primary}
                                    maximumTrackTintColor={colors.surfaceVariant}
                                    thumbTintColor={colors.primary}
                                />
                                <Text style={styles.speedValueInline}>{playbackRate.toFixed(2)}x</Text>
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        height: 60,
    },
    headerButton: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textSecondaryAlt,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 20,
    },
    artworkContainer: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: colors.surfaceVariant,
        marginBottom: 30,
    },
    artwork: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    metadata: {
        alignItems: 'center',
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    author: {
        fontSize: 16,
        fontFamily: typography.fontFamilyBody,
        color: colors.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    infoBlock: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    infoText: {
        fontSize: 13,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondaryAlt,
        fontWeight: '600',
    },
    infoSeparator: {
        fontSize: 13,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
    },
    progressContainer: {
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0, // slider has internal padding usually
        marginTop: -5,
    },
    timeText: {
        fontSize: 12,
        fontFamily: typography.fontFamilyBody,
        color: colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 20, // Reduced bottom margin to fit speed button
    },
    subControl: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    mainControl: {
        minWidth: touchTargetMin,
        minHeight: touchTargetMin,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        width: '100%',
    },
    speedButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: colors.surfaceVariant,
        marginRight: 10,
    },
    speedButtonActive: {
        backgroundColor: colors.border,
    },
    speedButtonText: {
        fontFamily: typography.fontFamilyDisplay,
        color: colors.primary,
        fontSize: 14,
    },
    inlineSliderContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceVariant,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    inlineSlider: {
        flex: 1,
        height: 30,
    },
    speedValueInline: {
        fontSize: 12,
        fontFamily: typography.fontFamilyDisplay,
        color: colors.textSecondaryAlt,
        marginLeft: 8,
        fontVariant: ['tabular-nums'],
    },
});
