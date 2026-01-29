import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { getABSCoverUrl } from '../api/abs';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';
import { colors } from '../theme';

export const MiniPlayer = () => {
    const { currentBook, isPlaying, togglePlay, openPlayer, isLoading } = useAudio();
    const { url, token } = useABSCredentials();

    if (!currentBook) return null;

    // Safety: ensure media exists (might be partial during loading)
    const coverUrl = (url && token && currentBook.media?.coverPath)
        ? getABSCoverUrl(url, token, currentBook.id)
        : null;

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={openPlayer}
            activeOpacity={0.9}
        >
            {/* Progress Bar Line could go here */}
            {/* <View style={{height: 2, width: `${(position/duration)*100}%`, backgroundColor: '#636B2F'}} /> */}

            <View style={styles.content}>
                {/* Cover */}
                <View style={styles.coverContainer}>
                    {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.cover} />
                    ) : (
                        <BookCoverPlaceholder
                            id={currentBook.id}
                            title={currentBook.media.metadata.title}
                            authors={currentBook.media.metadata.authors?.map(a => a.name)}
                            format="audiobook"
                            compact
                        />
                    )}
                </View>

                {/* Info */}
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentBook.media.metadata.title}
                    </Text>
                    <Text style={styles.author} numberOfLines={1}>
                        {currentBook.media.metadata.authorName || currentBook.media.metadata.authors?.[0]?.name}
                    </Text>
                </View>

                {/* Controls */}
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        togglePlay();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    {isLoading ? (
                        <MaterialCommunityIcons name="loading" size={28} color={colors.textPrimary} />
                    ) : (
                        <MaterialCommunityIcons
                            name={isPlaying ? "pause" : "play"}
                            size={28}
                            color={colors.textPrimary}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80, // Height of Tab Bar
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        height: 60,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 1000 // Ensure it's above everything
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    coverContainer: {
        width: 40,
        height: 40,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#eee',
        marginRight: 10,
    },
    cover: {
        width: '100%',
        height: '100%',
    },
    info: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 10,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    author: {
        fontSize: 12,
        color: colors.textSecondaryAlt,
    },
    playButton: {
        padding: 5,
    }
});
