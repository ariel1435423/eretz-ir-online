import React, { useState } from 'react';

interface JoinLobbyProps {
    onJoin: (code: string) => string | null;
    onBack: () => void;
}

const JoinLobby: React.FC<JoinLobbyProps> = ({ onJoin, onBack }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleJoin = () => {
        setError(null);
        if (code.trim().length === 0) {
            setError("יש להזין קוד.");
            return;
        }
        const joinError = onJoin(code.toUpperCase());
        if (joinError) {
            setError(joinError);
        }
    };
    
    return (
        <div className="w-full max-w-md mx-auto animate-fade-in text-center">
            <h2 className="text-3xl font-bold mb-4">הצטרפות ללובי</h2>
            <p className="text-slate-500 mb-8">הזן את קוד ההזמנה שקיבלת כדי להצטרף למשחק.</p>
            
            <div className="space-y-4">
                <input 
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ABCDEF"
                    maxLength={6}
                    className="app-input text-center text-2xl tracking-[.2em] uppercase"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    onClick={handleJoin}
                    className="w-full px-8 py-3 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                    הצטרף
                </button>
                 <button
                    onClick={onBack}
                    className="w-full px-8 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
                >
                    חזור
                </button>
            </div>

        </div>
    );
};

export default JoinLobby;