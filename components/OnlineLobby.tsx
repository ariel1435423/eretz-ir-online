
import React, { useState } from 'react';
import { CATEGORIES, ROUND_TIMES, ROUND_COUNTS } from '../constants';
import { GameSettings, Player, Group, UserProfile, LobbyState } from '../types';

interface OnlineLobbyProps {
    lobby: LobbyState;
    onSettingsChange: (settings: Partial<GameSettings>) => void;
    userProfile: UserProfile;
    onStartGame: () => void;
    onBack: () => void;
    onPlayerReady: (playerId: string, isReady: boolean) => void;
    onSwitchTeam: (playerId: string) => void;
    onAddBotToLobby: (groupId: string) => void;
    onRemoveBotFromLobby: (playerId: string) => void;
    onKickPlayer: (playerId: string) => void;
}

const PlayerListItem: React.FC<{
    player: Player, 
    isHostView: boolean, 
    isCurrentUser: boolean, 
    onSwitchTeam: () => void, 
    onReadyToggle: () => void,
    onRemoveBot: () => void,
    onKickPlayer: () => void,
}> = ({player, isHostView, isCurrentUser, onSwitchTeam, onReadyToggle, onRemoveBot, onKickPlayer}) => {
    
    return (
        <li className="flex items-center gap-3 p-2 bg-white rounded-md shadow-sm">
            <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-grow">
                <div className="font-semibold flex items-center">{player.name} {player.isHost && <span className="host-indicator">(מארח)</span>}</div>
                <div className="flex items-center text-xs text-slate-500">
                    <span className={`ready-indicator ${player.isReady ? 'ready' : 'not-ready'}`}></span>
                    {player.isReady ? 'מוכן' : 'לא מוכן'}
                </div>
            </div>
             <div className="flex items-center gap-1">
                {isCurrentUser && (
                     <button onClick={onReadyToggle} className={`px-2 py-1 text-xs font-bold rounded ${player.isReady ? 'bg-slate-200 text-slate-700' : 'bg-green-500 text-white'}`}>
                        {player.isReady ? 'בטל' : 'מוכן'}
                    </button>
                )}
                {(isHostView || isCurrentUser) && !player.isHost && (
                     <button onClick={onSwitchTeam} className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-blue-100 text-blue-700" title="החלף קבוצה">&#x21C6;</button>
                )}
                {isHostView && player.playerType === 'computer' && (
                    <button onClick={onRemoveBot} className="w-6 h-6 flex items-center justify-center text-sm font-bold rounded bg-red-100 text-red-700" title="הסר בוט">&times;</button>
                )}
                 {isHostView && player.playerType === 'human' && !player.isHost && (
                    <button onClick={onKickPlayer} className="w-6 h-6 flex items-center justify-center text-sm font-bold rounded bg-red-100 text-red-700" title="העף שחקן">&times;</button>
                )}
            </div>
        </li>
    );
};

const SettingsPanel: React.FC<{settings: GameSettings, onSettingsChange: (settings: Partial<GameSettings>) => void, isHost: boolean}> = ({settings, onSettingsChange, isHost}) => {
    const [customCategory, setCustomCategory] = useState('');

    const handleAddCategory = () => {
        if (customCategory.trim() && !settings.categories.includes(customCategory.trim()) && isHost) {
            onSettingsChange({ categories: [...settings.categories, customCategory.trim()] });
            setCustomCategory('');
        }
    };

    const handleRemoveCategory = (catToRemove: string) => {
        if (isHost) {
            onSettingsChange({ categories: settings.categories.filter(c => c !== catToRemove) });
        }
    };
    
    return (
        <div className="lobby-settings">
            <h3 className="text-xl font-bold border-b pb-2 mb-4">הגדרות המשחק</h3>
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">זמן לסיבוב</label>
                        <select 
                            value={settings.roundTime} 
                            onChange={e => onSettingsChange({ roundTime: +e.target.value})}
                            className="app-input"
                            disabled={!isHost}
                        >
                            {ROUND_TIMES.map(time => <option key={time} value={time}>{time} שנ'</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">מספר סיבובים</label>
                        <select 
                            value={settings.rounds} 
                            onChange={e => onSettingsChange({ rounds: +e.target.value})}
                            className="app-input"
                            disabled={!isHost}
                        >
                            {ROUND_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">קטגוריות</label>
                    {isHost && (
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={customCategory}
                                onChange={e => setCustomCategory(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                                placeholder="הוסף קטגוריה חדשה..."
                                className="app-input"
                            />
                            <button onClick={handleAddCategory} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors whitespace-nowrap">הוסף</button>
                        </div>
                    )}
                     <div className="flex flex-wrap gap-2 min-h-[40px]">
                         {settings.categories.map(cat => (
                            <div key={cat} className="category-tag">
                                {isHost && (
                                    <button onClick={() => handleRemoveCategory(cat)} className="remove-btn">
                                        &times;
                                    </button>
                                )}
                                <span>{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>
                 {isHost ? 
                    <p className="text-xs text-slate-500 pt-2">רק אתה כמארח יכול לשנות את ההגדרות.</p>
                    : <p className="text-xs text-slate-500 pt-2">רק המארח יכול לשנות הגדרות ולהתחיל את המשחק.</p>
                }
            </div>
        </div>
    );
};


const OnlineLobby: React.FC<OnlineLobbyProps> = (props) => {
    const { lobby, onSettingsChange, userProfile, onStartGame, onBack, onPlayerReady, onSwitchTeam, onAddBotToLobby, onRemoveBotFromLobby, onKickPlayer } = props;
    const { settings, players, groups, inviteCode } = lobby;

    const host = players.find(p => p.isHost);
    const isHost = userProfile.playerId === host?.id;
    const allReady = players.every(p => p.isReady);
    
    const teamA = groups.find(g => g.groupId === 'A');
    const teamB = groups.find(g => g.groupId === 'B');

    const getTeamPlayers = (team: Group | undefined): Player[] => {
        if (!team) return [];
        return team.players
            .map(pId => players.find(p => p.id === pId))
            .filter((p): p is Player => !!p);
    };

    const teamAPlayers = getTeamPlayers(teamA);
    const teamBPlayers = getTeamPlayers(teamB);

    const structureCapacityMap = { 
        '1v1': { A: 1, B: 1 }, 
        '2v2': { A: 2, B: 2 }, 
        '1v2': { A: 1, B: 2 }, 
        '1v3': { A: 1, B: 3 },
        'freeForAll': { A: 2, B: 2 }
    };
    const teamCapacities = structureCapacityMap[settings.gameStructure];
    const teamAEmptySlots = Math.max(0, teamCapacities.A - teamAPlayers.length);
    const teamBEmptySlots = Math.max(0, teamCapacities.B - teamBPlayers.length);
    
    const isGameReadyToStart = isHost && allReady && players.length > 1 && teamAPlayers.length > 0 && teamBPlayers.length > 0;

    return (
        <div className="animate-fade-in w-full">
             <header className="w-full flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">לובי אונליין</h1>
                    <p className="text-slate-500">הזמן חברים והתכוננו למשחק</p>
                </div>
                <div className="text-left">
                    <div className="text-sm text-slate-500">קוד הזמנה</div>
                    <div className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xl rounded-md tracking-widest">{inviteCode}</div>
                </div>
            </header>
            
            <div className="lobby-layout">
                {/* Left Side: Players */}
                <div className="lobby-players">
                    <div className="team-container">
                        <h3 className="text-lg font-bold text-center mb-2">קבוצה A</h3>
                        <ul className="space-y-2 min-h-[80px]">
                            {teamAPlayers.map(p => (
                                <PlayerListItem 
                                    key={p.id} 
                                    player={p} 
                                    isHostView={isHost}
                                    isCurrentUser={p.id === userProfile.playerId}
                                    onSwitchTeam={() => onSwitchTeam(p.id)}
                                    onReadyToggle={() => onPlayerReady(p.id, !p.isReady)}
                                    onRemoveBot={() => onRemoveBotFromLobby(p.id)}
                                    onKickPlayer={() => onKickPlayer(p.id)}
                                />
                            ))}
                            {isHost && Array.from({ length: teamAEmptySlots }).map((_, i) => (
                                <li key={`empty-A-${i}`}>
                                    <button onClick={() => onAddBotToLobby('A')} className="w-full text-center p-3 border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 rounded-md transition-colors">
                                        + הוסף בוט
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="team-container">
                        <h3 className="text-lg font-bold text-center mb-2">קבוצה B</h3>
                         <ul className="space-y-2 min-h-[80px]">
                             {teamBPlayers.map(p => (
                                <PlayerListItem 
                                    key={p.id} 
                                    player={p} 
                                    isHostView={isHost}
                                    isCurrentUser={p.id === userProfile.playerId}
                                    onSwitchTeam={() => onSwitchTeam(p.id)}
                                    onReadyToggle={() => onPlayerReady(p.id, !p.isReady)}
                                    onRemoveBot={() => onRemoveBotFromLobby(p.id)}
                                    onKickPlayer={() => onKickPlayer(p.id)}
                                />
                            ))}
                             {isHost && Array.from({ length: teamBEmptySlots }).map((_, i) => (
                                <li key={`empty-B-${i}`}>
                                    <button onClick={() => onAddBotToLobby('B')} className="w-full text-center p-3 border-2 border-dashed border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400 rounded-md transition-colors">
                                        + הוסף בוט
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Side: Settings */}
                 <SettingsPanel settings={settings} onSettingsChange={onSettingsChange} isHost={isHost} />
            </div>

            <div className="flex items-center gap-4 mt-8">
                <button
                    onClick={onBack}
                    className="w-auto px-8 py-3 bg-slate-200 text-slate-700 text-lg font-bold rounded-lg hover:bg-slate-300 transition-colors"
                >
                    חזור
                </button>
                <button
                    onClick={onStartGame}
                    disabled={!isGameReadyToStart}
                    className="w-full px-8 py-3 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {!allReady ? 'ממתין שכולם יהיו מוכנים...' : 'התחל משחק!'}
                </button>
            </div>

        </div>
    )
}

export default OnlineLobby;
