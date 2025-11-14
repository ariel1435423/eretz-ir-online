import React, { useState, useEffect } from 'react';
import { GameMode, UserProfile, GameStructure, PlayerStats } from '../types';
import { AVATARS, GAME_STRUCTURES } from '../constants';

interface HomeMenuProps {
    userProfile: UserProfile;
    playerStats: PlayerStats | null;
    onSelectMode: (mode: GameMode) => void;
    onUpdateProfile: (nickname: string, avatarId: string) => void;
    onEditProfile: () => void;
    onCreateOnlineLobby: (structure: GameStructure) => void;
    onNavigateToJoinLobby: () => void;
}

const HomeMenu: React.FC<HomeMenuProps> = ({ userProfile, playerStats, onSelectMode, onUpdateProfile, onEditProfile, onCreateOnlineLobby, onNavigateToJoinLobby }) => {
    const [nickname, setNickname] = useState('');
    const [avatarId, setAvatarId] = useState(AVATARS[0].src);
    const [showOnlineMenu, setShowOnlineMenu] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);

    useEffect(() => {
        if(userProfile) {
            setNickname(userProfile.nickname || '');
            setAvatarId(userProfile.avatarId || AVATARS[0].src);
        }
    }, [userProfile]);

    const handleSave = () => {
        if (nickname.trim()) {
            onUpdateProfile(nickname.trim(), avatarId);
        }
    };

    return (
        <div className="w-full animate-fade-in">
             { !userProfile.isProfileComplete ? (
                 <div className="bg-white p-6 rounded-lg shadow-md mb-10 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-4">יצירת פרופיל שחקן</h2>
                     <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-grow space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">כינוי</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    placeholder="השם שלכם..."
                                    className="app-input text-lg"
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={!nickname.trim()}
                                className="w-full px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                            >
                                שמור והמשך
                            </button>
                        </div>
                        <div className="flex-shrink-0 w-full md:max-w-sm">
                             <label className="block text-sm text-center font-medium text-slate-600 mb-2">אווטאר</label>
                             <div className="avatar-picker-grid bg-slate-50 p-3 rounded-lg">
                                {AVATARS.map(av => (
                                    <button key={av.id} onClick={() => setAvatarId(av.src)} className={`avatar-select ${avatarId === av.src ? 'selected' : ''}`}>
                                        <img src={av.src} alt={av.name} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <header className="flex items-center justify-between w-full mb-10">
                    <div className="flex items-center gap-4">
                        {userProfile.avatarId && <img src={userProfile.avatarId} alt="avatar" className="w-20 h-20 rounded-full object-cover bg-slate-200" />}
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{userProfile.nickname}</h1>
                             <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-slate-600">נקודות: {playerStats?.totalPoints ?? 0}</span>
                                <button onClick={onEditProfile} className="text-sm text-blue-600 hover:underline">ערוך פרופיל</button>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:block text-right">
                        <h2 className="text-4xl font-bold text-slate-800">ארץ עיר Online</h2>
                        <p className="text-slate-500">המשחק האינטראקטיבי</p>
                    </div>
                </header>
            )}

            <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => onSelectMode('single_player')} disabled={!userProfile.isProfileComplete} className="home-menu-tile bg-white p-8 rounded-lg shadow-md text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    <div className="text-6xl mb-4">🙂</div>
                    <h3 className="text-2xl font-bold">שחק לבד</h3>
                    <p className="text-slate-500">שחק בקצב שלך</p>
                </button>
                <button onClick={() => onSelectMode('vs_computer')} disabled={!userProfile.isProfileComplete} className="home-menu-tile bg-white p-8 rounded-lg shadow-md text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    <div className="text-6xl mb-4">🤖</div>
                    <h3 className="text-2xl font-bold">נגד המחשב</h3>
                    <p className="text-slate-500">אתגר את הבינה המלאכותית</p>
                </button>
                <div className="relative">
                    <button onClick={() => setShowOnlineMenu(prev => !prev)} disabled={!userProfile.isProfileComplete} className="home-menu-tile bg-white p-8 rounded-lg shadow-md text-center w-full h-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-2xl font-bold">משחק אונליין</h3>
                        <p className="text-slate-500">שחק נגד חברים</p>
                    </button>
                    {showOnlineMenu && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-lg shadow-xl p-4 z-10 animate-fade-in">
                             <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => { setShowCreateMenu(true); setShowOnlineMenu(false); }}
                                    className="w-full text-center p-3 bg-blue-500 text-white font-bold hover:bg-blue-600 rounded-md"
                                >
                                    צור לובי חדש
                                </button>
                                 <button
                                    onClick={onNavigateToJoinLobby}
                                    className="w-full text-center p-3 bg-slate-200 hover:bg-slate-300 rounded-md"
                                >
                                    הצטרף עם קוד
                                </button>
                            </div>
                        </div>
                    )}
                     {showCreateMenu && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-lg shadow-xl p-4 z-10 animate-fade-in">
                            <h4 className="font-bold text-center mb-2">בחר מבנה משחק</h4>
                            <div className="flex flex-col gap-2">
                                {(Object.keys(GAME_STRUCTURES) as Array<keyof typeof GAME_STRUCTURES>).map(structure => (
                                    <button
                                        key={structure}
                                        onClick={() => onCreateOnlineLobby(structure)}
                                        className="w-full text-center p-2 bg-slate-100 hover:bg-slate-200 rounded-md"
                                    >
                                        {GAME_STRUCTURES[structure]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="text-center mt-10 text-slate-400">
                <p>כללים | הגדרות | אודות</p>
            </footer>
        </div>
    );
};

export default HomeMenu;