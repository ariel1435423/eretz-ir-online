import React from 'react';
import { Player, Group, PlayerProgress } from '../types';

interface OnlineProgressPanelProps {
    players: Player[];
    groups: Group[];
    playerProgress: PlayerProgress[];
    totalCategories: number;
}

const statusTextMap = {
    waiting: 'ממתין...',
    writing: 'כותב...',
    finished: '✓ סיים',
    times_up: "נגמר הזמן!",
    forfeited: 'פרש'
};

const statusIconClassMap = {
    waiting: 'waiting',
    writing: 'writing',
    finished: 'finished',
    times_up: 'times_up',
    forfeited: 'forfeited'
};

const statusOrder = {
    finished: 1,
    writing: 2,
    waiting: 3,
    times_up: 4,
    forfeited: 5
};

const PlayerStatusItem: React.FC<{player: Player, progress: PlayerProgress | undefined, totalCategories: number}> = ({ player, progress, totalCategories }) => {
    const status = progress?.status || 'waiting';
    const teamColor = player.groupId === 'A' ? 'text-blue-600' : 'text-red-600';
    const isBot = player.playerType === 'computer';

    return (
        <li className="player-item">
            <span className={`status-icon ${statusIconClassMap[status]}`}></span>
            <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
            <div className="flex-grow">
                <p className="font-semibold text-sm flex items-center">{player.name}
                {isBot && <span className="text-xs bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full mr-2">BOT</span>}
                </p>
                <p className={`text-xs font-bold ${teamColor}`}>קבוצה {player.groupId}</p>
            </div>
             <span className="text-xs text-slate-500 w-12 text-center font-medium">{progress?.answersCount ?? 0}/{totalCategories}</span>
            <span className="text-xs text-slate-500 font-medium w-16 text-right">{statusTextMap[status]}</span>
        </li>
    );
};

const OnlineProgressPanel: React.FC<OnlineProgressPanelProps> = ({ players, groups, playerProgress, totalCategories }) => {

    const allPlayersSorted = [...players].sort((a,b) => {
        // Sort by human first, then by name
        if(a.playerType === 'human' && b.playerType !== 'human') return -1;
        if(a.playerType !== 'human' && b.playerType === 'human') return 1;
        return a.name.localeCompare(b.name);
    })

    const getSortedTeamPlayers = (teamId: string) => {
        const team = groups.find(g => g.groupId === teamId);
        if (!team) return [];

        const teamPlayers = team.players
            .map(pId => players.find(p => p.id === pId))
            .filter((p): p is Player => !!p);

        // Include the human player if they are in this team
        const humanPlayer = players.find(p => p.playerType === 'human' && p.groupId === teamId);
        if(humanPlayer && !teamPlayers.find(p => p.id === humanPlayer.id)) {
            teamPlayers.push(humanPlayer);
        }

        return teamPlayers.sort((a, b) => {
                const progressA = playerProgress.find(p => p.playerId === a.id);
                const progressB = playerProgress.find(p => p.playerId === b.id);
                const statusA = progressA?.status || 'waiting';
                const statusB = progressB?.status || 'waiting';
                const orderDiff = statusOrder[statusA] - statusOrder[statusB];
                if (orderDiff !== 0) return orderDiff;
                 // Put human player first within their status group
                if (a.playerType === 'human') return -1;
                if (b.playerType === 'human') return 1;
                return 0;
            });
    };

    const teamAPlayers = getSortedTeamPlayers('A');
    const teamBPlayers = getSortedTeamPlayers('B');

    const hasTeams = groups.length > 0;
    
    return (
        <div className="progress-panel animate-fade-in">
            <h3 className="text-lg font-bold text-center mb-3 border-b pb-2">התקדמות שחקנים</h3>
            <div className="space-y-3">
                {hasTeams ? (
                    <>
                        {groups.find(g => g.groupId === 'A') && teamAPlayers.length > 0 && (
                            <div>
                                <h4 className="font-bold text-blue-600 mb-1">קבוצה A</h4>
                                <ul className="space-y-1">
                                {teamAPlayers.map(p => <PlayerStatusItem key={p.id} player={p} progress={playerProgress.find(prog => prog.playerId === p.id)} totalCategories={totalCategories}/>)}
                                </ul>
                            </div>
                        )}
                        {groups.find(g => g.groupId === 'B') && teamBPlayers.length > 0 &&(
                            <div>
                                <h4 className="font-bold text-red-600 mb-1">קבוצה B</h4>
                                <ul className="space-y-1">
                                {teamBPlayers.map(p => <PlayerStatusItem key={p.id} player={p} progress={playerProgress.find(prog => prog.playerId === p.id)} totalCategories={totalCategories}/>)}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                     <ul className="space-y-1">
                        {allPlayersSorted.map(p => <PlayerStatusItem key={p.id} player={p} progress={playerProgress.find(prog => prog.playerId === p.id)} totalCategories={totalCategories} />)}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default OnlineProgressPanel;