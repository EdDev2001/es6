// Gamification store for managing badges, streaks, and leaderboard
// Premium Rewards & Badge System (Professional Level)
import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, set, update } from 'firebase/database';

/**
 * Badge Categories
 */
export const BadgeCategories = {
    ATTENDANCE_MASTERY: { id: 'attendance_mastery', name: 'Attendance Mastery', icon: '✔', description: 'Badges earned based on consistency and discipline' },
    TIME_BEHAVIOR: { id: 'time_behavior', name: 'Time Behavior', icon: '📅', description: 'Rewards for punctual behavior' },
    PERFORMANCE: { id: 'performance', name: 'Performance & Productivity', icon: '🧪', description: 'Badges based on activity + work quality' },
    RELIABILITY: { id: 'reliability', name: 'Reliability & Trust', icon: '🌟', description: 'Shows that the user is dependable' },
    LONG_TERM: { id: 'long_term', name: 'Long-Term Achievement', icon: '🧭', description: 'Big milestone rewards' },
    SECURITY: { id: 'security', name: 'Security & Responsibility', icon: '🛡', description: 'For users who follow security rules properly' },
    IMPROVEMENT: { id: 'improvement', name: 'Smart Behavior & Improvement', icon: '🔍', description: 'Encourage growth & improvement' },
    SOCIAL: { id: 'social', name: 'Social / Team-Based', icon: '👥', description: 'Perfect for team collaboration' },
    CHALLENGES: { id: 'challenges', name: 'Challenge-Based', icon: '🎯', description: 'Gamify the system' },
    PRESTIGE: { id: 'prestige', name: 'Special / Prestige', icon: '🔥', description: 'For rare achievers - premium-level badges' },
    AI_BEHAVIOR: { id: 'ai_behavior', name: 'Behavior Intelligence', icon: '🧩', description: 'Using pattern detection' },
    SEASONAL: { id: 'seasonal', name: 'Special Cultural / Seasonal', icon: '🌍', description: 'Fun seasonal graphics' }
};

/**
 * Badge Tiers for styling
 */
export const BadgeTiers = {
    BRONZE: { id: 'bronze', name: 'Bronze', color: '#CD7F32', gradient: 'linear-gradient(135deg, #CD7F32, #B87333)' },
    SILVER: { id: 'silver', name: 'Silver', color: '#C0C0C0', gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' },
    GOLD: { id: 'gold', name: 'Gold', color: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
    PLATINUM: { id: 'platinum', name: 'Platinum', color: '#E5E4E2', gradient: 'linear-gradient(135deg, #E5E4E2, #BCC6CC)' },
    DIAMOND: { id: 'diamond', name: 'Diamond', color: '#B9F2FF', gradient: 'linear-gradient(135deg, #B9F2FF, #89CFF0)' }
};

/**
 * Complete Badge Definitions - Premium Rewards System
 */
export const BadgeTypes = {
    // 1. ATTENDANCE MASTERY BADGES
    FIRST_CHECKIN: { id: 'first_checkin', name: 'Getting Started', description: 'Complete your first check-in', icon: '🎯', color: '#007AFF', category: 'attendance_mastery', tier: 'bronze', requirement: 1, points: 10 },
    PERFECT_WEEK: { id: 'perfect_week', name: 'Perfect Week', description: 'Attend all sessions on time for 7 days', icon: '📆', color: '#34C759', category: 'attendance_mastery', tier: 'bronze', requirement: 7, points: 50 },
    PERFECT_MONTH: { id: 'perfect_month', name: 'Perfect Month', description: 'Zero lates or absences for one full month', icon: '🏆', color: '#FFD700', category: 'attendance_mastery', tier: 'gold', requirement: 30, points: 200 },
    DISCIPLINE_STREAK_90: { id: 'discipline_streak_90', name: '90-Day Discipline Streak', description: 'Attend 90 straight days without absence', icon: '💪', color: '#AF52DE', category: 'attendance_mastery', tier: 'platinum', requirement: 90, points: 500 },
    CONSISTENCY_CHAMPION: { id: 'consistency_champion', name: 'Consistency Champion', description: 'Maintain 95% attendance for 6 months', icon: '👑', color: '#FF9500', category: 'attendance_mastery', tier: 'diamond', requirement: 180, points: 1000 },

    // 2. TIME BEHAVIOR BADGES
    EARLY_BIRD: { id: 'early_bird', name: 'Early Bird', description: 'Arrive 10 minutes early for 10 consecutive days', icon: '🌅', color: '#FF9500', category: 'time_behavior', tier: 'silver', requirement: 10, points: 75 },
    SUNRISE_WARRIOR: { id: 'sunrise_warrior', name: 'Sunrise Warrior', description: 'Arrive early for all morning sessions for a month', icon: '☀️', color: '#FFCC00', category: 'time_behavior', tier: 'gold', requirement: 30, points: 150 },
    ZERO_LATE_STREAK: { id: 'zero_late_streak', name: 'Zero Late Streak', description: '14 days without any late logs', icon: '⏰', color: '#5856D6', category: 'time_behavior', tier: 'silver', requirement: 14, points: 100 },
    PUNCTUALITY_PRO: { id: 'punctuality_pro', name: 'Punctuality Pro', description: 'Highest on-time rate in the department', icon: '🎖', color: '#007AFF', category: 'time_behavior', tier: 'platinum', requirement: 1, points: 300 },

    // 3. PERFORMANCE & PRODUCTIVITY BADGES
    HIGH_PERFORMER: { id: 'high_performer', name: 'High Performer', description: 'Consistently completes full required hours weekly', icon: '📈', color: '#34C759', category: 'performance', tier: 'silver', requirement: 4, points: 100 },
    OVERTIME_HERO: { id: 'overtime_hero', name: 'Overtime Hero', description: 'Logs voluntary overtime for at least 10 sessions', icon: '💼', color: '#FF3B30', category: 'performance', tier: 'gold', requirement: 10, points: 200 },
    PEAK_PRODUCTIVITY: { id: 'peak_productivity', name: 'Peak Productivity', description: 'Logs the highest work hours for 3 months straight', icon: '🚀', color: '#AF52DE', category: 'performance', tier: 'platinum', requirement: 90, points: 500 },

    // 4. RELIABILITY & TRUST BADGES
    RELIABILITY_100: { id: 'reliability_100', name: '100% Reliability Badge', description: 'Never missed a scan for 3 months', icon: '✅', color: '#34C759', category: 'reliability', tier: 'gold', requirement: 90, points: 250 },
    DEPENDABILITY_STAR: { id: 'dependability_star', name: 'Dependability Star', description: 'Supervisor-confirmed reliability rating 95-100%', icon: '⭐', color: '#FFCC00', category: 'reliability', tier: 'platinum', requirement: 1, points: 300 },
    TRUSTED_USER: { id: 'trusted_user', name: 'Trusted User', description: 'Always follows attendance policy + no violations', icon: '🤝', color: '#007AFF', category: 'reliability', tier: 'gold', requirement: 180, points: 400 },

    // 5. LONG-TERM ACHIEVEMENT BADGES
    SIX_MONTH_MEDAL: { id: 'six_month_medal', name: '6-Month Attendance Medal', description: 'Six months of recorded attendance', icon: '🥉', color: '#CD7F32', category: 'long_term', tier: 'bronze', requirement: 180, points: 300 },
    ONE_YEAR_LOYALTY: { id: 'one_year_loyalty', name: '1-Year Loyalty Badge', description: 'Full year of consistent logging', icon: '🥈', color: '#C0C0C0', category: 'long_term', tier: 'silver', requirement: 365, points: 750 },
    ELITE_VETERAN: { id: 'elite_veteran', name: 'Elite Veteran Badge', description: '3 years of high attendance performance', icon: '🥇', color: '#FFD700', category: 'long_term', tier: 'diamond', requirement: 1095, points: 2500 },

    // 6. SECURITY & RESPONSIBILITY BADGES
    VERIFIED_PROFILE: { id: 'verified_profile', name: 'Verified Profile', description: 'Completed email, phone & ID verification', icon: '✓', color: '#007AFF', category: 'security', tier: 'bronze', requirement: 1, points: 25 },
    DEVICE_TRUSTED: { id: 'device_trusted', name: 'Device Trusted Badge', description: 'Uses secure login devices only', icon: '📱', color: '#5856D6', category: 'security', tier: 'silver', requirement: 30, points: 50 },
    POLICY_COMPLIANT: { id: 'policy_compliant', name: 'Policy Compliant', description: 'No security warnings for 12 months', icon: '🛡', color: '#34C759', category: 'security', tier: 'gold', requirement: 365, points: 200 },

    // 7. SMART BEHAVIOR & IMPROVEMENT BADGES
    RAPID_IMPROVER: { id: 'rapid_improver', name: 'Rapid Improver', description: 'Attendance increased by 20% in 1 month', icon: '📊', color: '#34C759', category: 'improvement', tier: 'silver', requirement: 1, points: 100 },
    COMEBACK_AWARD: { id: 'comeback_award', name: 'Comeback Award', description: 'Returned to perfect attendance after a decline', icon: '🔄', color: '#FF9500', category: 'improvement', tier: 'gold', requirement: 1, points: 150 },
    POSITIVE_TREND: { id: 'positive_trend', name: 'Positive Trend Award', description: '3 months of continuous improvement', icon: '📈', color: '#AF52DE', category: 'improvement', tier: 'platinum', requirement: 90, points: 250 },

    // 8. SOCIAL / TEAM-BASED BADGES
    TEAM_PLAYER: { id: 'team_player', name: 'Team Player', description: 'Participated in group attendance milestones', icon: '🤜🤛', color: '#007AFF', category: 'social', tier: 'bronze', requirement: 1, points: 50 },
    GROUP_CHAMPION: { id: 'group_champion', name: 'Group Champion', description: 'Team reached perfect attendance for 7 days', icon: '👥', color: '#34C759', category: 'social', tier: 'silver', requirement: 7, points: 100 },
    DEPARTMENT_LEADER: { id: 'department_leader', name: 'Department Leader', description: 'Top attendance performer in department', icon: '🏅', color: '#FFD700', category: 'social', tier: 'gold', requirement: 1, points: 200 },

    // 9. CHALLENGE-BASED BADGES
    PUNCTUALITY_SPRINT: { id: 'punctuality_sprint', name: '30-Day Punctuality Sprint', description: 'No lates for 30 days', icon: '🏃', color: '#FF3B30', category: 'challenges', tier: 'gold', requirement: 30, points: 200 },
    ULTRA_EARLY_CHALLENGE: { id: 'ultra_early_challenge', name: 'Ultra Early Challenge', description: 'Arrive 20 minutes early for 15 days', icon: '⚡', color: '#FFCC00', category: 'challenges', tier: 'silver', requirement: 15, points: 150 },
    PEAK_SESSION_MASTER: { id: 'peak_session_master', name: 'Peak Session Master', description: 'Top attendance score during peak months', icon: '🎯', color: '#AF52DE', category: 'challenges', tier: 'platinum', requirement: 1, points: 300 },

    // 10. SPECIAL / PRESTIGE BADGES (Premium-Level)
    PLATINUM_ATTENDANCE: { id: 'platinum_attendance', name: 'Platinum Attendance Award', description: '12 months of perfect attendance', icon: '🥇', color: '#E5E4E2', category: 'prestige', tier: 'platinum', requirement: 365, points: 1500 },
    GOLD_EXCELLENCE: { id: 'gold_excellence', name: 'Gold Excellence Award', description: '95%+ attendance for a full year', icon: '🥈', color: '#FFD700', category: 'prestige', tier: 'gold', requirement: 347, points: 1000 },
    SILVER_DEDICATION: { id: 'silver_dedication', name: 'Silver Dedication Award', description: '90%+ attendance for a full year', icon: '🥉', color: '#C0C0C0', category: 'prestige', tier: 'silver', requirement: 329, points: 750 },
    HALL_OF_FAME: { id: 'hall_of_fame', name: 'Hall of Fame', description: 'Awarded only once after reaching top tier for 3 years', icon: '🏛', color: '#B9F2FF', category: 'prestige', tier: 'diamond', requirement: 1095, points: 5000 },

    // 11. BEHAVIOR INTELLIGENCE BADGES (AI-Based)
    PREDICTABLE_PATTERN: { id: 'predictable_pattern', name: 'Predictable Pattern', description: 'User logs in around the same time daily', icon: '🔮', color: '#5856D6', category: 'ai_behavior', tier: 'silver', requirement: 30, points: 100 },
    HEALTHY_RHYTHM: { id: 'healthy_rhythm', name: 'Healthy Work Rhythm', description: 'Balanced break times & consistent schedule', icon: '💚', color: '#34C759', category: 'ai_behavior', tier: 'gold', requirement: 60, points: 150 },
    SAFE_LOGIN_USER: { id: 'safe_login_user', name: 'Safe Login User', description: 'No suspicious login attempts, locations, or devices', icon: '🔐', color: '#007AFF', category: 'ai_behavior', tier: 'platinum', requirement: 90, points: 200 },

    // 12. SPECIAL CULTURAL / SEASONAL BADGES
    HOLIDAY_STAR: { id: 'holiday_star', name: 'Holiday Attendance Star', description: 'Perfect attendance during holiday season', icon: '🌟', color: '#FFD700', category: 'seasonal', tier: 'gold', requirement: 1, points: 100 },
    BACK_TO_SCHOOL: { id: 'back_to_school', name: 'Back-to-School Champion', description: 'Perfect attendance in first month of semester', icon: '🎒', color: '#FF9500', category: 'seasonal', tier: 'silver', requirement: 1, points: 75 },
    SUMMER_RELIABILITY: { id: 'summer_reliability', name: 'Summer Reliability Badge', description: 'Maintained attendance during summer period', icon: '☀️', color: '#FFCC00', category: 'seasonal', tier: 'silver', requirement: 1, points: 75 },
    NEW_YEAR_COMMITMENT: { id: 'new_year_commitment', name: 'New Year Commitment Badge', description: 'Started the year with perfect attendance', icon: '🎉', color: '#AF52DE', category: 'seasonal', tier: 'gold', requirement: 1, points: 100 }
};

// Helper functions
export function getBadgesByCategory(categoryId) {
    return Object.values(BadgeTypes).filter(badge => badge.category === categoryId);
}

export function getBadgeById(badgeId) {
    return Object.values(BadgeTypes).find(badge => badge.id === badgeId) || null;
}

export function getAllBadgesGrouped() {
    const grouped = {};
    Object.values(BadgeCategories).forEach(category => {
        grouped[category.id] = { ...category, badges: getBadgesByCategory(category.id) };
    });
    return grouped;
}

export function getTotalPossiblePoints() {
    return Object.values(BadgeTypes).reduce((sum, badge) => sum + badge.points, 0);
}


// Get user's gamification data
export async function getGamificationData(userId) {
    if (!browser) return null;
    
    const defaultData = {
        currentStreak: 0, longestStreak: 0, totalCheckIns: 0, earlyCheckIns: 0,
        veryEarlyCheckIns: 0, perfectWeeks: 0, perfectMonths: 0, lateCount: 0,
        lastLateDate: null, overtimeSessions: 0, badges: [], lastCheckInDate: null,
        points: 0, attendanceRate: 0, improvementRate: 0, loginPattern: [], teamMilestones: 0
    };
    
    if (!db) return defaultData;
    
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const snapshot = await get(gamifRef);
        if (!snapshot.exists()) {
            await set(gamifRef, defaultData);
            return defaultData;
        }
        return { ...defaultData, ...snapshot.val() };
    } catch (error) {
        console.error('Error fetching gamification data:', error);
        return defaultData;
    }
}

// Update streak on check-in
export async function updateStreak(userId, checkInTime) {
    if (!browser || !db) return null;
    
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const data = await getGamificationData(userId);
        
        const today = new Date().toDateString();
        const lastCheckIn = data.lastCheckInDate ? new Date(data.lastCheckInDate).toDateString() : null;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        let newStreak = data.currentStreak;
        let points = data.points || 0;
        
        if (lastCheckIn !== today) {
            if (lastCheckIn === yesterday) {
                newStreak += 1;
                points += 10 + (newStreak * 2);
            } else if (!lastCheckIn) {
                newStreak = 1;
                points += 10;
            } else {
                newStreak = 1;
                points += 10;
            }
        }
        
        const checkInDate = new Date(checkInTime);
        const checkInHour = checkInDate.getHours();
        const checkInMinutes = checkInDate.getMinutes();
        let earlyCheckIns = data.earlyCheckIns || 0;
        let veryEarlyCheckIns = data.veryEarlyCheckIns || 0;
        
        if (checkInHour < 8 || (checkInHour === 8 && checkInMinutes <= 50)) {
            earlyCheckIns += 1;
            points += 5;
            if (checkInHour < 7 || (checkInHour === 7 && checkInMinutes <= 40)) {
                veryEarlyCheckIns += 1;
                points += 10;
            }
        }
        
        const loginPattern = data.loginPattern || [];
        loginPattern.push({ time: checkInTime, hour: checkInHour, minute: checkInMinutes });
        if (loginPattern.length > 30) loginPattern.shift();
        
        const updates = {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, data.longestStreak || 0),
            totalCheckIns: (data.totalCheckIns || 0) + (lastCheckIn !== today ? 1 : 0),
            earlyCheckIns, veryEarlyCheckIns,
            lastCheckInDate: new Date().toISOString(),
            loginPattern, points
        };
        
        await update(gamifRef, updates);
        const newBadges = await checkAndAwardBadges(userId, { ...data, ...updates });
        return { ...updates, newBadges };
    } catch (error) {
        console.error('Error updating streak:', error);
        return null;
    }
}


// Check and award badges based on achievements
export async function checkAndAwardBadges(userId, data) {
    if (!browser || !db) return [];
    
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const currentBadges = data.badges || [];
        const newBadges = [];
        let bonusPoints = 0;
        
        const awardBadge = (badgeId) => {
            if (!currentBadges.includes(badgeId)) {
                const badge = getBadgeById(badgeId);
                if (badge) { newBadges.push(badgeId); bonusPoints += badge.points; }
            }
        };
        
        // ATTENDANCE MASTERY
        if (data.totalCheckIns >= 1) awardBadge('first_checkin');
        if (data.currentStreak >= 7) awardBadge('perfect_week');
        if (data.perfectMonths >= 1) awardBadge('perfect_month');
        if (data.currentStreak >= 90) awardBadge('discipline_streak_90');
        if (data.totalCheckIns >= 180 && data.attendanceRate >= 95) awardBadge('consistency_champion');
        
        // TIME BEHAVIOR
        if (data.earlyCheckIns >= 10) awardBadge('early_bird');
        if (data.earlyCheckIns >= 30) awardBadge('sunrise_warrior');
        if (data.currentStreak >= 14 && data.lateCount === 0) awardBadge('zero_late_streak');
        
        // PERFORMANCE
        if (data.perfectWeeks >= 4) awardBadge('high_performer');
        if (data.overtimeSessions >= 10) awardBadge('overtime_hero');
        
        // RELIABILITY
        if (data.currentStreak >= 90) awardBadge('reliability_100');
        if (data.totalCheckIns >= 180 && data.lateCount === 0) awardBadge('trusted_user');
        
        // LONG-TERM
        if (data.totalCheckIns >= 180) awardBadge('six_month_medal');
        if (data.totalCheckIns >= 365) awardBadge('one_year_loyalty');
        if (data.totalCheckIns >= 1095) awardBadge('elite_veteran');
        
        // SECURITY
        if (data.profileVerified) awardBadge('verified_profile');
        if (data.trustedDeviceDays >= 30) awardBadge('device_trusted');
        if (data.securityWarnings === 0 && data.totalCheckIns >= 365) awardBadge('policy_compliant');
        
        // IMPROVEMENT
        if (data.improvementRate >= 20) awardBadge('rapid_improver');
        if (data.hadDecline && data.currentStreak >= 14) awardBadge('comeback_award');
        if (data.improvementMonths >= 3) awardBadge('positive_trend');
        
        // SOCIAL
        if (data.teamMilestones >= 1) awardBadge('team_player');
        if (data.teamPerfectWeek) awardBadge('group_champion');
        if (data.isDepartmentLeader) awardBadge('department_leader');
        
        // CHALLENGES
        if (data.currentStreak >= 30 && data.lateCount === 0) awardBadge('punctuality_sprint');
        if (data.veryEarlyCheckIns >= 15) awardBadge('ultra_early_challenge');
        
        // PRESTIGE
        if (data.totalCheckIns >= 365 && data.attendanceRate === 100) awardBadge('platinum_attendance');
        if (data.totalCheckIns >= 347 && data.attendanceRate >= 95) awardBadge('gold_excellence');
        if (data.totalCheckIns >= 329 && data.attendanceRate >= 90) awardBadge('silver_dedication');
        if (data.totalCheckIns >= 1095 && data.attendanceRate >= 95) awardBadge('hall_of_fame');
        
        // AI BEHAVIOR
        if (data.loginPattern && data.loginPattern.length >= 30) {
            const times = data.loginPattern.map(p => p.hour * 60 + p.minute);
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
            if (variance < 225) awardBadge('predictable_pattern');
        }
        if (data.healthyRhythmDays >= 60) awardBadge('healthy_rhythm');
        if (data.suspiciousLogins === 0 && data.totalCheckIns >= 90) awardBadge('safe_login_user');
        
        if (newBadges.length > 0) {
            await update(gamifRef, { badges: [...currentBadges, ...newBadges], points: (data.points || 0) + bonusPoints });
        }
        return newBadges;
    } catch (error) {
        console.error('Error checking badges:', error);
        return [];
    }
}


// Award perfect week
export async function awardPerfectWeek(userId) {
    if (!browser || !db) return false;
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const data = await getGamificationData(userId);
        const updates = { perfectWeeks: (data.perfectWeeks || 0) + 1, points: (data.points || 0) + 50 };
        await update(gamifRef, updates);
        await checkAndAwardBadges(userId, { ...data, ...updates });
        return true;
    } catch (error) {
        console.error('Error awarding perfect week:', error);
        return false;
    }
}

// Award perfect month badge
export async function awardPerfectMonth(userId) {
    if (!browser || !db) return false;
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const data = await getGamificationData(userId);
        const updates = { perfectMonths: (data.perfectMonths || 0) + 1, points: (data.points || 0) + 200 };
        await update(gamifRef, updates);
        await checkAndAwardBadges(userId, { ...data, ...updates });
        return true;
    } catch (error) {
        console.error('Error awarding perfect month:', error);
        return false;
    }
}

// Record late check-in
export async function recordLateCheckIn(userId) {
    if (!browser || !db) return false;
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const data = await getGamificationData(userId);
        await update(gamifRef, { lateCount: (data.lateCount || 0) + 1, lastLateDate: new Date().toISOString() });
        return true;
    } catch (error) {
        console.error('Error recording late check-in:', error);
        return false;
    }
}

// Award seasonal badge
export async function awardSeasonalBadge(userId, badgeId) {
    if (!browser || !db) return false;
    const validSeasonalBadges = ['holiday_star', 'back_to_school', 'summer_reliability', 'new_year_commitment'];
    if (!validSeasonalBadges.includes(badgeId)) return false;
    try {
        const gamifRef = ref(db, `gamification/${userId}`);
        const data = await getGamificationData(userId);
        const currentBadges = data.badges || [];
        if (currentBadges.includes(badgeId)) return false;
        const badge = getBadgeById(badgeId);
        await update(gamifRef, { badges: [...currentBadges, badgeId], points: (data.points || 0) + (badge?.points || 0) });
        return true;
    } catch (error) {
        console.error('Error awarding seasonal badge:', error);
        return false;
    }
}

// Get leaderboard data
export async function getLeaderboard(limit = 10) {
    if (!browser || !db) return [];
    try {
        const usersRef = ref(db, 'users');
        const gamifRef = ref(db, 'gamification');
        const [usersSnapshot, gamifSnapshot] = await Promise.all([get(usersRef), get(gamifRef)]);
        
        // Handle case where gamification data doesn't exist yet
        if (!usersSnapshot.exists()) {
            console.log('No users found in database');
            return [];
        }
        
        const users = usersSnapshot.val();
        const gamification = gamifSnapshot.exists() ? gamifSnapshot.val() : {};
        
        // Build leaderboard from users who have gamification data OR attendance data
        const leaderboardData = [];
        
        // First, add users with gamification data
        Object.keys(gamification).forEach(userId => {
            const userData = users[userId];
            const gamifData = gamification[userId];
            
            if (gamifData && (gamifData.points > 0 || gamifData.totalCheckIns > 0)) {
                leaderboardData.push({
                    id: userId,
                    name: userData?.name || userData?.displayName || 'Unknown User',
                    profilePhoto: userData?.profilePhoto || userData?.photoURL || null,
                    department: userData?.departmentOrCourse || userData?.department || null,
                    currentStreak: gamifData.currentStreak || 0,
                    longestStreak: gamifData.longestStreak || 0,
                    totalCheckIns: gamifData.totalCheckIns || 0,
                    points: gamifData.points || 0,
                    badges: gamifData.badges || [],
                    badgeCount: (gamifData.badges || []).length,
                    earlyCheckIns: gamifData.earlyCheckIns || 0,
                    lastActive: gamifData.lastCheckInDate || null
                });
            }
        });
        
        // Sort by points (primary) and totalCheckIns (secondary)
        leaderboardData.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.totalCheckIns !== a.totalCheckIns) return b.totalCheckIns - a.totalCheckIns;
            return b.currentStreak - a.currentStreak;
        });
        
        return leaderboardData.slice(0, limit);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

// Get user's rank in leaderboard
export async function getUserRank(userId) {
    if (!browser || !db) return null;
    try {
        const leaderboard = await getLeaderboard(100);
        const rank = leaderboard.findIndex(u => u.id === userId) + 1;
        return rank > 0 ? rank : null;
    } catch (error) {
        console.error('Error getting user rank:', error);
        return null;
    }
}

// Get user's badge progress
export async function getBadgeProgress(userId) {
    if (!browser || !db) return {};
    try {
        const data = await getGamificationData(userId);
        const earnedBadges = data.badges || [];
        const allBadges = Object.values(BadgeTypes);
        return {
            earned: earnedBadges.length,
            total: allBadges.length,
            percentage: Math.round((earnedBadges.length / allBadges.length) * 100),
            earnedPoints: earnedBadges.reduce((sum, id) => sum + (getBadgeById(id)?.points || 0), 0),
            totalPossiblePoints: getTotalPossiblePoints(),
            byCategory: Object.values(BadgeCategories).map(cat => ({
                ...cat,
                earned: earnedBadges.filter(id => getBadgeById(id)?.category === cat.id).length,
                total: getBadgesByCategory(cat.id).length
            }))
        };
    } catch (error) {
        console.error('Error getting badge progress:', error);
        return {};
    }
}

// Sync gamification data with attendance records
export async function syncGamificationWithAttendance(userId) {
    if (!browser || !db) return null;
    
    try {
        const attendanceRef = ref(db, `attendance/${userId}`);
        const attendanceSnapshot = await get(attendanceRef);
        
        if (!attendanceSnapshot.exists()) return null;
        
        const records = [];
        attendanceSnapshot.forEach(child => {
            records.push({ id: child.key, ...child.val() });
        });
        
        // Calculate stats from attendance records
        let totalCheckIns = 0;
        let earlyCheckIns = 0;
        let veryEarlyCheckIns = 0;
        let lateCount = 0;
        let overtimeSessions = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let lastCheckInDate = null;
        
        // Sort records by date
        records.sort((a, b) => new Date(a.date || a.checkIn?.timestamp) - new Date(b.date || b.checkIn?.timestamp));
        
        let tempStreak = 0;
        let prevDate = null;
        
        records.forEach(record => {
            if (record.checkIn?.timestamp) {
                totalCheckIns++;
                const checkInTime = new Date(record.checkIn.timestamp);
                const hour = checkInTime.getHours();
                const minute = checkInTime.getMinutes();
                
                // Early check-in (before 9:00 AM)
                if (hour < 9 || (hour === 9 && minute === 0)) {
                    earlyCheckIns++;
                    // Very early (before 8:00 AM)
                    if (hour < 8) {
                        veryEarlyCheckIns++;
                    }
                }
                
                // Late check-in (after 9:15 AM)
                if (hour > 9 || (hour === 9 && minute > 15)) {
                    lateCount++;
                }
                
                // Calculate streak
                const recordDate = new Date(record.date || record.checkIn.timestamp).toDateString();
                if (prevDate) {
                    const prevDateObj = new Date(prevDate);
                    const currDateObj = new Date(recordDate);
                    const diffDays = Math.floor((currDateObj - prevDateObj) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays === 1) {
                        tempStreak++;
                    } else if (diffDays > 1) {
                        longestStreak = Math.max(longestStreak, tempStreak);
                        tempStreak = 1;
                    }
                } else {
                    tempStreak = 1;
                }
                prevDate = recordDate;
                lastCheckInDate = record.checkIn.timestamp;
                
                // Check for overtime (worked more than 9 hours)
                if (record.checkOut?.timestamp) {
                    const checkOutTime = new Date(record.checkOut.timestamp);
                    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
                    if (hoursWorked > 9) {
                        overtimeSessions++;
                    }
                }
            }
        });
        
        // Check if last check-in was today or yesterday for current streak
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const lastDate = lastCheckInDate ? new Date(lastCheckInDate).toDateString() : null;
        
        if (lastDate === today || lastDate === yesterday) {
            currentStreak = tempStreak;
        } else {
            currentStreak = 0;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        
        // Calculate points
        let points = totalCheckIns * 10 + earlyCheckIns * 5 + veryEarlyCheckIns * 10 + (currentStreak * 2);
        
        // Update gamification data
        const gamifRef = ref(db, `gamification/${userId}`);
        const existingData = await getGamificationData(userId);
        
        const updates = {
            totalCheckIns,
            earlyCheckIns,
            veryEarlyCheckIns,
            lateCount,
            overtimeSessions,
            currentStreak,
            longestStreak: Math.max(longestStreak, existingData.longestStreak || 0),
            lastCheckInDate,
            points: Math.max(points, existingData.points || 0),
            lastSyncDate: new Date().toISOString()
        };
        
        await update(gamifRef, updates);
        
        // Check for new badges
        const newBadges = await checkAndAwardBadges(userId, { ...existingData, ...updates });
        
        return { ...updates, newBadges };
    } catch (error) {
        console.error('Error syncing gamification data:', error);
        return null;
    }
}

// Subscribe to real-time gamification updates
export function subscribeToGamification(userId, callback) {
    if (!browser || !db) return () => {};
    
    import('firebase/database').then(({ onValue }) => {
        const gamifRef = ref(db, `gamification/${userId}`);
        onValue(gamifRef, (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });
    });
    
    return () => {}; // Return empty cleanup for now
}
