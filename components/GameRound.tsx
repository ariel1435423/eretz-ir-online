import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getHint } from '../services/geminiService';
import { Player, GameSettings, BotAnswerAction, BotState, ForfeitScope, ExtraTimeTarget, Group, GameMode, PlayerProgress } from '../types';
import OnlineProgressPanel from './OnlineProgressPanel';

interface GameRoundProps {
    letterOptions: string[];
    chosenLetter: string;
    categories: string[];
    duration: number;
    chooserPlayerId: string | null;
    chooserName: string;
    players: Player[];
    groups: Group[];
    gameMode: GameMode;
    difficulty: GameSettings['difficulty'];
    botPlan: BotAnswerAction[];
    botState: BotState | null;
    extraTimeFor: ExtraTimeTarget;
    playerProgress: PlayerProgress[];
    humanAnswersCount: number;
    forfeitModalContent: { round: string; game: string } | null;
    onLetterSelected: (letter: string) => void;
    onFinishRound: (answers: Record<string, string[]>) => void;
    onHumanFinish: () => void;
    onBotFinish: (botId: string) => void;
    onForfeit: (scope: ForfeitScope) => void;
    onPrepareForfeit: () => void;
    onPlayerStartedWriting: (playerId: string) => void;
    onHumanAnswerCountChange: (count: number) => void;
    onBotAnswerCountChange: (botId: string, count: number) => void;
}

const ForfeitModal: React.FC<{ 
    onConfirm: (scope: ForfeitScope) => void; 
    onClose: () => void;
    modalText: { round: string, game: string };
}> = ({ onConfirm, onClose, modalText }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm text-center animate-pop-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">פרישה</h2>
            <p className="text-slate-600 mb-6 text-sm">{modalText.round}</p>
            <p className="text-slate-600 mb-6 text-sm">{modalText.game}</p>
            <div className="flex flex-col gap-3">
                <button onClick={() => onConfirm('forfeit_round')} className="w-full px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors">פרוש מהסיבוב</button>
                <button onClick={() => onConfirm('forfeit_game')} className="w-full px-6 py-3 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors">פרוש מהמשחק</button>
                <button onClick={onClose} className="w-full px-6 py-3 mt-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors">ביטול</button>
            </div>
        </div>
    </div>
);


const GameRound: React.FC<GameRoundProps> = (props) => {
    const { 
        letterOptions, chosenLetter, categories, duration, chooserPlayerId, chooserName, 
        players, groups, gameMode, botPlan, botState, extraTimeFor, 
        playerProgress, humanAnswersCount, forfeitModalContent,
        onLetterSelected, onFinishRound, onHumanFinish, onBotFinish, onForfeit, 
        onPrepareForfeit, onPlayerStartedWriting, onHumanAnswerCountChange, onBotAnswerCountChange
    } = props;
    
    const [timeLeft, setTimeLeft] = useState(duration);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string[]>>(
        categories.reduce((acc, category) => ({ ...acc, [category]: [''] }), {})
    );
    const [isRoundFinished, setIsRoundFinished] = useState(false);
    const timerRef = useRef<number | null>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const [hint, setHint] = useState<Record<string, { text: string; type: string } | null>>({});
    const [isHintLoading, setIsHintLoading] = useState<string | null>(null);
    const [hintUsed, setHintUsed] = useState(false);
    const [showForfeitModal, setShowForfeitModal] = useState(false);
    
    const actionTimeoutsRef = useRef<number[]>([]);
        
    const humanPlayer = players.find(p => p.playerType === 'human');
    const opponents = players.filter(p => p.playerType === 'computer');
    const isChoosingPhase = !chosenLetter;
    const isBotChoosing = isChoosingPhase && opponents.some(o => o.id === chooserPlayerId);
    const humanProgress = playerProgress.find(p => p.playerId === humanPlayer?.id);
    const humanFinished = humanProgress?.finishedRound || false;

    const handleFinishRound = useCallback(() => {
        if (isRoundFinished) return;
        setIsRoundFinished(true);
        if (timerRef.current) clearInterval(timerRef.current);
        actionTimeoutsRef.current.forEach(clearTimeout);
        const cleanedAnswers: Record<string, string[]> = {};
        for (const category in answers) {
            cleanedAnswers[category] = answers[category].filter(ans => ans.trim() !== '');
        }
        onFinishRound(cleanedAnswers);
    }, [isRoundFinished, onFinishRound, answers]);

    const handleHumanClickFinish = () => {
        onHumanFinish();
        if (gameMode === 'vs_computer' && botState?.isBotFinished) {
            handleFinishRound();
        }
    }
    
    useEffect(() => {
        if (isChoosingPhase || isRoundFinished) return;
        
        timerRef.current = window.setInterval(() => {
            if (botState && !botState.isBotFinished) {
                const canBotFinish = humanAnswersCount >= 4 || timeLeft < 8;
                const botWantsToFinish = elapsedTime >= botState.plannedFinishTimeInRound;
                if (canBotFinish && botWantsToFinish) {
                    opponents.forEach(opp => onBotFinish(opp.id));
                }
            }

            setTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    handleFinishRound();
                    return 0;
                }
                return newTime;
            });
            setElapsedTime(prev => prev + 1);
        }, 1000);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isChoosingPhase, isRoundFinished, handleFinishRound, botState, humanAnswersCount, timeLeft, elapsedTime, onBotFinish, opponents]);

    useEffect(() => {
        if (extraTimeFor === 'human') {
            setTimeLeft(prev => Math.min(prev, 15));
        } else if (extraTimeFor === 'bot') {
            const botExtraTimeTimer = setTimeout(() => {
                if(!botState?.isBotFinished) {
                    handleFinishRound();
                }
            }, 15000);
            return () => clearTimeout(botExtraTimeTimer);
        }
    }, [extraTimeFor, botState, handleFinishRound]);

    useEffect(() => {
        if (isBotChoosing) {
            const choiceDelay = (Math.random() * 4 + 2) * 1000;
            const timeoutId = setTimeout(() => {
                const letter = letterOptions[Math.floor(Math.random() * letterOptions.length)];
                onLetterSelected(letter);
            }, choiceDelay);
            return () => clearTimeout(timeoutId);
        }
    }, [isBotChoosing, letterOptions, onLetterSelected]);
    
    useEffect(() => {
        if (isChoosingPhase || opponents.length === 0 || botPlan.length === 0) return;

        actionTimeoutsRef.current.forEach(clearTimeout);
        actionTimeoutsRef.current = [];

        const answeringActions = botPlan.filter(a => a.type === 'answering');
        let completedCount = 0;

        answeringActions.forEach(action => {
            const timeoutId = window.setTimeout(() => {
                completedCount++;
                opponents.forEach(opp => {
                    onBotAnswerCountChange(opp.id, completedCount);
                });
            }, action.delay * 1000);
            actionTimeoutsRef.current.push(timeoutId);
        });

        return () => { actionTimeoutsRef.current.forEach(clearTimeout); };
    }, [isChoosingPhase, opponents, botPlan, onBotAnswerCountChange]);

    useEffect(() => {
        if (!isChoosingPhase && firstInputRef.current) {
            firstInputRef.current.focus();
        }
    }, [isChoosingPhase]);
    
     useEffect(() => {
        if (forfeitModalContent) {
            setShowForfeitModal(true);
        } else {
            setShowForfeitModal(false);
        }
    }, [forfeitModalContent]);

    const handleAnswerChange = (category: string, index: number, value: string) => {
        const newAnswers = { ...answers };
        const oldVal = newAnswers[category][index];
        newAnswers[category][index] = value;
        setAnswers(newAnswers);

        let currentFilled = 0;
        for (const cat in newAnswers) {
            if (newAnswers[cat].some(ans => ans.trim() !== '')) {
                currentFilled++;
            }
        }
        onHumanAnswerCountChange(currentFilled);

        if (oldVal.trim() === '' && value.trim() !== '') {
            if(humanPlayer) onPlayerStartedWriting(humanPlayer.id);
        }
    };

    const addAnswerField = (category: string) => {
        setAnswers(prev => ({
            ...prev,
            [category]: [...prev[category], '']
        }));
    };
    
    const handleHintRequest = async (category: string) => {
        if (hintUsed || isHintLoading || !chosenLetter) return;
        setIsHintLoading(category);
        try {
            const hintResult = await getHint(category, chosenLetter);
            setHint(prev => ({ ...prev, [category]: { text: hintResult.hintText, type: hintResult.hintType } }));
            setHintUsed(true);
        } catch (error) {
            console.error("Failed to get hint:", error);
            setHint(prev => ({ ...prev, [category]: { text: "שגיאה בקבלת רמז", type: "error" } }));
        } finally {
            setIsHintLoading(null);
        }
    };

    const timerColor = timeLeft <= 10 ? 'text-red-500' : 'text-slate-800';

    if (isChoosingPhase) {
        return (
            <div className="flex flex-col items-center animate-fade-in w-full text-center">
                 <h2 className="text-3xl mb-2">תורו של <span className="font-bold">{chooserName}</span> לבחור אות</h2>
                 {isBotChoosing ? (
                     <p className="text-slate-500 mb-8">המחשב חושב...</p>
                 ) : (
                     <p className="text-slate-500 mb-8">בחר אחת מהאותיות כדי להתחיל את הסיבוב</p>
                 )}
                <div className="flex gap-4">
                    {letterOptions.map(letter => (
                        <button key={letter} onClick={() => onLetterSelected(letter)} disabled={chooserPlayerId !== humanPlayer?.id} className="w-24 h-24 text-5xl font-bold bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-transform hover:scale-110 disabled:bg-slate-400 disabled:scale-100 disabled:cursor-not-allowed">
                            {letter}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="game-layout">
            {showForfeitModal && forfeitModalContent && <ForfeitModal onConfirm={onForfeit} onClose={() => setShowForfeitModal(false)} modalText={forfeitModalContent} />}
            <div className={`game-main-content flex flex-col items-center animate-fade-in w-full p-4 rounded-lg transition-shadow duration-500 ${extraTimeFor === 'human' && !isRoundFinished ? 'extra-time-pulse' : ''}`}>
                <div className="flex justify-between items-center w-full mb-6">
                    <div className="flex gap-2">
                        <button onClick={onPrepareForfeit} className="text-red-500 hover:text-red-700 font-semibold">פרוש</button>
                    </div>
                    <div className="text-center animate-pop-in">
                        <div className="text-slate-500 text-sm">האות</div>
                        <div className="text-7xl font-bold">{chosenLetter}</div>
                    </div>
                     <div className="text-center">
                        <div className="text-slate-500 text-sm">זמן נותר</div>
                        <div className={`text-7xl font-bold transition-colors ${timerColor}`}>{timeLeft}</div>
                    </div>
                </div>
                {extraTimeFor === 'human' && !isRoundFinished && <div className="text-center text-red-500 font-bold mb-4 animate-fade-in">היריב סיים! 15 שניות אחרונות!</div>}
                {extraTimeFor === 'bot' && !isRoundFinished && <div className="text-center text-blue-500 font-bold mb-4 animate-fade-in">סיימת! ממתין ליריבים...</div>}


                <div className="w-full space-y-3">
                    {categories.map((category, catIndex) => (
                        <div key={category} className="flex items-start gap-4">
                            <div className="w-32 flex-shrink-0 text-right pr-2">
                                 <label className="text-lg text-slate-600 font-medium">{category}</label>
                                 <div className="flex justify-end items-center mt-1">
                                     <button onClick={() => addAnswerField(category)} disabled={isRoundFinished || humanFinished} className="text-blue-500 hover:text-blue-700 disabled:text-slate-300 text-2xl font-bold leading-none h-6 w-6 flex items-center justify-center" title="הוסף תשובה">+</button>
                                     <button onClick={() => handleHintRequest(category)} disabled={hintUsed || !!isHintLoading || isRoundFinished || humanFinished} className="mr-2 text-amber-500 hover:text-amber-700 disabled:text-slate-300 disabled:cursor-not-allowed text-lg font-bold h-6 w-6 flex items-center justify-center rounded-full border border-amber-500 disabled:border-slate-300" title="בקש רמז (אחד לסיבוב)">?</button>
                                 </div>
                            </div>
                            <div className="w-full space-y-2">
                                 {answers[category].map((answer, ansIndex) => (
                                    <input
                                        key={ansIndex}
                                        ref={catIndex === 0 && ansIndex === 0 ? firstInputRef : null}
                                        type="text"
                                        value={answer}
                                        onChange={(e) => handleAnswerChange(category, ansIndex, e.target.value)}
                                        placeholder={`הכנס ${category} באות ${chosenLetter}...`}
                                        className="app-input"
                                        disabled={isRoundFinished || humanFinished}
                                    />
                                 ))}
                                 {isHintLoading === category && <div className="text-sm text-slate-500 animate-pulse">חושב על רמז...</div>}
                                 {hint[category] && (
                                    <div className="text-sm p-2 bg-amber-50 rounded-md text-amber-800 mt-2 animate-fade-in">
                                        <strong>רמז ({hint[category]?.type}):</strong> {hint[category]?.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleHumanClickFinish}
                    disabled={isRoundFinished || humanFinished}
                    className="w-full mt-8 px-8 py-3 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isRoundFinished ? 'ממתין...' : (humanFinished ? 'ממתין ליריב...' : 'סיימתי!')}
                </button>
            </div>
            <div className="progress-panel-container">
                <OnlineProgressPanel 
                    players={players} 
                    groups={groups} 
                    playerProgress={playerProgress}
                    totalCategories={categories.length}
                />
            </div>
        </div>
    );
};

export default GameRound;