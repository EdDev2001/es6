// src/lib/ai/smartLeaveSuggestions.js
// Smart Leave & Absence Suggestions Engine
// Auto-detects patterns and suggests rest days, leave applications, and wellness actions

import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, set, push } from 'firebase/database';

// Suggestion Types
export const SuggestionType = {
    REST_DAY: 'rest_day',
    APPLY_LEAVE: 'apply_leave',
    LEAVE_EXPIRING: 'leave_expiring',
    WELLNESS_BREAK: 'wellness_break',
    SCHEDULE_ADJUSTMENT: 'schedule_adjustment',
    HEALTH_WARNING: 'health_warning'
};

// Suggestion Priority
export const SuggestionPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

// Default thresholds for suggestions
const DEFAULT_THRESHOLDS = {
    // Overtime thresholds
    dailyOvertimeWarning: 2,        // Hours - suggest break
    dailyOvertimeCritical: 4,       // Hours - strongly suggest rest
    weeklyOvertimeWarning: 10,      // Hours - suggest rest day
    weeklyOvertimeCritical: 20,     // Hours - urgent rest needed
    monthlyOvertimeLimit: 40,       // Hours - health warning
    
    // Work streak thresholds
    consecutiveWorkDaysWarning: 6,  // Days - suggest weekend rest
    consecutiveWorkDaysCritical: 10,// Days - suggest applying leave
    consecutiveWorkDaysUrgent: 14,  // Days - urgent leave needed
    
    // Leave expiration
    leaveExpiryWarningDays: 30,     // Days before expiry to warn
    leaveExpiryUrgentDays: 7,       // Days before expiry - urgent
    
    // Wellness indicators
    lateArrivalStreak: 3,           // Consecutive late days
    shortBreakPattern: 5,           // Days with short/no breaks
    longHoursPattern: 5,            // Days with 10+ hours
    
    // Leave balance
    lowLeaveBalanceWarning: 3,      // Days remaining
    unusedLeaveWarning: 10          // Days unused approaching year end
};

/**
 * Smart Leave Suggestions Engine
 */
export class SmartLeaveSuggestionsEngine {
    constructor(userId, options = {}) {
        this.userId = userId;
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
        this.leavePolicy = options.leavePolicy || {
            annualLeave: 15,
            sickLeave: 10,
            personalLeave: 5,
            yearEndMonth: 12 // December
        };
    }

    /**
     * Analyze all data and generate smart suggestions
     */
    async generateSuggestions(attendanceRecords, leaveBalance, workConfig) {
        const suggestions = [];
        const analysis = this.analyzeWorkPatterns(attendanceRecords, workConfig);

        // Check overtime patterns
        suggestions.push(...this.checkOvertimePatterns(analysis));
        
        // Check work streak
        suggestions.push(...this.checkWorkStreak(analysis));
        
        // Check leave expiration
        suggestions.push(...this.checkLeaveExpiration(leaveBalance));
        
        // Check wellness indicators
        suggestions.push(...this.checkWellnessIndicators(analysis));
        
        // Check unused leave
        suggestions.push(...this.checkUnusedLeave(leaveBalance));

        // Sort by priority and deduplicate
        return this.prioritizeAndDedupe(suggestions);
    }


    /**
     * Analyze work patterns from attendance records
     */
    analyzeWorkPatterns(records, config) {
        const sortedRecords = [...records].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);

        const analysis = {
            // Recent records
            todayRecord: sortedRecords.find(r => this.isToday(r.date)),
            recentRecords: sortedRecords.slice(0, 14),
            weekRecords: sortedRecords.filter(r => new Date(r.date) >= weekAgo),
            monthRecords: sortedRecords.filter(r => new Date(r.date) >= monthAgo),
            
            // Overtime analysis
            todayOvertime: 0,
            weeklyOvertime: 0,
            monthlyOvertime: 0,
            overtimeTrend: 'stable',
            
            // Work streak
            consecutiveWorkDays: 0,
            lastRestDay: null,
            
            // Patterns
            lateArrivalStreak: 0,
            shortBreakDays: 0,
            longHoursDays: 0,
            averageDailyHours: 0,
            
            // Timestamps
            averageArrivalTime: null,
            averageDepartureTime: null,
            
            config
        };

        const standardHours = config?.standardHoursPerDay || 8;
        let totalHours = 0;
        let workingDays = 0;

        // Analyze each record
        sortedRecords.forEach((record, index) => {
            const recordDate = new Date(record.date);
            const hoursWorked = this.calculateHoursWorked(record);
            
            if (hoursWorked > 0) {
                workingDays++;
                totalHours += hoursWorked;
                
                // Calculate overtime
                const overtime = Math.max(0, hoursWorked - standardHours);
                
                if (this.isToday(record.date)) {
                    analysis.todayOvertime = overtime;
                }
                
                if (recordDate >= weekAgo) {
                    analysis.weeklyOvertime += overtime;
                }
                
                if (recordDate >= monthAgo) {
                    analysis.monthlyOvertime += overtime;
                }
                
                // Long hours pattern (10+ hours)
                if (hoursWorked >= 10) {
                    analysis.longHoursDays++;
                }
            }
        });

        // Calculate consecutive work days
        analysis.consecutiveWorkDays = this.calculateWorkStreak(sortedRecords);
        analysis.lastRestDay = this.findLastRestDay(sortedRecords);

        // Calculate late arrival streak
        analysis.lateArrivalStreak = this.calculateLateStreak(sortedRecords, config);

        // Calculate short break days
        analysis.shortBreakDays = this.calculateShortBreakDays(sortedRecords);

        // Average daily hours
        analysis.averageDailyHours = workingDays > 0 ? totalHours / workingDays : 0;

        // Overtime trend
        analysis.overtimeTrend = this.calculateOvertimeTrend(sortedRecords, config);

        return analysis;
    }

    /**
     * Check overtime patterns and generate suggestions
     */
    checkOvertimePatterns(analysis) {
        const suggestions = [];

        // Daily overtime check
        if (analysis.todayOvertime >= this.thresholds.dailyOvertimeCritical) {
            suggestions.push({
                type: SuggestionType.REST_DAY,
                priority: SuggestionPriority.HIGH,
                title: 'You\'ve worked very long today',
                message: `You've logged ${analysis.todayOvertime.toFixed(1)} hours of overtime today. Consider taking tomorrow off to recover.`,
                icon: '😴',
                action: {
                    label: 'Request Rest Day',
                    type: 'apply_leave',
                    leaveType: 'rest_day'
                },
                data: { overtimeHours: analysis.todayOvertime }
            });
        } else if (analysis.todayOvertime >= this.thresholds.dailyOvertimeWarning) {
            suggestions.push({
                type: SuggestionType.WELLNESS_BREAK,
                priority: SuggestionPriority.MEDIUM,
                title: 'Time for a break',
                message: `You've been working ${analysis.todayOvertime.toFixed(1)} hours extra today. Take a short break to recharge.`,
                icon: '☕',
                action: {
                    label: 'Set Break Reminder',
                    type: 'set_reminder'
                },
                data: { overtimeHours: analysis.todayOvertime }
            });
        }

        // Weekly overtime check
        if (analysis.weeklyOvertime >= this.thresholds.weeklyOvertimeCritical) {
            suggestions.push({
                type: SuggestionType.APPLY_LEAVE,
                priority: SuggestionPriority.URGENT,
                title: 'Excessive overtime this week',
                message: `You've accumulated ${analysis.weeklyOvertime.toFixed(1)} hours of overtime this week. This is affecting your wellbeing. Please take time off.`,
                icon: '🚨',
                action: {
                    label: 'Apply for Leave',
                    type: 'apply_leave',
                    leaveType: 'annual'
                },
                data: { weeklyOvertime: analysis.weeklyOvertime }
            });
        } else if (analysis.weeklyOvertime >= this.thresholds.weeklyOvertimeWarning) {
            suggestions.push({
                type: SuggestionType.REST_DAY,
                priority: SuggestionPriority.HIGH,
                title: 'High overtime this week',
                message: `${analysis.weeklyOvertime.toFixed(1)} hours of overtime this week. Consider taking a rest day this weekend.`,
                icon: '⚠️',
                action: {
                    label: 'Plan Rest Day',
                    type: 'schedule_rest'
                },
                data: { weeklyOvertime: analysis.weeklyOvertime }
            });
        }

        // Monthly overtime check
        if (analysis.monthlyOvertime >= this.thresholds.monthlyOvertimeLimit) {
            suggestions.push({
                type: SuggestionType.HEALTH_WARNING,
                priority: SuggestionPriority.URGENT,
                title: 'Monthly overtime limit exceeded',
                message: `You've worked ${analysis.monthlyOvertime.toFixed(1)} hours of overtime this month. This level of overwork can seriously impact your health.`,
                icon: '🏥',
                action: {
                    label: 'Talk to Manager',
                    type: 'notify_manager'
                },
                data: { monthlyOvertime: analysis.monthlyOvertime },
                requiresAttention: true
            });
        }

        return suggestions;
    }


    /**
     * Check work streak and suggest leave
     */
    checkWorkStreak(analysis) {
        const suggestions = [];
        const streak = analysis.consecutiveWorkDays;

        if (streak >= this.thresholds.consecutiveWorkDaysUrgent) {
            suggestions.push({
                type: SuggestionType.APPLY_LEAVE,
                priority: SuggestionPriority.URGENT,
                title: 'You need a break!',
                message: `You've worked ${streak} consecutive days without a day off. This is unsustainable. Please take leave immediately.`,
                icon: '🆘',
                action: {
                    label: 'Apply for Leave Now',
                    type: 'apply_leave',
                    leaveType: 'annual',
                    suggestedDays: 3
                },
                data: { consecutiveDays: streak },
                requiresAttention: true
            });
        } else if (streak >= this.thresholds.consecutiveWorkDaysCritical) {
            suggestions.push({
                type: SuggestionType.APPLY_LEAVE,
                priority: SuggestionPriority.HIGH,
                title: 'Long work streak detected',
                message: `${streak} days of continuous work. Consider applying for a short leave to recharge.`,
                icon: '📅',
                action: {
                    label: 'Plan Leave',
                    type: 'apply_leave',
                    leaveType: 'annual',
                    suggestedDays: 2
                },
                data: { consecutiveDays: streak }
            });
        } else if (streak >= this.thresholds.consecutiveWorkDaysWarning) {
            suggestions.push({
                type: SuggestionType.REST_DAY,
                priority: SuggestionPriority.MEDIUM,
                title: 'Weekend rest recommended',
                message: `You've worked ${streak} days straight. Make sure to rest this weekend.`,
                icon: '🛋️',
                action: {
                    label: 'Set Weekend Reminder',
                    type: 'set_reminder'
                },
                data: { consecutiveDays: streak }
            });
        }

        return suggestions;
    }

    /**
     * Check leave expiration
     */
    checkLeaveExpiration(leaveBalance) {
        const suggestions = [];
        if (!leaveBalance) return suggestions;

        const today = new Date();
        const yearEnd = new Date(today.getFullYear(), this.leavePolicy.yearEndMonth - 1, 31);
        const daysUntilYearEnd = Math.ceil((yearEnd - today) / (1000 * 60 * 60 * 24));

        // Check each leave type for expiration
        const leaveTypes = [
            { key: 'annual', name: 'Annual Leave', balance: leaveBalance.annual },
            { key: 'personal', name: 'Personal Leave', balance: leaveBalance.personal }
        ];

        for (const leave of leaveTypes) {
            if (!leave.balance || leave.balance <= 0) continue;

            // Check if leave expires at year end
            if (leaveBalance.expiresAtYearEnd !== false) {
                if (daysUntilYearEnd <= this.thresholds.leaveExpiryUrgentDays && leave.balance > 0) {
                    suggestions.push({
                        type: SuggestionType.LEAVE_EXPIRING,
                        priority: SuggestionPriority.URGENT,
                        title: `${leave.name} expiring soon!`,
                        message: `You have ${leave.balance} days of ${leave.name.toLowerCase()} that will expire in ${daysUntilYearEnd} days. Use them or lose them!`,
                        icon: '⏰',
                        action: {
                            label: 'Apply Now',
                            type: 'apply_leave',
                            leaveType: leave.key,
                            suggestedDays: leave.balance
                        },
                        data: { 
                            leaveType: leave.key,
                            balance: leave.balance,
                            daysUntilExpiry: daysUntilYearEnd
                        },
                        requiresAttention: true
                    });
                } else if (daysUntilYearEnd <= this.thresholds.leaveExpiryWarningDays && leave.balance >= 5) {
                    suggestions.push({
                        type: SuggestionType.LEAVE_EXPIRING,
                        priority: SuggestionPriority.HIGH,
                        title: `Plan your ${leave.name.toLowerCase()}`,
                        message: `${leave.balance} days of ${leave.name.toLowerCase()} will expire in ${daysUntilYearEnd} days. Start planning your time off.`,
                        icon: '📆',
                        action: {
                            label: 'Plan Leave',
                            type: 'apply_leave',
                            leaveType: leave.key
                        },
                        data: { 
                            leaveType: leave.key,
                            balance: leave.balance,
                            daysUntilExpiry: daysUntilYearEnd
                        }
                    });
                }
            }
        }

        return suggestions;
    }

    /**
     * Check wellness indicators
     */
    checkWellnessIndicators(analysis) {
        const suggestions = [];

        // Late arrival pattern
        if (analysis.lateArrivalStreak >= this.thresholds.lateArrivalStreak) {
            suggestions.push({
                type: SuggestionType.SCHEDULE_ADJUSTMENT,
                priority: SuggestionPriority.MEDIUM,
                title: 'Arrival time pattern detected',
                message: `You've been arriving late for ${analysis.lateArrivalStreak} consecutive days. This might indicate fatigue or schedule issues.`,
                icon: '⏰',
                action: {
                    label: 'Adjust Schedule',
                    type: 'request_schedule_change'
                },
                data: { lateStreak: analysis.lateArrivalStreak },
                insights: [
                    'Consider adjusting your sleep schedule',
                    'You might benefit from flexible hours',
                    'This could be a sign of burnout'
                ]
            });
        }

        // Long hours pattern
        if (analysis.longHoursDays >= this.thresholds.longHoursPattern) {
            suggestions.push({
                type: SuggestionType.HEALTH_WARNING,
                priority: SuggestionPriority.HIGH,
                title: 'Consistent long hours detected',
                message: `You've worked 10+ hours on ${analysis.longHoursDays} days recently. This pattern can lead to burnout.`,
                icon: '💼',
                action: {
                    label: 'Review Workload',
                    type: 'notify_manager'
                },
                data: { longHoursDays: analysis.longHoursDays },
                insights: [
                    'Consider delegating some tasks',
                    'Discuss workload with your manager',
                    'Set boundaries for work hours'
                ]
            });
        }

        // Short break pattern
        if (analysis.shortBreakDays >= this.thresholds.shortBreakPattern) {
            suggestions.push({
                type: SuggestionType.WELLNESS_BREAK,
                priority: SuggestionPriority.MEDIUM,
                title: 'Take proper breaks',
                message: `You've been skipping or shortening breaks frequently. Regular breaks improve productivity and health.`,
                icon: '🧘',
                action: {
                    label: 'Set Break Reminders',
                    type: 'set_reminder'
                },
                data: { shortBreakDays: analysis.shortBreakDays },
                insights: [
                    'Take a 15-min break every 2 hours',
                    'Step away from your desk during lunch',
                    'Short walks can boost energy'
                ]
            });
        }

        // Overtime trend increasing
        if (analysis.overtimeTrend === 'increasing') {
            suggestions.push({
                type: SuggestionType.SCHEDULE_ADJUSTMENT,
                priority: SuggestionPriority.MEDIUM,
                title: 'Overtime trend increasing',
                message: 'Your overtime hours have been increasing over the past weeks. Consider addressing this before it becomes unsustainable.',
                icon: '📈',
                action: {
                    label: 'View Trends',
                    type: 'view_analytics'
                },
                data: { trend: 'increasing' }
            });
        }

        return suggestions;
    }


    /**
     * Check unused leave balance
     */
    checkUnusedLeave(leaveBalance) {
        const suggestions = [];
        if (!leaveBalance) return suggestions;

        const today = new Date();
        const yearEnd = new Date(today.getFullYear(), this.leavePolicy.yearEndMonth - 1, 31);
        const daysUntilYearEnd = Math.ceil((yearEnd - today) / (1000 * 60 * 60 * 24));
        const monthsRemaining = Math.ceil(daysUntilYearEnd / 30);

        // Check if significant leave is unused with limited time
        if (leaveBalance.annual >= this.thresholds.unusedLeaveWarning && monthsRemaining <= 3) {
            suggestions.push({
                type: SuggestionType.APPLY_LEAVE,
                priority: SuggestionPriority.HIGH,
                title: 'Use your annual leave',
                message: `You still have ${leaveBalance.annual} days of annual leave. With only ${monthsRemaining} months left, plan your time off now.`,
                icon: '🏖️',
                action: {
                    label: 'Plan Vacation',
                    type: 'apply_leave',
                    leaveType: 'annual'
                },
                data: { 
                    unusedDays: leaveBalance.annual,
                    monthsRemaining
                },
                insights: [
                    'Consider a longer vacation',
                    'Break it into multiple short breaks',
                    'Use around holidays for extended time off'
                ]
            });
        }

        // Low leave balance warning
        if (leaveBalance.annual <= this.thresholds.lowLeaveBalanceWarning && leaveBalance.annual > 0) {
            suggestions.push({
                type: SuggestionType.APPLY_LEAVE,
                priority: SuggestionPriority.LOW,
                title: 'Low leave balance',
                message: `You only have ${leaveBalance.annual} days of annual leave remaining. Use them wisely.`,
                icon: '📊',
                data: { remainingDays: leaveBalance.annual }
            });
        }

        return suggestions;
    }

    // Helper methods

    calculateHoursWorked(record) {
        if (!record.checkIn?.timestamp) return 0;
        
        const checkIn = new Date(record.checkIn.timestamp);
        const checkOut = record.checkOut?.timestamp 
            ? new Date(record.checkOut.timestamp)
            : new Date(); // Use current time if still checked in
        
        // Subtract break time if available
        let breakMinutes = 0;
        if (record.breakStart?.timestamp && record.breakEnd?.timestamp) {
            const breakStart = new Date(record.breakStart.timestamp);
            const breakEnd = new Date(record.breakEnd.timestamp);
            breakMinutes = (breakEnd - breakStart) / (1000 * 60);
        }
        
        const totalMinutes = (checkOut - checkIn) / (1000 * 60) - breakMinutes;
        return Math.max(0, totalMinutes / 60);
    }

    calculateWorkStreak(records) {
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            const dayOfWeek = checkDate.getDay();
            // Skip weekends in streak calculation (optional)
            // if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasRecord = records.some(r => {
                const recordDate = new Date(r.date).toISOString().split('T')[0];
                return recordDate === dateStr && r.checkIn?.timestamp;
            });
            
            if (hasRecord) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    findLastRestDay(records) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i < 60; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const hasRecord = records.some(r => {
                const recordDate = new Date(r.date).toISOString().split('T')[0];
                return recordDate === dateStr && r.checkIn?.timestamp;
            });
            
            if (!hasRecord) {
                return checkDate;
            }
        }
        
        return null;
    }

    calculateLateStreak(records, config) {
        const standardStart = this.parseTime(config?.standardStartTime || '09:00');
        const lateThreshold = config?.lateThresholdMinutes || 15;
        let streak = 0;

        for (const record of records) {
            if (!record.checkIn?.timestamp) break;
            
            const arrivalMinutes = this.getMinutesFromTimestamp(record.checkIn.timestamp);
            if (arrivalMinutes > standardStart + lateThreshold) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    calculateShortBreakDays(records) {
        let count = 0;
        const recentRecords = records.slice(0, 14);

        for (const record of recentRecords) {
            if (!record.checkIn?.timestamp || !record.checkOut?.timestamp) continue;
            
            // Check if break was taken and was at least 30 minutes
            if (record.breakStart?.timestamp && record.breakEnd?.timestamp) {
                const breakStart = new Date(record.breakStart.timestamp);
                const breakEnd = new Date(record.breakEnd.timestamp);
                const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
                
                if (breakMinutes < 30) {
                    count++;
                }
            } else {
                // No break recorded
                const hoursWorked = this.calculateHoursWorked(record);
                if (hoursWorked >= 6) {
                    count++; // Should have taken a break
                }
            }
        }

        return count;
    }

    calculateOvertimeTrend(records, config) {
        const standardHours = config?.standardHoursPerDay || 8;
        const weeks = [0, 0, 0]; // Last 3 weeks overtime

        const today = new Date();
        
        records.forEach(record => {
            const recordDate = new Date(record.date);
            const daysAgo = Math.floor((today - recordDate) / (1000 * 60 * 60 * 24));
            const weekIndex = Math.floor(daysAgo / 7);
            
            if (weekIndex < 3) {
                const hours = this.calculateHoursWorked(record);
                const overtime = Math.max(0, hours - standardHours);
                weeks[weekIndex] += overtime;
            }
        });

        // Compare trends
        if (weeks[0] > weeks[1] && weeks[1] > weeks[2]) {
            return 'increasing';
        } else if (weeks[0] < weeks[1] && weeks[1] < weeks[2]) {
            return 'decreasing';
        }
        return 'stable';
    }

    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getMinutesFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.getHours() * 60 + date.getMinutes();
    }

    isToday(dateStr) {
        const today = new Date().toISOString().split('T')[0];
        const recordDate = new Date(dateStr).toISOString().split('T')[0];
        return today === recordDate;
    }

    /**
     * Prioritize and deduplicate suggestions
     */
    prioritizeAndDedupe(suggestions) {
        // Priority order
        const priorityOrder = {
            [SuggestionPriority.URGENT]: 0,
            [SuggestionPriority.HIGH]: 1,
            [SuggestionPriority.MEDIUM]: 2,
            [SuggestionPriority.LOW]: 3
        };

        // Sort by priority
        suggestions.sort((a, b) => 
            priorityOrder[a.priority] - priorityOrder[b.priority]
        );

        // Deduplicate by type (keep highest priority)
        const seen = new Set();
        return suggestions.filter(s => {
            const key = `${s.type}-${s.data ? JSON.stringify(s.data) : ''}`;
            if (seen.has(s.type)) return false;
            seen.add(s.type);
            return true;
        });
    }
}


/**
 * Get user's leave balance from Firebase
 */
export async function getUserLeaveBalance(userId) {
    if (!browser || !db) return null;

    try {
        const balanceRef = ref(db, `leaveBalance/${userId}`);
        const snapshot = await get(balanceRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        
        // Return default balance if not set
        return {
            annual: 15,
            sick: 10,
            personal: 5,
            used: { annual: 0, sick: 0, personal: 0 },
            expiresAtYearEnd: true
        };
    } catch (error) {
        console.error('Error getting leave balance:', error);
        return null;
    }
}

/**
 * Save a suggestion dismissal
 */
export async function dismissSuggestion(userId, suggestionId) {
    if (!browser || !db) return false;

    try {
        const dismissRef = ref(db, `dismissedSuggestions/${userId}/${suggestionId}`);
        await set(dismissRef, {
            dismissedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error dismissing suggestion:', error);
        return false;
    }
}

/**
 * Get dismissed suggestions
 */
export async function getDismissedSuggestions(userId) {
    if (!browser || !db) return [];

    try {
        const dismissRef = ref(db, `dismissedSuggestions/${userId}`);
        const snapshot = await get(dismissRef);
        
        if (snapshot.exists()) {
            return Object.keys(snapshot.val());
        }
        return [];
    } catch (error) {
        console.error('Error getting dismissed suggestions:', error);
        return [];
    }
}

/**
 * Log suggestion action (for analytics)
 */
export async function logSuggestionAction(userId, suggestion, action) {
    if (!browser || !db) return false;

    try {
        const logRef = push(ref(db, `suggestionLogs/${userId}`));
        await set(logRef, {
            suggestionType: suggestion.type,
            suggestionTitle: suggestion.title,
            action,
            timestamp: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error logging suggestion action:', error);
        return false;
    }
}

/**
 * Quick function to get suggestions for a user
 */
export async function getSmartSuggestions(userId, attendanceRecords, workConfig) {
    const engine = new SmartLeaveSuggestionsEngine(userId);
    const leaveBalance = await getUserLeaveBalance(userId);
    const dismissed = await getDismissedSuggestions(userId);
    
    const suggestions = await engine.generateSuggestions(
        attendanceRecords,
        leaveBalance,
        workConfig
    );

    // Filter out dismissed suggestions
    return suggestions.filter(s => !dismissed.includes(s.type));
}

export default SmartLeaveSuggestionsEngine;
