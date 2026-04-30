import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className merger (clsx + tailwind-merge). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
