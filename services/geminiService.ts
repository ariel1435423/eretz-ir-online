import { GoogleGenAI, Type } from "@google/genai";
import { RoundResult, Player, GameSettings, GameOverStats, RoundResult as RoundResultType, Group, BotAnswerAction, WinnerInfo } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const botAnswerPlanSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['thinking', 'answering'] },
            category: { type: Type.STRING },
            answer: { type: Type.STRING, description: "The bot's answer. Empty for 'thinking' actions." },
            delay: { type: Type.INTEGER, description: "Seconds from round start to execute this action." }
        },
        required: ["type", "category", "delay", "answer"]
    }
};

const answerEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        category: { type: Type.STRING },
        answer: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['valid', 'invalid'] },
        reason: { type: Type.STRING, description: "A brief reason in Hebrew if invalid." },
        score: { type: Type.INTEGER },
        conflict: { type: Type.BOOLEAN },
        rarityBonus: { type: Type.INTEGER }
    },
    required: ["category", "answer", "status", "score", "conflict", "rarityBonus"]
};

const playerRoundScoreSchema = {
    type: Type.OBJECT,
    properties: {
        baseScore: { type: Type.INTEGER },
        bonusScore: { type: Type.INTEGER },
        comboBonus: { type: Type.INTEGER, description: "Bonus points for multiple valid answers in a single category." },
        total: { type: Type.INTEGER }
    },
    required: ["baseScore", "bonusScore", "total"]
};

const hintSchema = {
    type: Type.OBJECT,
    properties: {
        hintType: { type: Type.STRING, description: "Type of hint, e.g., 'partialWord', 'geographyClue', 'funnyClue'." },
        hintText: { type: Type.STRING, description: "The hint text in Hebrew. Must not be the full answer." }
    },
    required: ["hintType", "hintText"]
};

const playerEndGameStatsSchema = {
    type: Type.OBJECT,
    properties: {
        correctAnswers: { type: Type.INTEGER },
        invalidAnswers: { type: Type.INTEGER },
        conflicts: { type: Type.INTEGER },
        hintsUsed: { type: Type.INTEGER },
        strongestCategory: {
            type: Type.OBJECT,
            properties: {
                category: { type: Type.STRING },
                score: { type: Type.INTEGER },
            },
            required: ['category', 'score'],
        },
    },
    required: [
        'correctAnswers',
        'invalidAnswers',
        'conflicts',
        'hintsUsed',
        'strongestCategory',
    ],
};

const winnerInfoSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, enum: ['player', 'team'] },
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        avatar: { type: Type.STRING },
        score: { type: Type.INTEGER }
    },
    required: ["type", "id", "name", "score"]
};


export async function getGameSummary(
    roundResults: RoundResultType[],
    players: Player[],
    groups: Group[]
): Promise<GameOverStats> {
    const prompt = `
        You are a game analyst for "Eretz Ir". The game has finished.
        Analyze all the round results provided below to generate a final game summary.

        1.  **Determine Winner**: Based on final scores, determine the winner. If it's a team game ('2v2', '1v2', etc.), find the winning team by total score and return a 'winner' object with type 'team'. If it's a solo or free-for-all, find the winning player and return type 'player'. Include their ID, name, final score, and avatar (if player).
        2.  **Winner Reveal Phases**: Create a simple array of strings for 'winnerRevealPhase', like ["spotlight", "confetti"].
        3.  **Find Top 3 Rare Words**: Look through all answers and find the top 3 with the highest 'rarityBonus'.
        4.  **Calculate Player Statistics**: For each player, calculate: 'correctAnswers', 'invalidAnswers', 'conflicts', 'strongestCategory' (category with most points), and set 'hintsUsed' to 0.

        Return the complete analysis in the specified JSON format.

        **Game Data:**
        - Players: ${JSON.stringify(players.map(p => ({id: p.id, name: p.name, groupId: p.groupId, score: p.score})))}
        - Groups: ${JSON.stringify(groups)}
        - Round Results: ${JSON.stringify(roundResults)}
    `;

    const playerStatsProperties = players.reduce((acc, player) => {
        acc[player.id] = playerEndGameStatsSchema;
        return acc;
    }, {} as Record<string, typeof playerEndGameStatsSchema>);

    const gameOverStatsSchema = {
        type: Type.OBJECT,
        properties: {
            winner: winnerInfoSchema,
            winnerRevealPhase: { type: Type.ARRAY, items: { type: Type.STRING } },
            topRareWords: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        category: { type: Type.STRING },
                        bonus: { type: Type.INTEGER }
                    },
                    required: ["word", "category", "bonus"]
                }
            },
            playerStats: {
                type: Type.OBJECT,
                properties: playerStatsProperties,
                required: players.map(p => p.id),
            }
        },
        required: ["winner", "winnerRevealPhase", "topRareWords", "playerStats"]
    };


    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: gameOverStatsSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as GameOverStats;
    } catch (error) {
        console.error("Gemini API call for game summary failed:", error);
        throw new Error("Failed to get game summary from AI.");
    }
};


export async function getHint(category: string, letter: string): Promise<{ hintType: string, hintText: string }> {
    const prompt = `
        You are a hint provider for "Eretz Ir". A player needs a hint for category "${category}" starting with letter "${letter}".
        Provide a helpful but not-too-obvious hint in Hebrew. Do NOT provide a full answer.
        Choose a creative hint type: 'partialWord', 'geographyClue', 'characterClue', 'funnyClue', or 'clue'.
        Example for 'ארץ'/'א': { "hintType": "geographyClue", "hintText": "היא גובלת באוקיינוס השקט והאטלנטי" }
        Return your hint in the specified JSON format.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: hintSchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini API call for hint failed:", error);
        throw new Error("Failed to get hint from AI.");
    }
};

export async function getBotAnswerPlan(
    letter: string,
    categories: string[],
    settings: GameSettings,
): Promise<BotAnswerAction[]> {
     const prompt = `
        You are a bot player in an Israeli game "Eretz Ir".
        The letter is "${letter}".
        The categories are: ${JSON.stringify(categories)}.
        Your difficulty is "${settings.difficulty}".

        Your task is to generate a realistic, human-like action plan for your answers.
        The plan should be an array of actions. Each action has a 'type' ('thinking' or 'answering'), 'category', 'answer', and a 'delay' in seconds from the start of the round.
        - Create a sequence: a 'thinking' action for a category, followed by a short delay (0.5-2s), then an 'answering' action for the same category.
        - 'delay' must be gradual, varied, and logical, not all at once.
        - 'answer' should be an empty string for 'thinking' actions.
        - For a skipped category, generate no actions.
        - easy: Answer 30-50% of categories. Make 1-2 answers invalid. Delays should be spread out and slower.
        - normal: Answer 70-90%. All answers should be valid. Delays should be quicker than easy.
        - hard: Answer 90-100%. Use less common valid answers. Delays should be fast, simulating a skilled player.

        All generated answers must start with the letter "${letter}".
        Return ONLY the JSON array for the plan.
    `;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            botAnswerPlan: botAnswerPlanSchema
        },
        required: ["botAnswerPlan"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText)
        return result.botAnswerPlan;
    } catch (error) {
        console.error("Gemini API call for bot plan failed:", error);
        throw new Error("Failed to get bot plan from AI.");
    }
}

export async function validateAnswers(
    letter: string,
    categories: string[],
    player1Answers: { category: string, answer: string }[],
    players: Player[],
    settings: GameSettings,
    groups: Group[],
    botAnswerPlan: BotAnswerAction[]
): Promise<RoundResult> {
    const humanPlayer = players.find(p => p.playerType === 'human');
    const computerPlayer = players.find(p => p.playerType === 'computer');

    const prompt = `
        You are the judge for an online Israeli game "Eretz Ir".
        The letter is "${letter}".
        The players are: ${JSON.stringify(players.map(p => ({ id: p.id, name: p.name, type: p.playerType, groupId: p.groupId })))}.
        The teams are: ${JSON.stringify(groups)}.
        The categories are: ${JSON.stringify(categories)}.

        **Evaluation Rules:**
        1.  **Validity**: Check if answers start with "${letter}" and are valid for their category.
        2.  **Conflicts**: A 'conflict' occurs if two players from DIFFERENT teams submit the SAME valid answer for the SAME category. It's not a conflict if players on the same team have the same answer. Both conflicting answers get 0 points.
        3.  **Base Score**: A valid, non-conflicting answer is 10 points.
        4.  **Rarity Bonus**: Award a 'rarityBonus' of 1-5 for creative or less common valid answers.
        5.  **Combo Bonus**: If a player provides more than one valid, non-conflicting answer for a single category, award them a 'comboBonus' of 5 points for each additional valid answer (the first answer gets 0 combo bonus). This bonus should be part of their total score for the round.
        6.  **Invalid Score**: An invalid answer is 0 points. Provide a brief Hebrew reason.
        
        **Tasks:**
        - Evaluate the human's answers: ${JSON.stringify(player1Answers)}.
        - The computer's answers are determined by the provided 'botAnswerPlan'. Use the 'answering' actions from this plan as the bot's final submissions. Evaluate these answers for validity and check them for conflicts against the human's answers. Bot's plan: ${JSON.stringify(botAnswerPlan)}
        - For any category a player didn't answer, add an entry with an empty answer, 'invalid' status, and 'לא ניתנה תשובה' reason.
        - Calculate final scores for each player, including base score, rarity bonus, and the new combo bonus.
        - Return the complete evaluation in the specified JSON format.
        `;

    const answerProperties = players.reduce((acc, player) => {
        acc[player.id] = { type: Type.ARRAY, items: answerEvaluationSchema };
        return acc;
    }, {} as Record<string, any>);

    const scoreProperties = players.reduce((acc, player) => {
        acc[player.id] = playerRoundScoreSchema;
        return acc;
    }, {} as Record<string, any>);

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            letter: { type: Type.STRING },
            answers: {
                type: Type.OBJECT,
                properties: answerProperties,
                required: players.map(p => p.id),
                description: "An object where keys are player IDs and values are arrays of answer evaluations for that player.",
            },
            scores: {
                type: Type.OBJECT,
                properties: scoreProperties,
                required: players.map(p => p.id),
                description: "An object with player IDs as keys, containing their calculated scores for the round.",
            },
            summary: { type: Type.STRING, description: "A very short, encouraging summary of the round in Hebrew." }
        },
        required: ["letter", "answers", "scores", "summary"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText) as Omit<RoundResult, 'botAnswerPlan'>;

        // Post-processing to ensure all categories are present for all players
        players.forEach(player => {
            const playerAnswers = result.answers[player.id] || [];
            const answeredCategories = new Set(playerAnswers.map(a => a.category));
            categories.forEach(category => {
                if (!answeredCategories.has(category)) {
                    playerAnswers.push({
                        category: category,
                        answer: '',
                        status: 'invalid',
                        reason: 'לא ניתנה תשובה',
                        score: 0,
                        conflict: false,
                        rarityBonus: 0
                    });
                }
            });
            result.answers[player.id] = playerAnswers;
            if (!result.scores[player.id]) {
                result.scores[player.id] = { baseScore: 0, bonusScore: 0, comboBonus: 0, total: 0 };
            }
        });

        return {...result, botAnswerPlan};

    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to validate answers with AI.");
    }
};