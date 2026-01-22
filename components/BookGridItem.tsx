import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';

const COLUMN_COUNT = 3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = SCREEN_WIDTH / COLUMN_COUNT;

interface BookGridItemProps {
    id: string;
    title: string;
    authors: string[];
    coverUrl?: string;
    onPress?: () => void;
    publicationYear?: string;
    format?: 'audiobook' | 'ebook' | 'book';
}

export const BookGridItem: React.FC<BookGridItemProps> = ({ id, title, authors, coverUrl, onPress, publicationYear, format = 'book' }) => {
    // Format year to just YYYY if it contains dashes
    let formattedYear = publicationYear ? publicationYear.split('-')[0] : undefined;

    // Explicitly handle "Tuntematon"
    if (formattedYear && formattedYear.toLowerCase().includes('tuntematon')) {
        formattedYear = undefined;
    }

    // Also remove any leading/trailing whitespace
    const cleanYear = formattedYear?.trim();

    return (
        <TouchableOpacity style={styles.bookItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.coverContainer}>
                {coverUrl ? (
                    <Image
                        source={{ uri: coverUrl }}
                        style={styles.coverImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.coverImage, { overflow: 'hidden' }]}>
                        <BookCoverPlaceholder
                            id={id}
                            title={title}
                            authors={authors}
                            format={format}
                        />
                    </View>
                )}
            </View>
            <Text style={styles.bookTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{authors?.join(', ')}</Text>
            {cleanYear && (
                <Text style={styles.bookYear}>{cleanYear}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    bookItem: {
        flex: 1,
        margin: 5,
        marginBottom: 15,
        maxWidth: ITEM_WIDTH - 10,
    },
    coverContainer: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 5,
        backgroundColor: '#eee',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    bookTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    bookAuthor: {
        fontSize: 12,
        color: '#888',
    },
    bookYear: {
        fontSize: 11,
        color: '#999',
        marginTop: 2
    }
});
