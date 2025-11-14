import React, { useState, useEffect } from 'react';
import { RoundResult, Player, Answer, GameSettings, GameOverStats, Group, TeamScore, PlayerStats } from '../types';

interface ResultsTableProps {
    result: RoundResult;
    players: Player[];
    groups: Group[];
    teamScores: TeamScore[];
    currentRound: number;
    totalRounds: number;
    isGameOver: boolean;
    gameOverStats: GameOverStats | null;
    gameMode: GameSettings['gameMode'];
    playerStats: PlayerStats | null;
    onNextRound: () => void;
    onNewGame: () => void;
    onBack: () => void;
}

const AnswerCell: React.FC<{ answers: Answer[], category: string }> = ({ answers, category }) => {
    const categoryAnswers = answers.filter(a => a.category === category);
    
    if (categoryAnswers.length === 0 || (categoryAnswers.length === 1 && !categoryAnswers[0].answer)) {
        return <div className="text-slate-400">-</div>;
    }
    
    const cellStyle = (status: 'valid' | 'invalid') => status === 'valid' ? 'text-green-700' : 'text-red-700';

    return (
        <ul className="list-none m-0 p-0">
            {categoryAnswers.map((ans, index) => (
                <li key={index} className={cellStyle(ans.status)}>
                    {ans.answer}
                    <span className="font-bold mr-2">({ans.score}{ans.rarityBonus > 0 ? `+${ans.rarityBonus}`: ''})</span>
                    {ans.status === 'invalid' && ans.reason && <span className="text-xs text-slate-500 block">{ans.reason}</span>}
                    {ans.conflict && <span className="text-xs text-yellow-600 block">(כפל)</span>}
                </li>
            ))}
        </ul>
    );
};

const PlayerHeader: React.FC<{ player: Player }> = ({ player }) => (
    <div className="flex items-center gap-2">
        <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
        <span>{player.name}</span>
    </div>
);


const GameOverDisplay: React.FC<{ players: Player[], stats: GameOverStats, onNewGame: () => void, groups: Group[], teamScores: TeamScore[], onBack: () => void, playerStats: PlayerStats | null }> = ({ players, stats, onNewGame, groups, teamScores, onBack, playerStats }) => {
    
    const { winner, endedBy, forfeitingPlayerId, forfeitingPlayerPenalty } = stats;
    const forfeitingPlayer = players.find(p => p.id === forfeitingPlayerId);

    if(endedBy === 'forfeit' && forfeitingPlayer) {
        return (
             <div className="text-center">
                <h2 className="text-4xl font-bold mb-4">המשחק הסתיים!</h2>
                <div className="my-6 animate-pop-in">
                    <div className="text-6xl bg-slate-200 p-4 rounded-full inline-block">{winner.avatar ? <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full object-cover" /> : '🏆'}</div>
                    <p className="text-xl mt-4"><span className="font-bold text-red-600">{forfeitingPlayer.name}</span> פרש מהמשחק.</p>
                    <p className="text-2xl mt-2">הקבוצה המנצחת היא <span className="text-blue-600 font-bold">{winner.name}!</span></p>
                    <p className="text-lg text-slate-500">{forfeitingPlayer.name} קיבל עונש של {forfeitingPlayerPenalty} נקודות.</p>
                </div>
                 <div className="flex justify-center gap-4 mt-6">
                     <button onClick={onBack} className="px-8 py-3 bg-slate-200 text-slate-700 text-lg rounded-lg hover:bg-slate-300 transition-colors">לתפריט הראשי</button>
                     <button onClick={onNewGame} className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors">שחק שוב</button>
                </div>
            </div>
        )
    }

    return (
        <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">המשחק הסתיים!</h2>
            <div className="my-6 animate-pop-in">
                 <div className="inline-block p-1 bg-slate-200 rounded-full">{winner.avatar ? <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full object-cover" /> : <span className="text-6xl p-4">🏆</span>}</div>
                 <p className="text-2xl mt-4">המנצחת היא <span className="text-blue-600 font-bold">{winner.name}!</span></p>
                 <p className="text-xl text-slate-600">{winner.score} נקודות</p>
            </div>
            
            <div className="flex justify-center gap-8 my-6 text-xl">
                 {teamScores.map(ts => (
                    <div key={ts.groupId} className="flex flex-col items-center p-4 bg-slate-100 rounded-lg">
                        <span className="font-bold">קבוצה {ts.groupId}:</span> {ts.score} נק'
                        <div className="flex mt-2 -space-x-2">
                            {groups.find(g => g.groupId === ts.groupId)?.players.map(pId => {
                                const player = players.find(p => p.id === pId);
                                return player ? <img key={pId} src={player.avatar} title={player.name} alt={player.name} className="w-8 h-8 rounded-full object-cover border-2 border-white" /> : null;
                            })}
                        </div>
                    </div>
                ))}
            </div>
            
            {playerStats && (
                <div className="p-4 bg-amber-50 rounded-lg max-w-sm mx-auto my-6">
                    <h3 className="font-bold text-lg mb-2">📈 סטטיסטיקת קריירה</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-left">
                        <span>ניקוד כולל:</span> <span className="font-semibold">{playerStats.totalPoints}</span>
                        <span>ניצחונות:</span> <span className="font-semibold">{playerStats.totalWins}</span>
                        <span>סה"כ משחקים:</span> <span className="font-semibold">{playerStats.totalGames}</span>
                        <span>פרישות:</span> <span className="font-semibold">{playerStats.totalForfeits}</span>
                    </div>
                </div>
            )}

            <div className="space-y-4 my-8 text-left max-w-lg mx-auto">
                <div className="p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">🏆 מילים נדירות</h3>
                    <ul className="list-disc pl-5 text-slate-700">
                        {stats.topRareWords.map((word, i) => <li key={i}>"{word.word}" ב{word.category} (+{word.bonus})</li>)}
                    </ul>
                </div>
                {players.map(p => (
                    stats.playerStats[p.id] && p.playerType === 'human' &&
                    <div key={p.id} className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-bold text-lg mb-2">סטטיסטיקות משחק: {p.name}</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span>תשובות נכונות:</span> <span className="font-semibold">{stats.playerStats[p.id].correctAnswers}</span>
                            <span>תשובות שגויות:</span> <span className="font-semibold">{stats.playerStats[p.id].invalidAnswers}</span>
                            <span>כפילויות:</span> <span className="font-semibold">{stats.playerStats[p.id].conflicts}</span>
                            <span>קטגוריה חזקה:</span> <span className="font-semibold">{stats.playerStats[p.id].strongestCategory.category}</span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-center gap-4 mt-6">
                 <button
                    onClick={onBack}
                    className="px-8 py-3 bg-slate-200 text-slate-700 text-lg rounded-lg hover:bg-slate-300 transition-colors"
                 >
                    לתפריט הראשי
                </button>
                 <button
                    onClick={onNewGame}
                    className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors"
                 >
                    שחק שוב
                </button>
            </div>
        </div>
    );
};
    
const RoundResultsDisplay: React.FC<Omit<ResultsTableProps, 'isGameOver' | 'gameOverStats' | 'onBack' | 'onNewGame' | 'playerStats'>> = (props) => {
    const { result, players, groups, teamScores, currentRound, totalRounds, onNextRound, gameMode } = props;
    const [countdown, setCountdown] = useState(10);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    
    useEffect(() => {
        if (gameMode !== 'vs_player') {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onNextRound();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameMode, onNextRound]);

    const handleContinue = () => {
        setIsPlayerReady(true);
        // Simulate waiting for other players
        setTimeout(() => {
            onNextRound();
        }, 1200);
    }

    const categories = [...new Set(Object.values(result.answers).flat().map(a => a.category))];
    const sortedPlayers = groups.flatMap(g => 
        g.players.map(pId => players.find(p => p.id === pId))
    ).filter((p): p is Player => p !== undefined);

    if (result.endedBy === 'forfeit') {
        const forfeitingPlayer = players.find(p => p.id === result.forfeitingPlayerId);
        const winnerPlayers = players.filter(p => p.id !== result.forfeitingPlayerId);
        return (
            <div className="text-center">
                 <h2 className="text-3xl mb-2">סיכום סיבוב {currentRound}/{totalRounds}</h2>
                 <div className="my-6 p-6 bg-slate-100 rounded-lg max-w-md mx-auto">
                    <p className="text-xl"><span className="font-bold text-red-600">{forfeitingPlayer?.name}</span> פרש מהסיבוב.</p>
                    <p className="mt-2 text-lg">היריבים מקבלים <span className="font-bold">{result.winnerForfeitPoints}</span> נקודות בונוס.</p>
                    <p className="text-md text-slate-500">{forfeitingPlayer?.name} קיבל עונש של {result.forfeitingPlayerPenalty} נקודות.</p>
                 </div>
                 <div className="text-center mt-8">
                    <button onClick={onNextRound} className="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors">
                        {currentRound < totalRounds ? `הסיבוב הבא (${countdown})` : `סיכום המשחק (${countdown})`}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
           <h2 className="text-3xl mb-2">סיכום סיבוב {currentRound}/{totalRounds}: אות <span className="font-bold">{result.letter}</span></h2>
           <p className="text-lg text-slate-600 mb-6">{result.summary}</p>

           <div className="w-full overflow-x-auto">
               <table className="min-w-full">
                   <thead>
                       <tr className="border-b-2 border-slate-200">
                           <th className="py-3 text-right font-semibold text-slate-600">קטגוריה</th>
                           {sortedPlayers.map(player => (
                               <th key={player.id} className="py-3 text-right font-semibold text-slate-600">
                                   <PlayerHeader player={player}/>
                                </th>
                           ))}
                       </tr>
                   </thead>
                   <tbody>
                       {categories.map(category => (
                           <tr key={category} className="border-b border-slate-100 bg-white">
                               <td className="py-3 font-medium align-top">{category}</td>
                               {sortedPlayers.map(player => (
                                   <td key={player.id} className="py-3 align-top">
                                       <AnswerCell answers={result.answers[player.id] || []} category={category} />
                                   </td>
                               ))}
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>

            <div className="w-full flex items-center justify-around mt-8">
                {teamScores.map(teamScore => (
                    <div key={teamScore.groupId} className="text-center">
                        <div className="text-slate-500">ניקוד כולל: קבוצה {teamScore.groupId}</div>
                        <div className="text-2xl font-bold">{teamScore.score}</div>
                    </div>
                ))}
            </div>

            <div className="text-center mt-8">
                {gameMode === 'vs_player' ? (
                     <button onClick={handleContinue} disabled={isPlayerReady} className="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400">
                        {isPlayerReady ? 'ממתין לשאר...' : (currentRound < totalRounds ? 'המשך לסיבוב הבא' : 'הצג סיכום משחק')}
                    </button>
                ) : (
                    <button onClick={onNextRound} className="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors">
                        {currentRound < totalRounds ? `הסיבוב הבא (${countdown})` : `סיכום המשחק (${countdown})`}
                    </button>
                )}
            </div>
       </>
   );
};

const ResultsTable: React.FC<ResultsTableProps> = (props) => {
    return (
        <div className="flex flex-col items-center animate-fade-in w-full">
            {props.isGameOver && props.gameOverStats 
                ? <GameOverDisplay players={props.players} stats={props.gameOverStats} onNewGame={props.onNewGame} groups={props.groups} teamScores={props.teamScores} onBack={props.onBack} playerStats={props.playerStats} /> 
                : <RoundResultsDisplay {...props} />
            }
        </div>
    );
};

export default ResultsTable;