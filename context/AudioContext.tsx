import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, AudioStatus, setAudioModeAsync } from 'expo-audio';
import { ABSItem, getAudioStreamUrl, getABSHlsUrl, updateABSProgress, fetchABSItem } from '../api/abs';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { queryClient } from '../utils/queryClient';

interface AudioContextType {
    currentBook: ABSItem | null;
    currentFileIndex: number;
    isPlaying: boolean;
    position: number; // seconds
    duration: number; // seconds
    computedTotalDuration: number; // Calculated total duration
    playbackRate: number;
    isLoading: boolean;
    isPlayerModalVisible: boolean;
    openPlayer: () => void;
    hidePlayer: () => void;
    loadBook: (book: ABSItem) => Promise<void>;
    togglePlay: () => void;
    seek: (position: number) => Promise<void>;
    skip: (seconds: number) => Promise<void>;
    setRate: (rate: number) => void;
    closePlayer: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { url: absUrl, token } = useABSCredentials();
    const [currentBook, setCurrentBook] = useState<ABSItem | null>(null);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const lastSyncTime = useRef(0);

    // Initialize player with no source initially
    const player = useAudioPlayer(null);
    const status = useAudioPlayerStatus(player);

    const openPlayer = () => setIsPlayerModalVisible(true);
    const hidePlayer = () => setIsPlayerModalVisible(false);

    const setRate = (rate: number) => {
        setPlaybackRate(rate);
        if (player.setPlaybackRate) {
            player.setPlaybackRate(rate);
        }
    };

    // Setup Background Audio Mode
    useEffect(() => {
        (async () => {
            try {
                await setAudioModeAsync({
                    shouldPlayInBackground: true,
                    playsInSilentMode: true,
                    interruptionMode: 'doNotMix',
                    shouldRouteThroughEarpiece: false
                });
            } catch (e) {
                console.warn("Failed to set audio mode:", e);
            }
        })();
    }, []);

    const loadBook = async (bookInput: ABSItem) => {
        if (!absUrl || !token) {
            console.error("Missing ABS credentials");
            return;
        }

        // Prevent reloading the same book if already playing
        if (currentBook?.id === bookInput.id) {
            if (!status.playing) player.play();
            return;
        }

        // Guard: If we are already loading this specific book (debounce-ish) or busy? 
        // For now, simple state is enough, but let's ensure we update state synchronously first.
        setIsLoading(true);

        // SAFE OPTIMISTIC UPDATE: Only show if we have basic metadata (media)
        if (bookInput.media && bookInput.media.metadata) {
            setCurrentBook(bookInput);
        }

        let book = bookInput;

        try {
            // Always try to fetch the latest server state to get accurate resume position
            // (The UI list might have stale progress 0, but server has 50%)
            try {
                const detailedBook = await fetchABSItem(absUrl, token, bookInput.id);
                if (detailedBook) {
                    // console.log(`[AudioContext] Refreshed book details. Server currentTime: ${detailedBook.userMedia?.currentTime}`);
                    book = detailedBook;
                }
            } catch (e) {
                console.warn("Failed to refresh book details, using cached version:", e);
            }

            // Validation: If we still don't have media (fetched or cached), we can't play
            if (!book.media || !book.media.audioFiles) {
                console.error("No media files available for book");
                setIsLoading(false);
                return;
            }

            // Check if user switched book while fetching?
            // (In a real race, 'currentBook' state might have changed again)
            // But we can't easily access the *latest* currentBook without a ref or setState callback.
            // For MVP, we proceed.

            // Fallback: Use Direct Stream (File-by-File)
            // HLS proved unstable on some devices, so we manually manage the playlist.

            const audioFiles = book.media.audioFiles || [];
            audioFiles.sort((a, b) => a.index - b.index);

            const firstFile = audioFiles.length > 0 ? audioFiles[0] : null;

            if (!firstFile) {
                console.error("No audio files found for book");
                setIsLoading(false);
                return;
            }

            const streamUrl = getAudioStreamUrl(absUrl, token, book.id, firstFile.ino);
            console.log("[AudioContext] Loading Direct Stream (File 0):", streamUrl);

            setCurrentFileIndex(0);
            player.replace(streamUrl);

            // Resume progress logic:
            // 1. prefer server 'userMedia' from detailed fetch
            // 2. fallback to 'absProgress' from bookInput (if it was from In Progress shelf)
            // 3. fallback to 'userMedia' on bookInput (if it was an ABSItem)

            let resumeTime = 0;

            if (book.userMedia?.currentTime) {
                resumeTime = book.userMedia.currentTime;
            } else if ((bookInput as any).absProgress?.currentTime) {
                console.log(`[AudioContext] Using absProgress fallback: ${(bookInput as any).absProgress.currentTime}`);
                resumeTime = (bookInput as any).absProgress.currentTime;
            } else if (bookInput.userMedia?.currentTime) {
                resumeTime = bookInput.userMedia.currentTime;
            }

            if (resumeTime > 0) {
                // Calculate which file and position this global time corresponds to
                const { fileIndex, position } = getLocalPosition(resumeTime, audioFiles);

                console.log(`[AudioContext] Resuming at Global Time: ${resumeTime}s -> File Index: ${fileIndex}, Position: ${position}s`);

                // If the start file is different from the first file (0), we need to switch
                if (fileIndex !== 0) {
                    const targetFile = audioFiles[fileIndex];
                    if (targetFile) {
                        const nextUrl = getAudioStreamUrl(absUrl, token, book.id, targetFile.ino);
                        setCurrentFileIndex(fileIndex);
                        player.replace(nextUrl);
                    }
                }

                await player.seekTo(position);
            }

            if (player.setPlaybackRate) {
                player.setPlaybackRate(playbackRate);
            } else {
                // Fallback or ignore if not supported in this version
                // console.warn("setPlaybackRate not available");
            }

            player.play();
            setCurrentBook(book);
        } catch (error) {
            console.error("Failed to load book:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-Advance to Next Chapter (Manual Playlist)
    useEffect(() => {
        if (currentBook && !status.playing && status.duration > 0 && Math.abs(status.currentTime - status.duration) < 1) {
            // Track Finished!
            const audioFiles = currentBook.media.audioFiles || [];
            audioFiles.sort((a, b) => a.index - b.index);

            if (currentFileIndex < audioFiles.length - 1) {
                const nextIndex = currentFileIndex + 1;
                const nextFile = audioFiles[nextIndex];
                if (nextFile && absUrl && token) {
                    console.log(`[AudioContext] Finished Track ${currentFileIndex}. Advancing to ${nextIndex}: ${nextFile.metadata.filename}`);
                    const nextUrl = getAudioStreamUrl(absUrl, token, currentBook.id, nextFile.ino);

                    setCurrentFileIndex(nextIndex);
                    player.replace(nextUrl);
                    player.play();
                }
            }
        }
    }, [status.currentTime, status.playing, status.duration, currentBook, currentFileIndex, absUrl, token]);

    const togglePlay = () => {
        if (status.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const seek = async (seconds: number) => {
        await player.seekTo(seconds);
    };

    const skip = async (seconds: number) => {
        const newPos = status.currentTime + seconds;
        const target = Math.max(0, Math.min(newPos, status.duration || 0));
        await player.seekTo(target);
    };

    const closePlayer = () => {
        player.pause();
        // We can't easily "unload" source to null with replace(null) in types usually, but let's try or just clear book
        // player.replace(null); // Type might not allow null if not defined in source
        // Just stop and clear state
        setCurrentBook(null);
        setCurrentFileIndex(0);
    };



    // We need a ref to track current time so the interval can read it without resetting
    const latestStatusRef = useRef(status);
    useEffect(() => {
        latestStatusRef.current = status;
    }, [status]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status.playing && currentBook && absUrl && token) {
            // console.log("[AudioContext] Starting periodic sync timer (10s)");
            interval = setInterval(() => {
                const currentStatus = latestStatusRef.current;
                if (currentStatus.currentTime > 0) {
                    // Calculate Global Time
                    const audioFiles = currentBook.media.audioFiles || [];
                    // Ensure files are sorted correctly before calculation
                    audioFiles.sort((a, b) => a.index - b.index);

                    const globalTime = getGlobalTime(currentFileIndex, currentStatus.currentTime, audioFiles);
                    const totalDuration = getTotalBookDuration(audioFiles);

                    // console.log(`[AudioContext] Syncing Global Time: ${globalTime.toFixed(2)} / ${totalDuration.toFixed(2)}`);

                    updateABSProgress(absUrl, token, currentBook.id, globalTime, totalDuration)
                        .catch(e => console.warn("Periodic sync failed", e));
                }
            }, 10000);
        }
        return () => {
            if (interval) {
                // console.log("[AudioContext] Clearing periodic sync timer");
                clearInterval(interval);
            }
        };
    }, [status.playing, currentBook?.id, absUrl, token]);

    // 2. Sync on Pause / Stop (When playing becomes false)
    useEffect(() => {
        if (!status.playing && currentBook && absUrl && token && status.currentTime > 0) {
            // Calculate Global Time
            const audioFiles = currentBook.media.audioFiles || [];
            audioFiles.sort((a, b) => a.index - b.index);

            const globalTime = getGlobalTime(currentFileIndex, status.currentTime, audioFiles);
            const totalDuration = getTotalBookDuration(audioFiles);

            // console.log(`[AudioContext] Paused/Stopped - forcing sync with Global Time: ${globalTime}`);

            updateABSProgress(absUrl, token, currentBook.id, globalTime, totalDuration).then(() => {
                queryClient.invalidateQueries({ queryKey: ['absMe'] });
            });
        }
    }, [status.playing]);

    return (
        <AudioContext.Provider
            value={{
                currentBook,
                currentFileIndex, // Exposed for UI
                isPlaying: status.playing,
                position: status.currentTime,
                duration: status.duration,
                computedTotalDuration: currentBook?.media?.audioFiles
                    ? getTotalBookDuration(currentBook.media.audioFiles)
                    : (currentBook?.media?.duration || 0),
                isLoading: isLoading || status.isBuffering, // Combine loading states
                isPlayerModalVisible,
                openPlayer,
                hidePlayer,
                loadBook,
                togglePlay,
                seek,
                skip,
                setRate,
                playbackRate,
                closePlayer
            }}
        >
            {children}
        </AudioContext.Provider>
    );
};

// --- Helper Functions for Multi-Part Time Calculation ---

// Calculates the global time (progress in the whole book) based on current file and position
const getGlobalTime = (currentFileIndex: number, currentFilePosition: number, audioFiles: any[]) => {
    let globalTime = 0;
    for (let i = 0; i < currentFileIndex; i++) {
        globalTime += audioFiles[i].duration || 0;
    }
    globalTime += currentFilePosition;
    return globalTime;
};

// Calculates the total duration of the entire book
const getTotalBookDuration = (audioFiles: any[]) => {
    return audioFiles.reduce((acc, file) => acc + (file.duration || 0), 0);
};

interface LocalPosition {
    fileIndex: number;
    position: number;
}

// Maps a global time back to a specific file index and position within that file
const getLocalPosition = (globalTime: number, audioFiles: any[]): LocalPosition => {
    let remainingTime = globalTime;
    for (let i = 0; i < audioFiles.length; i++) {
        const fileDuration = audioFiles[i].duration || 0;
        if (remainingTime < fileDuration) {
            return { fileIndex: i, position: remainingTime };
        }
        remainingTime -= fileDuration;
    }
    // If we overshoot (e.g. finished), return last file and its duration
    return { fileIndex: audioFiles.length - 1, position: audioFiles[audioFiles.length - 1].duration || 0 };
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
