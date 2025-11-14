export type Page = 'homeMenu' | 'lobby' | 'onlineLobby' | 'joinLobby' | 'game' | 'roundResults' | 'gameOver';

export interface UserProfile {
    playerId: string;
    nickname: string | null;
    avatarId: string | null;
    isProfileComplete: boolean;
}

export interface PlayerStats {
    playerId: string;
    totalPoints: number;
    totalWins: number;
    totalGames: number;
    totalForfeits: number;
    lastGameResult: "win" | "lose" | "forfeit" | "draw" | null;
}

export interface Avatar {
    id: number;
    src: string;
    name: string;
}

export interface ProfileEditor {
    mode: 'inline_on_home' | 'modal';
    nicknameCurrent: string | null;
    selectedAvatarId: string | null;
    availableAvatars: Avatar[];
}

export interface Player {
    id: string;
    name: string;
    avatar: string;
    score: number;
    isReady: boolean;
    playerType?: 'human' | 'computer';
    groupId?: string;
    isHost?: boolean;
}

export type GameMode = 'single_player' | 'vs_computer' | 'vs_player';
export type GameStructure = '1v1' | '2v2' | '1v2' | '1v3' | 'freeForAll';
export type ForfeitScope = 'forfeit_round' | 'forfeit_game';
export type ExtraTimeTarget = 'human' | 'bot' | null;

export type PlayerProgressStatus = 'waiting' | 'writing' | 'finished' | 'times_up' | 'forfeited';

export interface PlayerProgress {
    playerId: string;
    status: PlayerProgressStatus;
    answersCount: number;
    finishedRound: boolean;
}

export interface GameSettings {
    roundTime: number;
    rounds: number;
    categories: string[];
    difficulty: 'easy' | 'normal' | 'hard';
    gameMode: GameMode;
    gameStructure: GameStructure;
}

export interface Answer {
    category: string;
    answer: string;
    status: 'valid' | 'invalid';
    reason?: string;
    score: number;
    conflict: boolean;
    rarityBonus: number;
}

export interface PlayerRoundScore {
    baseScore: number;
    bonusScore: number;
    comboBonus?: number;
    total: number;
}

export interface BotAnswerAction {
    type: 'thinking' | 'answering';
    category: string;
    answer: string;
    delay: number; // in seconds
}

export interface BotState {
    plannedFinishTimeInRound: number;
    isBotFinished: boolean;
    hasTriggeredExtraTime: boolean;
}

export interface BotProgress {
    percentCompleted: number;
    statusPerCategory: Record<string, 'waiting' | 'thinking' | 'answering' | 'completed' | 'skipped'>;
    currentCategory: string | null;
    locked: boolean;
}

export interface RoundResult {
    letter: string;
    answers: { [playerId: string]: Answer[] };
    scores: { [playerId:string]: PlayerRoundScore };
    botAnswerPlan?: BotAnswerAction[];
    summary: string;
    // Forfeit related fields
    endedBy?: 'forfeit';
    forfeitingPlayerId?: string;
    forfeitingPlayerPenalty?: number;
    winnerForfeitPoints?: number;
}

export interface PlayerEndGameStats {
    correctAnswers: number;
    invalidAnswers: number;
    conflicts: number;
    hintsUsed: number;
    strongestCategory: {
        category: string;
        score: number;
    };
}

export interface WinnerInfo {
    type: 'player' | 'team';
    id: string; // Player ID or Group ID
    name: string;
    avatar?: string;
    score: number;
}

export interface GameOverStats {
    winner: WinnerInfo;
    winnerRevealPhase: string[]; // e.g., ["spotlight", "confetti"]
    topRareWords: { word: string; category: string; bonus: number }[];
    playerStats: {
        [playerId:string]: PlayerEndGameStats;
    };
    // Forfeit related fields
    endedBy?: 'forfeit';
    forfeitingPlayerId?: string;
    forfeitingPlayerPenalty?: number;
}

export interface Group {
    groupId: string;
    players: string[]; // array of player IDs
}

export interface TeamScore {
    groupId: string;
    score: number;
}