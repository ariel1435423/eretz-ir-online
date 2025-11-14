
import React, { useState, useCallback, useEffect } from 'react';
import { Page, Player, GameSettings, RoundResult, GameOverStats, Group, TeamScore, GameMode, BotAnswerAction, UserProfile, BotState, ProfileEditor, ForfeitScope, ExtraTimeTarget, GameStructure, PlayerProgress, PlayerProgressStatus, PlayerStats } from './types';
// FIX: Import GLOBAL_SCORE_CONFIG to resolve reference errors.
import { DEFAULT_SETTINGS, AVATARS, GLOBAL_SCORE_CONFIG } from './constants';
import { getBotAnswerPlan, validateAnswers, getGameSummary } from './services/geminiService';
import HomeMenu from './components/HomeMenu';
import GameSettingsComponent from './components/GameSettings';
import OnlineLobby from './components/OnlineLobby';
import JoinLobby from './components/JoinLobby';
import GameRound from './components/GameRound';
import ResultsTable from './components/ResultsTable';

const Countdown: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [count, setCount] = useState(3);
    useEffect(() => {
        if (count === 0) {
            onFinish();
            return;
        }
        const timer = setTimeout(() => setCount(count - 1), 1000);
        return () => clearTimeout(timer);
    }, [count, onFinish]);

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
            <div key={count} className="countdown-text animate-pop-in">{count > 0 ? count : 'Go!'}</div>
        </div>
    );
};

const ProfileEditorModal: React.FC<{ editor: ProfileEditor, onSave: (nickname: string, avatar: string) => void, onClose: () => void }> = ({ editor, onSave, onClose }) => {
    const [nickname, setNickname] = useState(editor.nicknameCurrent || '');
    const [avatar, setAvatar] = useState(editor.selectedAvatarId || AVATARS[0].src);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

    const handleAvatarSelect = (avSrc: string) => {
        setAvatar(avSrc);
        setIsAvatarPickerOpen(false);
    };

    const handleSave = () => {
        if (nickname.trim()) {
            onSave(nickname.trim(), avatar);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-700 bg-opacity-80 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg text-center animate-pop-in border-2 border-blue-400" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">עריכת פרופיל</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-md font-medium text-slate-700 mb-2">כינוי</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder="השם שלכם..."
                            className="app-input text-center text-lg bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-md font-medium text-slate-700 mb-3">אווטאר</label>
                        {isAvatarPickerOpen ? (
                            <div className="avatar-picker-grid bg-slate-50 p-4 rounded-lg">
                                {editor.availableAvatars.map(av => (
                                    <button key={av.id} onClick={() => handleAvatarSelect(av.src)} className={`avatar-select ${avatar === av.src ? 'selected' : ''}`}>
                                        <img src={av.src} alt={av.name} />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <button onClick={() => setIsAvatarPickerOpen(true)} className="w-32 h-32 p-1 rounded-lg border-2 border-slate-300 hover:border-blue-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors">
                                    <img src={avatar} alt="Current Avatar" className="w-full h-full object-cover rounded-md" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="flex gap-4 mt-8">
                    <button onClick={onClose} className="w-full px-8 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">ביטול</button>
                    <button onClick={handleSave} disabled={!nickname.trim()} className="w-full px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300">שמור שינויים</button>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('homeMenu');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
    const [profileEditor, setProfileEditor] = useState<ProfileEditor | null>(null);
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
    const [gameMode, setGameMode] = useState<GameMode>('vs_computer');
    const [players, setPlayers] = useState<Player[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
    const [currentRound, setCurrentRound] = useState(1);
    const [letterOptions, setLetterOptions] = useState<string[]>([]);
    const [currentLetter, setCurrentLetter] = useState<string>('');
    const [chooserPlayerId, setChooserPlayerId] = useState<string | null>(null);
    const [botPlan, setBotPlan] = useState<BotAnswerAction[]>([]);
    const [botState, setBotState] = useState<BotState | null>(null);
    const [extraTimeFor, setExtraTimeFor] = useState<ExtraTimeTarget>(null);
    const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
    const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [lobbyId, setLobbyId] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([]);
    const [forfeitModalContent, setForfeitModalContent] = useState<{ round: string; game: string } | null>(null);


    useEffect(() => {
        try {
            const savedProfile = localStorage.getItem('eretzIrUserProfile');
            let profile: UserProfile;
            if (savedProfile) {
                profile = JSON.parse(savedProfile);
                if (profile.nickname && profile.avatarId) {
                    profile.isProfileComplete = true;
                }
            } else {
                profile = { playerId: `player_${Date.now()}`, isProfileComplete: false, nickname: null, avatarId: null };
            }
            setUserProfile(profile);

            const savedStats = localStorage.getItem(`eretzIrPlayerStats_${profile.playerId}`);
            if(savedStats) {
                setPlayerStats(JSON.parse(savedStats));
            } else {
                 const newStats: PlayerStats = {
                    playerId: profile.playerId,
                    totalPoints: 0, totalWins: 0, totalGames: 0, totalForfeits: 0,
                    lastGameResult: null,
                };
                setPlayerStats(newStats);
                localStorage.setItem(`eretzIrPlayerStats_${profile.playerId}`, JSON.stringify(newStats));
            }

        } catch (e) {
            console.error("Failed to parse user data from localStorage", e);
            localStorage.removeItem('eretzIrUserProfile');
            const newPlayerId = `player_${Date.now()}`;
            setUserProfile({ playerId: newPlayerId, isProfileComplete: false, nickname: null, avatarId: null });
            setPlayerStats({ playerId: newPlayerId, totalPoints: 0, totalWins: 0, totalGames: 0, totalForfeits: 0, lastGameResult: null });
        }
    }, []);

    const getRandomLetters = (count: number) => {
        const shuffled = [...'אבגדהוזחטיכלמנסעפצקרשת'].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    const updateGlobalPlayerStats = useCallback((gameOutcome: GameOverStats) => {
        if (!userProfile || !playerStats) return;

        let newStats = { ...playerStats };
        const humanPlayer = players.find(p => p.id === userProfile.playerId);
        if (!humanPlayer) return;

        newStats.totalGames += 1;
        let resultType: PlayerStats['lastGameResult'] = 'lose';

        if (gameOutcome.endedBy === 'forfeit') {
            if (gameOutcome.forfeitingPlayerId === userProfile.playerId) {
                newStats.totalPoints += GLOBAL_SCORE_CONFIG.forfeitGamePenalty;
                newStats.totalForfeits += 1;
                resultType = 'forfeit';
            } else { // Opponent forfeited
                newStats.totalPoints += GLOBAL_SCORE_CONFIG.winPoints;
                newStats.totalWins += 1;
                resultType = 'win';
            }
        } else {
            const humanGroup = groups.find(g => g.players.includes(humanPlayer.id));
            if (humanGroup?.groupId === gameOutcome.winner.id) {
                newStats.totalPoints += GLOBAL_SCORE_CONFIG.winPoints;
                newStats.totalWins += 1;
                resultType = 'win';
            } else {
                const teamA = teamScores.find(ts => ts.groupId === 'A');
                const teamB = teamScores.find(ts => ts.groupId === 'B');
                if (teamA?.score === teamB?.score) {
                    newStats.totalPoints += GLOBAL_SCORE_CONFIG.drawPoints;
                    resultType = 'draw';
                } else {
                    newStats.totalPoints += GLOBAL_SCORE_CONFIG.losePoints;
                    resultType = 'lose';
                }
            }
        }
        
        newStats.lastGameResult = resultType;
        setPlayerStats(newStats);
        localStorage.setItem(`eretzIrPlayerStats_${userProfile.playerId}`, JSON.stringify(newStats));
    }, [userProfile, playerStats, players, groups, teamScores]);
    
    const handleUpdateProfile = (nickname: string, avatarId: string) => {
        const newProfile = { ...userProfile!, nickname, avatarId, isProfileComplete: true };
        localStorage.setItem('eretzIrUserProfile', JSON.stringify(newProfile));
        setUserProfile(newProfile);
        setProfileEditor(null);
    };

    const handleOpenProfileEditor = () => {
        if (!userProfile) return;
        setProfileEditor({
            mode: 'modal',
            nicknameCurrent: userProfile.nickname,
            selectedAvatarId: userProfile.avatarId,
            availableAvatars: AVATARS,
        });
    };

    const handleNavigateToSettings = (mode: GameMode) => {
        if (!userProfile?.isProfileComplete) return;
        setGameMode(mode);
        setSettings(prev => ({...prev, gameMode: mode}));
        setPage('lobby');
    };
    
    const handleCreateOnlineLobby = (structure: GameStructure) => {
        if (!userProfile?.isProfileComplete || !userProfile.avatarId) return;
        
        setGameMode('vs_player');
        const newSettings: GameSettings = {...DEFAULT_SETTINGS, gameMode: 'vs_player', gameStructure: structure };
        setSettings(newSettings);

        const humanPlayer: Player = { 
            id: userProfile.playerId, 
            name: userProfile.nickname!, 
            avatar: userProfile.avatarId, 
            score: 0, 
            isReady: false, 
            playerType: 'human', 
            isHost: true,
            groupId: 'A'
        };
        
        setPlayers([humanPlayer]);
        setGroups([
            { groupId: 'A', players: [humanPlayer.id] },
            { groupId: 'B', players: [] }
        ]);
        
        setLobbyId(`lobby_${Math.random().toString(36).substring(7)}`);
        setInviteCode(Math.random().toString(36).substring(2, 8).toUpperCase());
        setPage('onlineLobby');
    };
    
    const handleJoinLobbyAttempt = (code: string) => {
        if (code === inviteCode) {
             setPage('onlineLobby');
        } else {
             return "קוד לובי שגוי. נסה שוב.";
        }
        return null;
    }
    
    const handleSettingsChange = (newSettings: Partial<GameSettings>) => {
        setSettings(prev => ({...prev, ...newSettings}));
    }


    const handlePlayerReady = (playerId: string, isReady: boolean) => {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isReady } : p));
    };

    const handleSwitchTeam = (playerId: string) => {
        const playerToSwitch = players.find(p => p.id === playerId);
        if (!playerToSwitch || !playerToSwitch.groupId) return;

        const currentGroup = groups.find(g => g.players.includes(playerId));
        const otherGroup = groups.find(g => g.groupId !== currentGroup?.groupId);
        if (!currentGroup || !otherGroup) return;

        const newGroups: Group[] = groups.map(g => {
            if (g.groupId === currentGroup.groupId) {
                return { ...g, players: g.players.filter(pId => pId !== playerId) };
            }
            if (g.groupId === otherGroup.groupId) {
                return { ...g, players: [...g.players, playerId] };
            }
            return g;
        });

        const newPlayers: Player[] = players.map(p => 
            p.id === playerId ? { ...p, groupId: otherGroup.groupId } : p
        );

        setPlayers(newPlayers);
        setGroups(newGroups);
    };

    const handleAddBotToLobby = (groupId: string) => {
        const structureMap = { '1v1': 2, '2v2': 4, '1v2': 3, '1v3': 4, 'freeForAll': 4 };
        const totalCapacity = structureMap[settings.gameStructure];
        if (players.length >= totalCapacity) return;
    
        const teamACapacityMap = { '1v1': 1, '2v2': 2, '1v2': 1, '1v3': 1, 'freeForAll': 2 };
        const teamACapacity = teamACapacityMap[settings.gameStructure];
    
        const groupACount = groups.find(g => g.groupId === 'A')?.players.length || 0;
        const groupBCount = groups.find(g => g.groupId === 'B')?.players.length || 0;
    
        if (groupId === 'A' && groupACount >= teamACapacity) return;
        if (groupId === 'B' && groupBCount >= (totalCapacity - teamACapacity)) return;
    
        const botNumber = players.filter(p => p.playerType === 'computer').length + 1;
        const usedAvatars = players.map(p => p.avatar);
        const availableBotAvatar = AVATARS.find(av => !usedAvatars.includes(av.src)) || AVATARS[players.length % AVATARS.length];
        
        const newBot: Player = {
            id: `p_bot_${Date.now()}`, name: `בוט ${botNumber}`, avatar: availableBotAvatar.src,
            score: 0, isReady: true, playerType: 'computer', groupId: groupId
        };
    
        setPlayers(prev => [...prev, newBot]);
        setGroups(prev => prev.map(g => 
            g.groupId === groupId ? { ...g, players: [...g.players, newBot.id] } : g
        ));
    };

    const handleRemoveBotFromLobby = (playerId: string) => {
        const playerToRemove = players.find(p => p.id === playerId);
        if (!playerToRemove || playerToRemove.playerType !== 'computer') return;
    
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        setGroups(prev => prev.map(g => ({
            ...g,
            players: g.players.filter(pId => pId !== playerId)
        })));
    };

    const handleKickPlayer = (playerId: string) => {
        const host = players.find(p => p.isHost);
        if (userProfile?.playerId !== host?.id) {
            console.warn("Attempt to kick by non-host blocked.");
            return;
        }

        const playerToKick = players.find(p => p.id === playerId);
        if (!playerToKick || playerToKick.isHost || playerToKick.playerType !== 'human') {
             console.warn("Invalid kick attempt blocked.");
            return;
        }
    
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        setGroups(prev => prev.map(g => ({
            ...g,
            players: g.players.filter(pId => pId !== playerId)
        })));
    };

    const handleStartGame = (gameSettings: GameSettings) => {
        if (!userProfile?.isProfileComplete || !userProfile.avatarId) return;
        setSettings(gameSettings);
        
        let initialPlayers: Player[];

        if (gameSettings.gameMode === 'vs_player') {
             initialPlayers = [...players];
        } else {
            const humanPlayer: Player = { id: userProfile.playerId, name: userProfile.nickname!, avatar: userProfile.avatarId, score: 0, isReady: true, playerType: 'human' };
            initialPlayers = [humanPlayer];
            if (gameSettings.gameMode === 'vs_computer') {
                const botAvatarSrc = AVATARS.find(av => av.src !== userProfile.avatarId)?.src || AVATARS[1].src;
                const botPlayer: Player = { id: 'p_bot', name: 'מחשב', avatar: botAvatarSrc, score: 0, isReady: true, playerType: 'computer' };
                initialPlayers.push(botPlayer);
            }
        }
        
        let newGroups: Group[] = [];
        if (gameSettings.gameMode === 'vs_player') {
            newGroups = [...groups];
        } else if (gameSettings.gameStructure === '1v1' && initialPlayers.length >= 2) {
            initialPlayers[0].groupId = 'A';
            initialPlayers[1].groupId = 'B';
            newGroups.push({ groupId: 'A', players: [initialPlayers[0].id] });
            newGroups.push({ groupId: 'B', players: [initialPlayers[1].id] });
        }
        
        const newTeamScores: TeamScore[] = newGroups.map(g => ({ groupId: g.groupId, score: 0 }));

        setGroups(newGroups.filter(g => g.players.length > 0));
        setTeamScores(newTeamScores);
        setPlayers(initialPlayers);
        setCurrentRound(1);
        setRoundResults([]);
        setGameOverStats(null);
        setPage('game');
        setShowCountdown(true);
    };
    
    const handleCountdownFinish = () => {
        setShowCountdown(false);
        const chooserIndex = (currentRound - 1) % players.length;
        setChooserPlayerId(players[chooserIndex]?.id || null);
        setLetterOptions(getRandomLetters(3));
        setExtraTimeFor(null);
        setForfeitModalContent(null);
        setPlayerProgress(players.map(p => ({
            playerId: p.id,
            status: 'waiting',
            answersCount: 0,
            finishedRound: false,
        })));
    };

    const handleLetterSelected = async (letter: string) => {
        setCurrentLetter(letter);
        const opponents = players.filter(p => p.playerType === 'computer');
        if(opponents.length > 0){
            const plannedTime = settings.roundTime * (0.3 + Math.random() * 0.5);
            setBotState({
                plannedFinishTimeInRound: plannedTime,
                isBotFinished: false,
                hasTriggeredExtraTime: false,
            });

            setIsLoading(true);
            try {
                const plan = await getBotAnswerPlan(letter, settings.categories, settings);
                setBotPlan(plan);
            } catch (err) {
                console.error("Failed to get bot plan:", err);
                setError("Could not get bot plan.");
                setBotPlan([]); 
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const updatePlayerProgress = useCallback((playerId: string, updates: Partial<PlayerProgress>) => {
        setPlayerProgress(prev => prev.map(p => p.playerId === playerId ? { ...p, ...updates } : p));
    }, []);

    const handlePlayerStartedWriting = (playerId: string) => {
        const playerProg = playerProgress.find(p => p.playerId === playerId);
        if (playerProg && playerProg.status === 'waiting') {
            updatePlayerProgress(playerId, { status: 'writing' });
        }
    };

     const handleAnswerCountChange = useCallback((playerId: string, count: number) => {
        updatePlayerProgress(playerId, { answersCount: count });
    }, [updatePlayerProgress]);

    const handleOpponentFinished = (opponentId: string) => {
        updatePlayerProgress(opponentId, { status: 'finished', finishedRound: true });
    };

    const handleRoundFinish = useCallback(async (playerAnswers: Record<string, string[]>) => {
        if (page !== 'game') return;
        
        setIsLoading(true);
        setError(null);
        
        setBotState(prev => prev ? { ...prev, isBotFinished: true } : null);
        
        setPlayerProgress(prev => prev.map(p => {
            if (!p.finishedRound) {
                return { ...p, status: 'times_up' };
            }
            return p;
        }));

        const humanPlayer = players.find(p => p.playerType === 'human');
        const humanAnswers = humanPlayer ? playerAnswers : {};

        const p1FlatAnswers = Object.entries(humanAnswers).flatMap(([category, answers]) => 
            answers.map(answer => ({ category, answer }))
        ).filter(a => a.answer.trim() !== '');

        try {
            const result = await validateAnswers(currentLetter, settings.categories, p1FlatAnswers, players, settings, groups, botPlan);
            
            setRoundResults(prev => [...prev, result]);
            
            const newPlayers = players.map(p => ({...p}));
            newPlayers.forEach(player => {
                const playerScore = result.scores[player.id]?.total || 0;
                player.score += playerScore;
            });
            setPlayers(newPlayers);
            
            const newTeamScores = teamScores.map(ts => ({...ts}));
            newTeamScores.forEach(teamScore => {
                const group = groups.find(g => g.groupId === teamScore.groupId);
                if (group) {
                    const roundTeamScore = group.players.reduce((sum, playerId) => {
                        return sum + (result.scores[playerId]?.total || 0);
                    }, 0);
                    teamScore.score += roundTeamScore;
                }
            });
            setTeamScores(newTeamScores);
            
            setPage('roundResults');

        } catch (err) {
            console.error("Error validating answers:", err);
            setError("הייתה בעיה בבדיקת התשובות.");
            setPage('homeMenu');
        } finally {
            setIsLoading(false);
            setCurrentLetter('');
            setBotPlan([]);
            setBotState(null);
        }
    }, [currentLetter, settings, players, groups, teamScores, botPlan, page]);

    const handleHumanFinish = useCallback(() => {
        if (!userProfile) return;
        updatePlayerProgress(userProfile.playerId, { status: 'finished', finishedRound: true });

        const humanPlayer = players.find(p => p.id === userProfile.playerId);
        const humanGroup = groups.find(g => g.players.includes(humanPlayer?.id || ''));
        if (!humanGroup) return;

        const allTeamFinished = humanGroup.players.every(pId => {
            const progress = playerProgress.find(p => p.playerId === pId);
            return progress?.finishedRound || pId === userProfile.playerId; // Check current finish
        });

        if (allTeamFinished) {
            setExtraTimeFor('bot'); // Assuming 'bot' is the other team for now
        }
    }, [userProfile, players, groups, playerProgress, updatePlayerProgress]);
    
    const handlePrepareForfeit = useCallback(() => {
        const humanPlayer = players.find(p => p.playerType === 'human');
        if (!humanPlayer) return;

        const forfeiterTeamScore = teamScores.find(ts => ts.groupId === humanPlayer.groupId)?.score || 0;
        const opponentTeamScore = teamScores.find(ts => ts.groupId !== humanPlayer.groupId)?.score || 0;
        
        const isLastRound = currentRound === settings.rounds;
        const forfeiterIsWinning = forfeiterTeamScore > opponentTeamScore;
        const dynamicBonus = (isLastRound || forfeiterIsWinning) ? 50 : 30;

        setForfeitModalContent({
            round: `פרישה מהסיבוב תגרע 20 נקודות ממך ותוסיף בונוס של ${dynamicBonus} נקודות לקבוצה היריבה.`,
            game: `פרישה מהמשחק תגרע 50 נקודות מהניקוד המצטבר שלך ותיתן ניצחון לקבוצה השנייה.`
        });
    }, [players, teamScores, currentRound, settings.rounds]);

    const handleForfeit = useCallback((scope: ForfeitScope) => {
        setForfeitModalContent(null);
        const forfeitingPlayer = players.find(p => p.playerType === 'human');
        if (!forfeitingPlayer || !userProfile) return;
        
        updatePlayerProgress(forfeitingPlayer.id, { status: 'forfeited', finishedRound: true });

        const newPlayers = players.map(p => ({...p}));
        const newTeamScores = teamScores.map(ts => ({...ts}));
        
        const forfeiter = newPlayers.find(p => p.id === forfeitingPlayer.id)!;
        const opponentGroup = groups.find(g => g.groupId !== forfeiter.groupId)!;
        
        if (scope === 'forfeit_round') {
            const penalty = -20;
            const forfeiterTeamScore = teamScores.find(ts => ts.groupId === forfeiter.groupId)?.score || 0;
            const opponentTeamScore = teamScores.find(ts => ts.groupId !== forfeiter.groupId)?.score || 0;
            const isLastRound = currentRound === settings.rounds;
            const forfeiterIsWinning = forfeiterTeamScore > opponentTeamScore;
            const reward = (isLastRound || forfeiterIsWinning) ? 50 : 30;
            
            forfeiter.score += penalty;

            opponentGroup.players.forEach(pId => {
                const winner = newPlayers.find(p => p.id === pId)!;
                winner.score += reward / opponentGroup.players.length;
            });
            newTeamScores.forEach(ts => {
                if(ts.groupId === forfeiter.groupId) ts.score += penalty;
                if(ts.groupId === opponentGroup.groupId) ts.score += reward;
            });

            const forfeitResult: RoundResult = {
                letter: currentLetter || '?', answers: {}, scores: {}, summary: '',
                endedBy: 'forfeit', forfeitingPlayerId: forfeitingPlayer.id,
                forfeitingPlayerPenalty: penalty, winnerForfeitPoints: reward,
            };
            setRoundResults(prev => [...prev, forfeitResult]);
            setPage('roundResults');

        } else if (scope === 'forfeit_game') {
            const penalty = -50; // This is a global score penalty, handled in updateGlobalPlayerStats
            const winnerTeamScore = newTeamScores.find(ts => ts.groupId === opponentGroup.groupId)!;
            const stats: GameOverStats = {
                endedBy: 'forfeit', forfeitingPlayerId: forfeiter.id,
                forfeitingPlayerPenalty: penalty,
                winner: { type: 'team', id: opponentGroup.groupId, name: `קבוצה ${opponentGroup.groupId}`, score: winnerTeamScore.score },
                winnerRevealPhase: [], topRareWords: [], playerStats: {}
            };
            setGameOverStats(stats);
            updateGlobalPlayerStats(stats);
            setPage('gameOver');
        }
        
        setCurrentLetter('');
        setBotPlan([]);
        setBotState(null);
    }, [players, teamScores, groups, currentLetter, updatePlayerProgress, userProfile, updateGlobalPlayerStats, currentRound, settings.rounds]);

    const handleNextRound = async () => {
        if (currentRound < settings.rounds) {
            setCurrentRound(prev => prev + 1);
            setPage('game');
            setShowCountdown(true);
        } else {
            setIsLoading(true);
            try {
                const stats = await getGameSummary(roundResults, players, groups);
                setGameOverStats(stats);
                updateGlobalPlayerStats(stats);
                setPage('gameOver');
            } catch (err) {
                console.error("Error getting game summary:", err);
                setError("לא ניתן היה ליצור סיכום משחק.");
                setPage('homeMenu');
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleNewGame = () => {
        setPage('homeMenu');
        setPlayers([]);
        setGroups([]);
        setTeamScores([]);
        setSettings(DEFAULT_SETTINGS);
    };

    const handleBack = useCallback(() => {
        switch(page) {
            case 'lobby':
            case 'onlineLobby':
            case 'joinLobby':
            case 'gameOver':
            case 'roundResults':
                setPage('homeMenu');
                break;
            // Removed 'game' case to prevent backing out
            default:
                setPage('homeMenu');
        }
    }, [page]);
    
    const renderPage = () => {
        if (!userProfile) {
            return <div className="text-center text-slate-500">טוען...</div>;
        }

        switch (page) {
            case 'homeMenu':
                return <HomeMenu userProfile={userProfile} playerStats={playerStats} onSelectMode={handleNavigateToSettings} onUpdateProfile={handleUpdateProfile} onEditProfile={handleOpenProfileEditor} onCreateOnlineLobby={handleCreateOnlineLobby} onNavigateToJoinLobby={() => setPage('joinLobby')}/>;
            case 'joinLobby':
                return <JoinLobby onJoin={handleJoinLobbyAttempt} onBack={handleBack} />;
            case 'lobby':
                return <GameSettingsComponent onStartGame={handleStartGame} onBack={handleBack} settings={settings} onSettingsChange={setSettings} />;
            case 'onlineLobby':
                return <OnlineLobby 
                            settings={settings}
                            onSettingsChange={handleSettingsChange}
                            players={players}
                            groups={groups}
                            lobbyId={lobbyId!}
                            inviteCode={inviteCode!}
                            onStartGame={() => handleStartGame(settings)}
                            onBack={handleBack}
                            onPlayerReady={handlePlayerReady}
                            onSwitchTeam={handleSwitchTeam}
                            userProfile={userProfile}
                            onAddBotToLobby={handleAddBotToLobby}
                            onRemoveBotFromLobby={handleRemoveBotFromLobby}
                            onKickPlayer={handleKickPlayer}
                        />;
            case 'game':
                if (showCountdown) return null;
                const chooser = players.find(p => p.id === chooserPlayerId);
                const humanPlayer = players.find(p => p.playerType === 'human');
                const humanAnswersCount = playerProgress.find(p => p.playerId === humanPlayer?.id)?.answersCount ?? 0;
                return (
                    <GameRound
                        letterOptions={letterOptions}
                        chosenLetter={currentLetter}
                        categories={settings.categories}
                        duration={settings.roundTime}
                        difficulty={settings.difficulty}
                        onFinishRound={handleRoundFinish}
                        onLetterSelected={handleLetterSelected}
                        chooserPlayerId={chooserPlayerId}
                        chooserName={chooser?.name || ''}
                        players={players}
                        groups={groups}
                        gameMode={gameMode}
                        botPlan={botPlan}
                        botState={botState}
                        extraTimeFor={extraTimeFor}
                        onHumanFinish={handleHumanFinish}
                        onBotFinish={(botId: string) => {
                            handleOpponentFinished(botId);
                            const allBotsFinished = players.filter(p => p.playerType === 'computer').every(bot => 
                                playerProgress.find(p => p.playerId === bot.id)?.finishedRound
                            );
                             if(allBotsFinished && !playerProgress.find(p => p.playerId === userProfile?.playerId)?.finishedRound) {
                                setExtraTimeFor('human');
                            }
                        }}
                        onForfeit={handleForfeit}
                        onPrepareForfeit={handlePrepareForfeit}
                        forfeitModalContent={forfeitModalContent}
                        playerProgress={playerProgress}
                        onPlayerStartedWriting={handlePlayerStartedWriting}
                        humanAnswersCount={humanAnswersCount}
                        onHumanAnswerCountChange={(count) => userProfile && handleAnswerCountChange(userProfile.playerId, count)}
                        onBotAnswerCountChange={handleAnswerCountChange}
                    />
                );
            case 'roundResults':
            case 'gameOver':
                 const lastResult = roundResults[roundResults.length - 1];
                 return lastResult ? (
                    <ResultsTable
                        result={lastResult}
                        players={players}
                        groups={groups}
                        teamScores={teamScores}
                        currentRound={currentRound}
                        totalRounds={settings.rounds}
                        isGameOver={page === 'gameOver'}
                        gameOverStats={gameOverStats}
                        onNextRound={handleNextRound}
                        onNewGame={handleNewGame}
                        gameMode={settings.gameMode}
                        onBack={handleBack}
                        playerStats={playerStats}
                    />
                ) : <div className="text-center">טוען תוצאות...</div>;
            default:
                return <HomeMenu userProfile={userProfile} playerStats={playerStats} onSelectMode={handleNavigateToSettings} onUpdateProfile={handleUpdateProfile} onEditProfile={handleOpenProfileEditor} onCreateOnlineLobby={handleCreateOnlineLobby} onNavigateToJoinLobby={() => setPage('joinLobby')} />;
        }
    };
    
    const showGlobalHeader = page !== 'homeMenu';

    return (
        <div className="min-h-screen w-full flex flex-col py-8 px-4 transition-all duration-500">
            {showCountdown && <Countdown onFinish={handleCountdownFinish} />}
            {profileEditor?.mode === 'modal' && (
                <ProfileEditorModal editor={profileEditor} onSave={handleUpdateProfile} onClose={() => setProfileEditor(null)} />
            )}
            
            {showGlobalHeader && userProfile?.isProfileComplete && (
                <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4 px-2">
                     <div>
                        <h1 className="text-2xl font-bold text-slate-800">ארץ עיר Online</h1>
                    </div>
                     <button onClick={handleOpenProfileEditor} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors">
                        <span className="font-semibold">{userProfile.nickname}</span>
                        {userProfile.avatarId && <img src={userProfile.avatarId} alt="avatar" className="w-10 h-10 rounded-full object-cover" />}
                    </button>
                </header>
            )}

            <main className={`w-full max-w-6xl mx-auto bg-white rounded-lg shadow-lg py-10 px-5 flex flex-col ${page === 'homeMenu' || page === 'joinLobby' ? 'shadow-none bg-transparent p-0 min-h-0' : 'min-h-[500px]'}`}>
                {error && <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">{error}</div>}
                {renderPage()}
            </main>
        </div>
    );
};

export default App;
