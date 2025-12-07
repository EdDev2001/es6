// src/lib/ai/index.js
// AI Behavior Analysis Module - Central exports

export {
    RiskLevel,
    AnomalyType,
    analyzeAttendanceBehavior,
    getUserBehaviorProfile,
    flagUserForReview,
    getFlaggedUsers,
    resolveFlaggedUser,
    analyzeFaceSimilarity,
    generateBehaviorReport
} from './behaviorAnalysis.js';

// Smart Leave Suggestions
export {
    SuggestionType,
    SuggestionPriority,
    SmartLeaveSuggestionsEngine,
    getUserLeaveBalance,
    dismissSuggestion,
    getDismissedSuggestions,
    logSuggestionAction,
    getSmartSuggestions
} from './smartLeaveSuggestions.js';
