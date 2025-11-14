
import React, { useState, useCallback, useEffect } from 'react';
import { Page, Player, GameSettings, RoundResult, GameOverStats, Group, TeamScore, GameMode, BotAnswerAction, UserProfile, BotState, ProfileEditor, ForfeitScope, ExtraTimeTarget, GameStructure, PlayerProgress, PlayerProgressStatus, PlayerStats, LobbyState, BroadcastMessage, BroadcastMessageType } from './types';
import { DEFAULT_SETTINGS, AVATARS, GLOBAL_SCORE_CONFIG } from './constants';
import { getBotAnswerPlan, validateAnswers, getGameSummary } from './services/geminiService';
import HomeMenu from './components/HomeMenu';
import GameSettingsComponent from './components/GameSettings';
import OnlineLobby from './components/OnlineLobby';
import JoinLobby from './components/JoinLobby';
import GameRound from './components/GameRound';
import ResultsTable from './components/ResultsTable';

const LOBBY_CHANNEL = new BroadcastChannel('eretz-ir-lobby-channel');

// --- Real-time Simulation Service ---

const getLobby = (lobbyId: string): LobbyState | null => {
    const lobbies = JSON.parse(localStorage.getItem('eretz-ir-lobbies') || '{}');
    return lobbies[lobbyId] || null;
};

const saveLobby = (lobby: LobbyState) => {
    const lobbies = JSON.parse(localStorage.getItem('eretz-ir-lobbies') || '{}');
    lobbies[lobby.id] = lobby;
    localStorage.setItem('eretz-ir-lobbies', JSON.stringify(lobbies));
};

const broadcastUpdate = (lobbyId: string, type: BroadcastMessageType = 'LOBBY_UPDATED') => {
    LOBBY_CHANNEL.postMessage({ type, payload: { lobbyId } });
};

// --- React Components ---

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
            <div key={count} className="countdown-text animate-pop-in">{count > 0 ? count : 'צא!'}</div>
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
                                    <img src={avatar} alt="אווטאר נוכחי" className="w-full h-full object-cover rounded-md" />
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
    const [lobby, setLobby] = useState<LobbyState | null>(null);
    
    // Non-synced states
    const [letterOptions, setLetterOptions] = useState<string[]>([]);
    const [currentLetter, setCurrentLetter] = useState<string>('');
    const [chooserPlayerId, setChooserPlayerId] = useState<string | null>(null);
    const [botPlan, setBotPlan] = useState<BotAnswerAction[]>([]);
    const [botState, setBotState] = useState<BotState | null>(null);
    const [extraTimeFor, setExtraTimeFor] = useState<ExtraTimeTarget>(null);
    const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [playerProgress, setPlayerProgress] = useState<PlayerProgress[]>([]);
    const [forfeitModalContent, setForfeitModalContent] = useState<{ round: string; game: string } | null>(null);

    // Effect to load user profile once on mount
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
    
    // Effect to listen for real-time lobby updates
    useEffect(() => {
        const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
            if (lobby && event.data.payload.lobbyId === lobby.id) {
                const updatedLobby = getLobby(lobby.id);
                if (updatedLobby) {
                    setLobby(updatedLobby);
                    if (event.data.type === 'GAME_STARTED' && updatedLobby.gameState === 'countdown') {
                        setPage('game');
                        setShowCountdown(true);
                    }
                } else {
                    // Lobby was deleted or closed
                    setLobby(null);
                    setPage('homeMenu');
                    alert('הלובי נסגר על ידי המארח.');
                }
            }
        };

        LOBBY_CHANNEL.addEventListener('message', handleMessage);
        return () => LOBBY_CHANNEL.removeEventListener('message', handleMessage);
    }, [lobby]);


    const updateLobbyAndBroadcast = (lobbyId: string, updateFn: (lobby: LobbyState) => LobbyState) => {
        const currentLobby = getLobby(lobbyId);
        if (currentLobby) {
            const newLobby = updateFn(currentLobby);
            saveLobby(newLobby);
            broadcastUpdate(newLobby.id);
            setLobby(newLobby); // Immediate feedback for the current user
        }
    };

    const getRandomLetters = (count: number) => {
        const shuffled = [...'אבגדהוזחטיכלמנסעפצקרשת'].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    const updateGlobalPlayerStats = useCallback((gameOutcome: GameOverStats) => {
        if (!userProfile || !playerStats || !lobby) return;

        let newStats = { ...playerStats };
        const humanPlayer = lobby.players.find(p => p.id === userProfile.playerId);
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
            const humanGroup = lobby.groups.find(g => g.players.includes(humanPlayer.id));
            if (humanGroup?.groupId === gameOutcome.winner.id) {
                newStats.totalPoints += GLOBAL_SCORE_CONFIG.winPoints;
                newStats.totalWins += 1;
                resultType = 'win';
            } else {
                const teamA = lobby.teamScores.find(ts => ts.groupId === 'A');
                const teamB = lobby.teamScores.find(ts => ts.groupId === 'B');
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
    }, [userProfile, playerStats, lobby]);
    
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
        setLobby({
            id: 'local_solo_game', inviteCode: '',
            settings: {...DEFAULT_SETTINGS, gameMode: mode},
            players: [], groups: [], teamScores: [], gameState: 'lobby',
            currentRound: 1, roundResults: []
        });
        setPage('lobby');
    };
    
    const handleCreateOnlineLobby = (structure: GameStructure) => {
        if (!userProfile?.isProfileComplete || !userProfile.avatarId) return;
        
        const newSettings: GameSettings = {...DEFAULT_SETTINGS, gameMode: 'vs_player', gameStructure: structure };
        const humanPlayer: Player = { 
            id: userProfile.playerId, name: userProfile.nickname!, avatar: userProfile.avatarId, 
            score: 0, isReady: false, playerType: 'human', isHost: true, groupId: 'A'
        };
        const groups = [
            { groupId: 'A', players: [humanPlayer.id] },
            { groupId: 'B', players: [] }
        ];
        
        const newLobby: LobbyState = {
            id: `lobby_${Math.random().toString(36).substring(7)}`,
            inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            settings: newSettings,
            players: [humanPlayer],
            groups,
            teamScores: groups.map(g => ({ groupId: g.groupId, score: 0 })),
            gameState: 'lobby',
            currentRound: 1,
            roundResults: []
        };

        saveLobby(newLobby);
        setLobby(newLobby);
        setPage('onlineLobby');
    };
    
    const handleJoinLobbyAttempt = (code: string) => {
        const lobbies = JSON.parse(localStorage.getItem('eretz-ir-lobbies') || '{}');
        const lobbyToJoin: LobbyState | undefined = Object.values(lobbies).find((l: any) => l.inviteCode === code && l.gameState === 'lobby');

        if (lobbyToJoin && userProfile) {
            const isPlayerInLobby = lobbyToJoin.players.some(p => p.id === userProfile.playerId);
            if (isPlayerInLobby) {
                 setLobby(lobbyToJoin);
                 setPage('onlineLobby');
                 return null; // Already in lobby, just rejoin
            }
            
            const newPlayer: Player = {
                 id: userProfile.playerId, name: userProfile.nickname!, avatar: userProfile.avatarId!,
                 score: 0, isReady: false, playerType: 'human', isHost: false
            };
            
            // Simple logic to add to the emptier team
            const groupA = lobbyToJoin.groups.find(g => g.groupId === 'A')!;
            const groupB = lobbyToJoin.groups.find(g => g.groupId === 'B')!;
            const targetGroup = groupA.players.length <= groupB.players.length ? 'A' : 'B';
            newPlayer.groupId = targetGroup;

            updateLobbyAndBroadcast(lobbyToJoin.id, lobby => {
                lobby.players.push(newPlayer);
                const group = lobby.groups.find(g => g.groupId === targetGroup);
                if(group) group.players.push(newPlayer.id);
                return lobby;
            });
            return null;
        } else {
             return "קוד לובי שגוי או שהמשחק כבר התחיל.";
        }
    }
    
    const handleSettingsChange = (newSettings: Partial<GameSettings>) => {
        if (!lobby) return;
        // FIX: Replaced state mutation with an immutable update. This resolves potential type inference issues and aligns with React best practices for state management.
        updateLobbyAndBroadcast(lobby.id, l => {
            return {
                ...l,
                settings: {
                    ...l.settings,
                    ...newSettings,
                }
            };
        });
    }

    const handlePlayerReady = (playerId: string, isReady: boolean) => {
        if (!lobby) return;
        updateLobbyAndBroadcast(lobby.id, l => {
            l.players = l.players.map(p => p.id === playerId ? { ...p, isReady } : p);
            return l;
        });
    };

    const handleSwitchTeam = (playerId: string) => {
        if (!lobby) return;
        updateLobbyAndBroadcast(lobby.id, l => {
            const player = l.players.find(p => p.id === playerId);
            if (!player || !player.groupId) return l;

            const currentGroupId = player.groupId;
            const otherGroupId = currentGroupId === 'A' ? 'B' : 'A';
            player.groupId = otherGroupId;
            
            const currentGroup = l.groups.find(g => g.groupId === currentGroupId);
            if (currentGroup) currentGroup.players = currentGroup.players.filter(id => id !== playerId);
            
            const otherGroup = l.groups.find(g => g.groupId === otherGroupId);
            if (otherGroup) otherGroup.players.push(playerId);
            
            return l;
        });
    };

    const handleAddBotToLobby = (groupId: string) => {
        if (!lobby) return;
        updateLobbyAndBroadcast(lobby.id, l => {
            const botNumber = l.players.filter(p => p.playerType === 'computer').length + 1;
            const usedAvatars = l.players.map(p => p.avatar);
            const availableBotAvatar = AVATARS.find(av => !usedAvatars.includes(av.src)) || AVATARS[l.players.length % AVATARS.length];
            
            const newBot: Player = {
                id: `p_bot_${Date.now()}`, name: `בוט ${botNumber}`, avatar: availableBotAvatar.src,
                score: 0, isReady: true, playerType: 'computer', groupId: groupId
            };

            l.players.push(newBot);
            const group = l.groups.find(g => g.groupId === groupId);
            if (group) group.players.push(newBot.id);
            return l;
        });
    };

    const handleRemoveBotFromLobby = (playerId: string) => {
        if (!lobby) return;
        updateLobbyAndBroadcast(lobby.id, l => {
            l.players = l.players.filter(p => p.id !== playerId);
            l.groups.forEach(g => {
                g.players = g.players.filter(pId => pId !== playerId);
            });
            return l;
        });
    };
    
    const handleKickPlayer = (playerId: string) => {
         if (!lobby) return;
        updateLobbyAndBroadcast(lobby.id, l => {
            l.players = l.players.filter(p => p.id !== playerId);
            l.groups.forEach(g => {
                g.players = g.players.filter(pId => pId !== playerId);
            });
            return l;
        });
    };

    const handleStartGame = (gameSettings?: GameSettings) => {
        if (!userProfile?.isProfileComplete || !userProfile.avatarId) return;

        if (lobby?.settings.gameMode === 'vs_player') {
            updateLobbyAndBroadcast(lobby.id, l => {
                l.gameState = 'countdown';
                return l;
            });
            broadcastUpdate(lobby.id, 'GAME_STARTED');
            setPage('game');
            setShowCountdown(true);
        } else {
            // Logic for starting a solo/vs_computer game
            const settings = gameSettings || lobby!.settings;
            const humanPlayer: Player = { id: userProfile.playerId, name: userProfile.nickname!, avatar: userProfile.avatarId, score: 0, isReady: true, playerType: 'human' };
            let players = [humanPlayer];
            
            if (settings.gameMode === 'vs_computer') {
                const botAvatarSrc = AVATARS.find(av => av.src !== userProfile.avatarId)?.src || AVATARS[1].src;
                const botPlayer: Player = { id: 'p_bot', name: 'מחשב', avatar: botAvatarSrc, score: 0, isReady: true, playerType: 'computer' };
                players.push(botPlayer);
            }
            
            let groups: Group[] = [];
            if (settings.gameStructure === '1v1' && players.length >= 2) {
                players[0].groupId = 'A';
                players[1].groupId = 'B';
                groups.push({ groupId: 'A', players: [players[0].id] });
                groups.push({ groupId: 'B', players: [players[1].id] });
            }
            
            const teamScores = groups.map(g => ({ groupId: g.groupId, score: 0 }));
            
            const newLobby: LobbyState = {
                id: `solo_${Date.now()}`, inviteCode: '', settings, players, groups, teamScores,
                gameState: 'countdown', currentRound: 1, roundResults: []
            };

            setLobby(newLobby);
            setPage('game');
            setShowCountdown(true);
        }
    };
    
    const handleCountdownFinish = () => {
        if (!lobby) return;
        setShowCountdown(false);
        const chooserIndex = (lobby.currentRound - 1) % lobby.players.length;
        setChooserPlayerId(lobby.players[chooserIndex]?.id || null);
        setLetterOptions(getRandomLetters(3));
        setExtraTimeFor(null);
        setForfeitModalContent(null);
        setPlayerProgress(lobby.players.map(p => ({
            playerId: p.id,
            status: 'waiting',
            answersCount: 0,
            finishedRound: false,
        })));
    };

    const handleLetterSelected = async (letter: string) => {
        if (!lobby) return;
        setCurrentLetter(letter);
        const opponents = lobby.players.filter(p => p.playerType === 'computer');
        if(opponents.length > 0){
            const plannedTime = lobby.settings.roundTime * (0.3 + Math.random() * 0.5);
            setBotState({
                plannedFinishTimeInRound: plannedTime,
                isBotFinished: false,
                hasTriggeredExtraTime: false,
            });

            setIsLoading(true);
            try {
                const plan = await getBotAnswerPlan(letter, lobby.settings.categories, lobby.settings);
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
        if (page !== 'game' || !lobby) return;
        
        setIsLoading(true);
        setError(null);
        setBotState(prev => prev ? { ...prev, isBotFinished: true } : null);
        setPlayerProgress(prev => prev.map(p => (!p.finishedRound ? { ...p, status: 'times_up' } : p)));

        const humanPlayer = lobby.players.find(p => p.playerType === 'human');
        const humanAnswers = humanPlayer ? playerAnswers : {};
        const p1FlatAnswers = Object.entries(humanAnswers).flatMap(([category, answers]) => 
            answers.map(answer => ({ category, answer }))
        ).filter(a => a.answer.trim() !== '');

        try {
            const result = await validateAnswers(currentLetter, lobby.settings.categories, p1FlatAnswers, lobby.players, lobby.settings, lobby.groups, botPlan);
            
            const newLobby: LobbyState = {...lobby};
            newLobby.roundResults.push(result);
            
            newLobby.players.forEach(player => {
                player.score += result.scores[player.id]?.total || 0;
            });

            newLobby.teamScores.forEach(teamScore => {
                const group = newLobby.groups.find(g => g.groupId === teamScore.groupId);
                if (group) {
                    teamScore.score += group.players.reduce((sum, playerId) => sum + (result.scores[playerId]?.total || 0), 0);
                }
            });

            if (lobby.settings.gameMode === 'vs_player') saveLobby(newLobby);
            setLobby(newLobby);
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
    }, [currentLetter, lobby, botPlan, page]);

    const handleHumanFinish = useCallback(() => {
        if (!userProfile || !lobby) return;
        updatePlayerProgress(userProfile.playerId, { status: 'finished', finishedRound: true });

        const humanPlayer = lobby.players.find(p => p.id === userProfile.playerId);
        const humanGroup = lobby.groups.find(g => g.players.includes(humanPlayer?.id || ''));
        if (!humanGroup) return;

        const allTeamFinished = humanGroup.players.every(pId => {
            const progress = playerProgress.find(p => p.playerId === pId);
            return progress?.finishedRound || pId === userProfile.playerId;
        });

        if (allTeamFinished) {
            setExtraTimeFor('bot');
        }
    }, [userProfile, lobby, playerProgress, updatePlayerProgress]);
    
    const handlePrepareForfeit = useCallback(() => {
        if (!lobby) return;
        const humanPlayer = lobby.players.find(p => p.playerType === 'human');
        if (!humanPlayer) return;

        const forfeiterTeamScore = lobby.teamScores.find(ts => ts.groupId === humanPlayer.groupId)?.score || 0;
        const opponentTeamScore = lobby.teamScores.find(ts => ts.groupId !== humanPlayer.groupId)?.score || 0;
        
        const isLastRound = lobby.currentRound === lobby.settings.rounds;
        const forfeiterIsWinning = forfeiterTeamScore > opponentTeamScore;
        const dynamicBonus = (isLastRound || forfeiterIsWinning) ? 50 : 30;

        setForfeitModalContent({
            round: `פרישה מהסיבוב תגרע 20 נקודות ממך ותוסיף בונוס של ${dynamicBonus} נקודות לקבוצה היריבה.`,
            game: `פרישה מהמשחק תגרע 50 נקודות מהניקוד המצטבר שלך ותיתן ניצחון לקבוצה השנייה.`
        });
    }, [lobby]);

    const handleForfeit = useCallback((scope: ForfeitScope) => {
        setForfeitModalContent(null);
        if (!lobby || !userProfile) return;
        const forfeitingPlayer = lobby.players.find(p => p.playerType === 'human');
        if (!forfeitingPlayer) return;
        
        updatePlayerProgress(forfeitingPlayer.id, { status: 'forfeited', finishedRound: true });
        
        let newLobby = {...lobby};
        const forfeiter = newLobby.players.find(p => p.id === forfeitingPlayer.id)!;
        const opponentGroup = newLobby.groups.find(g => g.groupId !== forfeiter.groupId)!;
        
        if (scope === 'forfeit_round') {
            const penalty = -20;
            const forfeiterTeamScore = newLobby.teamScores.find(ts => ts.groupId === forfeiter.groupId)?.score || 0;
            const opponentTeamScore = newLobby.teamScores.find(ts => ts.groupId !== forfeiter.groupId)?.score || 0;
            const isLastRound = newLobby.currentRound === newLobby.settings.rounds;
            const forfeiterIsWinning = forfeiterTeamScore > opponentTeamScore;
            const reward = (isLastRound || forfeiterIsWinning) ? 50 : 30;
            
            forfeiter.score += penalty;
            opponentGroup.players.forEach(pId => {
                newLobby.players.find(p => p.id === pId)!.score += reward / opponentGroup.players.length;
            });
            newLobby.teamScores.forEach(ts => {
                if(ts.groupId === forfeiter.groupId) ts.score += penalty;
                if(ts.groupId === opponentGroup.groupId) ts.score += reward;
            });

            const forfeitResult: RoundResult = {
                letter: currentLetter || '?', answers: {}, scores: {}, summary: '',
                endedBy: 'forfeit', forfeitingPlayerId: forfeitingPlayer.id,
                forfeitingPlayerPenalty: penalty, winnerForfeitPoints: reward,
            };
            newLobby.roundResults.push(forfeitResult);
            setPage('roundResults');

        } else if (scope === 'forfeit_game') {
            const penalty = -50;
            const winnerTeamScore = newLobby.teamScores.find(ts => ts.groupId === opponentGroup.groupId)!;
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
        
        if (lobby.settings.gameMode === 'vs_player') saveLobby(newLobby);
        setLobby(newLobby);
        setCurrentLetter('');
        setBotPlan([]);
        setBotState(null);
    }, [lobby, updatePlayerProgress, userProfile, updateGlobalPlayerStats, currentLetter]);

    const handleNextRound = async () => {
        if (!lobby) return;
        if (lobby.currentRound < lobby.settings.rounds) {
            const newLobby = {...lobby, currentRound: lobby.currentRound + 1};
            if (lobby.settings.gameMode === 'vs_player') saveLobby(newLobby);
            setLobby(newLobby);
            setPage('game');
            setShowCountdown(true);
        } else {
            setIsLoading(true);
            try {
                const stats = await getGameSummary(lobby.roundResults, lobby.players, lobby.groups);
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
        setLobby(null);
        setPage('homeMenu');
    };

    const handleBack = useCallback(() => {
        setLobby(null);
        setPage('homeMenu');
    }, []);
    
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
                return <GameSettingsComponent onStartGame={handleStartGame} onBack={handleBack} settings={lobby!.settings} onSettingsChange={(s) => setLobby(l => l ? {...l, settings: s} : null)} />;
            case 'onlineLobby':
                return lobby ? <OnlineLobby 
                            lobby={lobby}
                            onSettingsChange={handleSettingsChange}
                            onStartGame={handleStartGame}
                            onBack={handleBack}
                            onPlayerReady={handlePlayerReady}
                            onSwitchTeam={handleSwitchTeam}
                            userProfile={userProfile}
                            onAddBotToLobby={handleAddBotToLobby}
                            onRemoveBotFromLobby={handleRemoveBotFromLobby}
                            onKickPlayer={handleKickPlayer}
                        /> : null;
            case 'game':
                if (!lobby) return null;
                if (showCountdown) return null;
                const chooser = lobby.players.find(p => p.id === chooserPlayerId);
                const humanPlayer = lobby.players.find(p => p.playerType === 'human');
                const humanAnswersCount = playerProgress.find(p => p.playerId === humanPlayer?.id)?.answersCount ?? 0;
                return (
                    <GameRound
                        letterOptions={letterOptions}
                        chosenLetter={currentLetter}
                        categories={lobby.settings.categories}
                        duration={lobby.settings.roundTime}
                        difficulty={lobby.settings.difficulty}
                        onFinishRound={handleRoundFinish}
                        onLetterSelected={handleLetterSelected}
                        chooserPlayerId={chooserPlayerId}
                        chooserName={chooser?.name || ''}
                        players={lobby.players}
                        groups={lobby.groups}
                        gameMode={lobby.settings.gameMode}
                        botPlan={botPlan}
                        botState={botState}
                        extraTimeFor={extraTimeFor}
                        onHumanFinish={handleHumanFinish}
                        onBotFinish={(botId: string) => {
                            handleOpponentFinished(botId);
                            const allBotsFinished = lobby!.players.filter(p => p.playerType === 'computer').every(bot => 
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
                 if (!lobby) return null;
                 const lastResult = lobby.roundResults[lobby.roundResults.length - 1];
                 return lastResult ? (
                    <ResultsTable
                        result={lastResult}
                        players={lobby.players}
                        groups={lobby.groups}
                        teamScores={lobby.teamScores}
                        currentRound={lobby.currentRound}
                        totalRounds={lobby.settings.rounds}
                        isGameOver={page === 'gameOver'}
                        gameOverStats={gameOverStats}
                        onNextRound={handleNextRound}
                        onNewGame={handleNewGame}
                        gameMode={lobby.settings.gameMode}
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
                        {userProfile.avatarId && <img src={userProfile.avatarId} alt="אווטאר" className="w-10 h-10 rounded-full object-cover" />}
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
