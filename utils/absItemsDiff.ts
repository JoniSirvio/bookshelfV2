import { ABSItem } from '../api/abs';

/** True when lists differ by item count, ids, or order (add / remove / reorder). */
export function absItemsListDiffers(a: ABSItem[], b: ABSItem[]): boolean {
    if (a.length !== b.length) return true;
    return a.some((item, index) => item.id !== b[index]?.id);
}
