import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
    UserTag,
    BookTagAssignments,
    fetchUserTags,
    fetchBookTagAssignments,
    createTagInFirestore,
    renameTagInFirestore,
    deleteTagInFirestore,
    setBookTagsInFirestore,
    generateTagId,
    normalizeTagName,
    tagBookKey,
} from '../firebase/tags';

export const useUserTags = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const tagsKey = ['userTags', user?.uid];
    const assignmentsKey = ['bookTagAssignments', user?.uid];

    const { data: tags = [] } = useQuery({
        queryKey: tagsKey,
        queryFn: async () => {
            if (!user) return [];
            return fetchUserTags(user.uid);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10,
    });

    const { data: assignments = {} } = useQuery<BookTagAssignments>({
        queryKey: assignmentsKey,
        queryFn: async () => {
            if (!user) return {};
            return fetchBookTagAssignments(user.uid);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10,
    });

    const tagsById = useMemo(() => {
        const map = new Map<string, UserTag>();
        tags.forEach(t => map.set(t.id, t));
        return map;
    }, [tags]);

    /** Tags assigned to a book, resolved to full tag objects (skips stale ids). */
    const getTagsForBook = (bookId: string): UserTag[] => {
        const tagIds = assignments[tagBookKey(bookId)] ?? [];
        return tagIds
            .map(id => tagsById.get(id))
            .filter((t): t is UserTag => !!t)
            .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName, 'fi'));
    };

    /** True if the book has at least one of the given tags (OR). Empty filter matches all. */
    const bookMatchesTagFilter = (bookId: string, filterTagIds: string[]): boolean => {
        if (filterTagIds.length === 0) return true;
        const tagIds = assignments[tagBookKey(bookId)] ?? [];
        return tagIds.some(id => filterTagIds.includes(id));
    };

    const usageCountByTagId = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(assignments).forEach(tagIds => {
            tagIds.forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
            });
        });
        return counts;
    }, [assignments]);

    const createTagMutation = useMutation({
        mutationFn: async (tag: { id: string, name: string }) => {
            if (!user) return;
            await createTagInFirestore(user.uid, tag);
        },
        onMutate: async ({ id, name }) => {
            await queryClient.cancelQueries({ queryKey: tagsKey });
            const previousTags = queryClient.getQueryData<UserTag[]>(tagsKey);
            queryClient.setQueryData<UserTag[]>(tagsKey, (old = []) => [
                ...old,
                { id, name: name.trim(), normalizedName: normalizeTagName(name), createdAt: new Date() },
            ]);
            return { previousTags };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTags) queryClient.setQueryData(tagsKey, context.previousTags);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: tagsKey }),
    });

    const renameTagMutation = useMutation({
        mutationFn: async ({ tagId, newName }: { tagId: string, newName: string }) => {
            if (!user) return;
            await renameTagInFirestore(user.uid, tagId, newName);
        },
        onMutate: async ({ tagId, newName }) => {
            await queryClient.cancelQueries({ queryKey: tagsKey });
            const previousTags = queryClient.getQueryData<UserTag[]>(tagsKey);
            queryClient.setQueryData<UserTag[]>(tagsKey, (old = []) =>
                old.map(t => t.id === tagId
                    ? { ...t, name: newName.trim(), normalizedName: normalizeTagName(newName) }
                    : t)
            );
            return { previousTags };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTags) queryClient.setQueryData(tagsKey, context.previousTags);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: tagsKey }),
    });

    const deleteTagMutation = useMutation({
        mutationFn: async (tagId: string) => {
            if (!user) return;
            await deleteTagInFirestore(user.uid, tagId);
        },
        onMutate: async (tagId) => {
            await queryClient.cancelQueries({ queryKey: tagsKey });
            await queryClient.cancelQueries({ queryKey: assignmentsKey });
            const previousTags = queryClient.getQueryData<UserTag[]>(tagsKey);
            const previousAssignments = queryClient.getQueryData<BookTagAssignments>(assignmentsKey);

            queryClient.setQueryData<UserTag[]>(tagsKey, (old = []) => old.filter(t => t.id !== tagId));
            queryClient.setQueryData<BookTagAssignments>(assignmentsKey, (old = {}) => {
                const next: BookTagAssignments = {};
                Object.entries(old).forEach(([bookKey, tagIds]) => {
                    const remaining = tagIds.filter(id => id !== tagId);
                    if (remaining.length > 0) next[bookKey] = remaining;
                });
                return next;
            });

            return { previousTags, previousAssignments };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTags) queryClient.setQueryData(tagsKey, context.previousTags);
            if (context?.previousAssignments) queryClient.setQueryData(assignmentsKey, context.previousAssignments);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: tagsKey });
            queryClient.invalidateQueries({ queryKey: assignmentsKey });
        },
    });

    const setBookTagsMutation = useMutation({
        mutationFn: async ({ bookId, tagIds }: { bookId: string, tagIds: string[] }) => {
            if (!user) return;
            await setBookTagsInFirestore(user.uid, bookId, tagIds);
        },
        onMutate: async ({ bookId, tagIds }) => {
            await queryClient.cancelQueries({ queryKey: assignmentsKey });
            const previousAssignments = queryClient.getQueryData<BookTagAssignments>(assignmentsKey);
            queryClient.setQueryData<BookTagAssignments>(assignmentsKey, (old = {}) => {
                const next = { ...old };
                const key = tagBookKey(bookId);
                if (tagIds.length === 0) {
                    delete next[key];
                } else {
                    next[key] = tagIds;
                }
                return next;
            });
            return { previousAssignments };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousAssignments) queryClient.setQueryData(assignmentsKey, context.previousAssignments);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: assignmentsKey }),
    });

    /** Find an existing tag by name (case-insensitive) or create a new one. */
    const ensureTag = async (name: string): Promise<UserTag | null> => {
        if (!user) return null;
        const normalized = normalizeTagName(name);
        if (!normalized) return null;

        const existing = (queryClient.getQueryData<UserTag[]>(tagsKey) ?? tags)
            .find(t => t.normalizedName === normalized);
        if (existing) return existing;

        const id = generateTagId(user.uid);
        await createTagMutation.mutateAsync({ id, name });
        return { id, name: name.trim(), normalizedName: normalized, createdAt: new Date() };
    };

    return {
        tags,
        assignments,
        tagsById,
        usageCountByTagId,
        getTagsForBook,
        bookMatchesTagFilter,
        ensureTag,
        renameTag: (tagId: string, newName: string) => renameTagMutation.mutate({ tagId, newName }),
        deleteTag: (tagId: string) => deleteTagMutation.mutate(tagId),
        setBookTags: (bookId: string, tagIds: string[]) => setBookTagsMutation.mutate({ bookId, tagIds }),
    };
};
