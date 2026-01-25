import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, SafeAreaView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { getABSCoverUrl } from '../api/abs';
import Slider from '@react-native-community/slider';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';

const { width } = Dimensions.get('window');

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
        isLoading
    } = useAudio();
    const { url, token } = useABSCredentials();
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);

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
                    <TouchableOpacity onPress={hidePlayer} style={styles.headerButton}>
                        <MaterialCommunityIcons name="chevron-down" size={32} color="#333" />
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
                                {computedTotalDuration > 0 ? `Kesto: ${formatTime(computedTotalDuration)}` : ''}
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
                            minimumTrackTintColor="#636B2F"
                            maximumTrackTintColor="#ddd"
                            thumbTintColor="#636B2F"
                        />
                        <View style={styles.timeRow}>
                            <Text style={styles.timeText}>{formatTime(seekValue)}</Text>
                            <Text style={styles.timeText}>-{formatTime((duration || 0) - seekValue)}</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={() => skip(-30)} style={styles.subControl}>
                            {/* Explicit 30s Rewind */}
                            <MaterialCommunityIcons name="rewind-30" size={36} color="#333" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={togglePlay} style={styles.mainControl}>
                            {isLoading ? (
                                <MaterialCommunityIcons name="loading" size={48} color="#333" />
                            ) : (
                                <MaterialCommunityIcons
                                    name={isPlaying ? "pause-circle" : "play-circle"}
                                    size={80}
                                    color="#636B2F"
                                />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => skip(30)} style={styles.subControl}>
                            {/* Explicit 30s Forward */}
                            <MaterialCommunityIcons name="fast-forward-30" size={36} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        width: 40,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: '#f0f0f0',
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
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    author: {
        fontSize: 16,
        color: '#636B2F',
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
        color: '#666',
        fontWeight: '600',
    },
    infoSeparator: {
        fontSize: 13,
        color: '#ccc',
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
        color: '#888',
        fontVariant: ['tabular-nums'],
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 40,
    },
    subControl: {
        padding: 10,
    },
    mainControl: {
        // padding: 0,
    }
});
