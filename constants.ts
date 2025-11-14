import { GameSettings, Avatar } from "./types";

export const CATEGORIES: string[] = [
    'ארץ',
    'עיר',
    'חי',
    'צומח',
    'דמות',
    'מקצוע',
    'חפץ',
    'סרט',
    'מאכל'
];

export const AVATARS: Avatar[] = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
   src: `/avatar-${i + 1}.png`,
    name: `avatar-${i + 1}`,
}));


export const HEBREW_ALPHABET: string[] = [
    'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 
    'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'
];

export const ROUND_TIMES: number[] = [30, 45, 60, 90];
export const ROUND_COUNTS: number[] = [2, 4, 6, 8];
export const GAME_STRUCTURES = {
    '1v1': '1 נגד 1',
    'freeForAll': 'כולם נגד כולם',
    '1v2': '1 נגד 2',
    '2v2': '2 נגד 2',
};

export const GLOBAL_SCORE_CONFIG = {
    winPoints: 30,
    losePoints: 5,
    drawPoints: 10,
    forfeitGamePenalty: -50,
};

export const DEFAULT_SETTINGS: GameSettings = {
    roundTime: 45,
    rounds: 4,
    categories: [...CATEGORIES],
    difficulty: 'normal',
    gameMode: 'vs_computer',
    gameStructure: '1v1',
};
