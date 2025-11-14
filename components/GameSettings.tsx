import React, { useState } from 'react';
import { CATEGORIES, ROUND_TIMES, ROUND_COUNTS } from '../constants';
import { GameSettings, GameMode } from '../types';

interface GameSettingsProps {
    onStartGame: (settings: GameSettings) => void;
    settings: GameSettings;
    onSettingsChange: (settings: GameSettings) => void;
    onBack: () => void;
}

const GameSettingsComponent: React.FC<GameSettingsProps> = ({ onStartGame, settings, onSettingsChange, onBack }) => {
    const [customCategory, setCustomCategory] = useState('');

    const handleAddCategory = () => {
        if (customCategory && !settings.categories.includes(customCategory)) {
            onSettingsChange({...settings, categories: [...settings.categories, customCategory]});
            setCustomCategory('');
        }
    };
    
    const handleRemoveCategory = (catToRemove: string) => {
        onSettingsChange({ ...settings, categories: settings.categories.filter(c => c !== catToRemove) });
    };

    const getTitle = () => {
        switch(settings.gameMode) {
            case 'single_player': return 'משחק יחיד';
            case 'vs_computer': return 'נגד המחשב';
            default: return 'הגדרות משחק';
        }
    }

    return (
        <div className="animate-fade-in w-full">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold">{getTitle()}</h2>
                <p className="text-slate-500">הגדירו את חוקי המשחק והתחילו</p>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto">
                {settings.gameMode === 'vs_computer' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">רמת קושי</label>
                        <select 
                            value={settings.difficulty} 
                            onChange={e => onSettingsChange({...settings, difficulty: e.target.value as GameSettings['difficulty']})}
                            className="app-input"
                        >
                            <option value="easy">קל</option>
                            <option value="normal">בינוני</option>
                            <option value="hard">קשה</option>
                        </select>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">זמן לסיבוב (שניות)</label>
                        <select 
                            value={settings.roundTime} 
                            onChange={e => onSettingsChange({...settings, roundTime: +e.target.value})}
                            className="app-input"
                        >
                            {ROUND_TIMES.map(time => <option key={time} value={time}>{time}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">מספר סיבובים</label>
                        <select 
                            value={settings.rounds} 
                            onChange={e => onSettingsChange({...settings, rounds: +e.target.value})}
                            className="app-input"
                        >
                            {ROUND_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">קטגוריות</label>
                    <div className="flex gap-2 mb-3">
                        <input 
                            type="text"
                            value={customCategory}
                            onChange={e => setCustomCategory(e.target.value)}
                            placeholder="הוסף קטגוריה חדשה (למשל: שם של יוטיובר)..."
                            className="app-input"
                        />
                        <button onClick={handleAddCategory} className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors whitespace-nowrap">הוסף</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {settings.categories.map(cat => (
                            <div key={cat} className="flex items-center p-2 text-center rounded-md bg-blue-100 text-blue-800 text-sm">
                                <span>{cat}</span>
                                <button onClick={() => handleRemoveCategory(cat)} className="mr-2 text-blue-500 hover:text-blue-700">
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 mt-8 max-w-2xl mx-auto">
                <button
                    onClick={onBack}
                    className="w-auto px-8 py-3 bg-slate-200 text-slate-700 text-lg font-bold rounded-lg hover:bg-slate-300 transition-colors"
                >
                    חזור
                </button>
                <button
                    onClick={() => onStartGame(settings)}
                    disabled={settings.categories.length < 3}
                    className="w-full px-8 py-3 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300"
                >
                    התחל משחק
                </button>
            </div>
        </div>
    );
};

export default GameSettingsComponent;