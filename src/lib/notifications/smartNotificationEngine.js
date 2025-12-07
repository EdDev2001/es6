// src/lib/notifications/smartNotificationEngine.js
// Smart Notification Engine - Analyzes attendance data and generates meaningful notifications

import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { showPushNotification } from './pushNotificationService';
import { sendNotification, NotificationType } from '$lib/stores/notifications';

// Notification priority levels
export const NotificationPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

// Smart notification categories
export const SmartNotificationCategory = {
    ATTENDANCE_PATTERN: 'attendance_pattern',
    STREAK: 'streak',
    MILESTONE: 'milestone',
    WARNING: 'warning',
    REMINDER: 'reminder',
    INSIGHT: 'insight',
    GOAL: 'goal'
};

// Default thresholds for smart notifications
const DEFAULT_THRESHOLDS = {
    lateStreakWarning: 3,           // Warn after 3 consecutive late days
    absenceStreakWarning: 2,        // Warn after 2 consecutive absences
    perfectWeekCelebration: 5,      // Celebrate 5 on-time days in a week
    overtimeWarning: 10,            // Warn after 10+ hours overtime in a week
    earlyBirdStreak: 5,             // Celebrate 5 consecutive early arrivals
    improvementThreshold: 20,       // % improvement to celebrate
    consistencyStreak: 10,          // Days of consistent attendance
    monthlyGoalDays: 22             // Target work days per month
};

/**
 * Smart Notification Engine class
 */
export class SmartNotificationEngine {
    constructor(userId, options = {}) {
        this.userId = userId;
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
        this.enabled = options.enabled !== false;
        this.preferences = options.preferences || {};
    }

    /**
     * Analyze attendance data and generate smart notifications
     */
    async analyzeAndNotify(attendanceRecords, workConfig) {
        if (!this.enabled || !attendanceRecords?.length) return [];

        const notifications = [];
        const analysis = this.analyzePatterns(attendanceRecords, workConfig);

        // Check for various patterns and generate notifications
        notifications.push(...this.checkLatePatterns(analysis));
        notifications.push(...this.checkAbsencePatterns(analysis));
        notifications.push(...this.checkStreaks(analysis));
        notifications.push(...this.checkMilestones(analysis));
        notifications.push(...this.checkOvertimePatterns(analysis));
        notifications.push(...this.generateInsights(analysis));
        notifications.push(...this.checkGoalProgress(analysis));

        // Filter by user preferences and deduplicate
        const filteredNotifications = this.filterByPreferences(notifications);
        
        return filteredNotifications;
    }


    /**
     * Analyze attendance patterns from records
     */
    analyzePatterns(records, config) {
        const sortedRecords = [...records].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        const analysis = {
            totalDays: sortedRecords.length,
            presentDays: 0,
            lateDays: 0,
            absenceDays: 0,
            overtimeDays: 0,
            undertimeDays: 0,
            totalHoursWorked: 0,
            totalLateMinutes: 0,
            totalOvertimeMinutes: 0,
            consecutiveLateDays: 0,
            consecutiveAbsenceDays: 0,
            consecutiveOnTimeDays: 0,
            consecutiveEarlyDays: 0,
            currentStreak: { type: null, count: 0 },
            weeklyStats: {},
            monthlyStats: {},
            recentTrend: null,
            averageArrivalTime: 0,
            records: sortedRecords,
            config
        };

        let currentLateStreak = 0;
        let currentAbsenceStreak = 0;
        let currentOnTimeStreak = 0;
        let currentEarlyStreak = 0;
        let arrivalTimes = [];

        sortedRecords.forEach((record, index) => {
            const recordAnalysis = record.analysis || this.analyzeRecord(record, config);
            const weekKey = this.getWeekKey(record.date);
            const monthKey = this.getMonthKey(record.date);

            // Initialize weekly/monthly stats
            if (!analysis.weeklyStats[weekKey]) {
                analysis.weeklyStats[weekKey] = { 
                    days: 0, late: 0, absent: 0, overtime: 0, hours: 0 
                };
            }
            if (!analysis.monthlyStats[monthKey]) {
                analysis.monthlyStats[monthKey] = { 
                    days: 0, late: 0, absent: 0, overtime: 0, hours: 0, onTime: 0 
                };
            }

            if (recordAnalysis.isMissed) {
                analysis.absenceDays++;
                currentAbsenceStreak++;
                currentLateStreak = 0;
                currentOnTimeStreak = 0;
                currentEarlyStreak = 0;
                analysis.weeklyStats[weekKey].absent++;
                analysis.monthlyStats[monthKey].absent++;
            } else {
                analysis.presentDays++;
                currentAbsenceStreak = 0;
                analysis.totalHoursWorked += recordAnalysis.totalHours || 0;
                analysis.weeklyStats[weekKey].hours += recordAnalysis.totalHours || 0;
                analysis.monthlyStats[monthKey].hours += recordAnalysis.totalHours || 0;

                if (record.checkIn?.timestamp) {
                    const arrivalMinutes = this.getMinutesFromTimestamp(record.checkIn.timestamp);
                    arrivalTimes.push(arrivalMinutes);
                }

                if (recordAnalysis.isLate) {
                    analysis.lateDays++;
                    analysis.totalLateMinutes += recordAnalysis.lateMinutes || 0;
                    currentLateStreak++;
                    currentOnTimeStreak = 0;
                    currentEarlyStreak = 0;
                    analysis.weeklyStats[weekKey].late++;
                    analysis.monthlyStats[monthKey].late++;
                } else {
                    currentLateStreak = 0;
                    currentOnTimeStreak++;
                    analysis.monthlyStats[monthKey].onTime++;
                    
                    // Check for early arrival (more than 10 min early)
                    if (record.checkIn?.timestamp) {
                        const standardStart = this.parseTime(config.standardStartTime);
                        const arrivalMinutes = this.getMinutesFromTimestamp(record.checkIn.timestamp);
                        if (arrivalMinutes < standardStart - 10) {
                            currentEarlyStreak++;
                        } else {
                            currentEarlyStreak = 0;
                        }
                    }
                }

                if (recordAnalysis.isOvertime) {
                    analysis.overtimeDays++;
                    analysis.totalOvertimeMinutes += recordAnalysis.overtimeMinutes || 0;
                    analysis.weeklyStats[weekKey].overtime++;
                    analysis.monthlyStats[monthKey].overtime++;
                }

                if (recordAnalysis.isUndertime) {
                    analysis.undertimeDays++;
                }
            }

            analysis.weeklyStats[weekKey].days++;
            analysis.monthlyStats[monthKey].days++;

            // Track max streaks
            analysis.consecutiveLateDays = Math.max(analysis.consecutiveLateDays, currentLateStreak);
            analysis.consecutiveAbsenceDays = Math.max(analysis.consecutiveAbsenceDays, currentAbsenceStreak);
            analysis.consecutiveOnTimeDays = Math.max(analysis.consecutiveOnTimeDays, currentOnTimeStreak);
            analysis.consecutiveEarlyDays = Math.max(analysis.consecutiveEarlyDays, currentEarlyStreak);
        });

        // Current streaks (from most recent records)
        analysis.currentStreak = this.getCurrentStreak(sortedRecords, config);
        
        // Calculate average arrival time
        if (arrivalTimes.length > 0) {
            analysis.averageArrivalTime = arrivalTimes.reduce((a, b) => a + b, 0) / arrivalTimes.length;
        }

        // Analyze recent trend (last 7 days vs previous 7 days)
        analysis.recentTrend = this.analyzeRecentTrend(sortedRecords, config);

        return analysis;
    }


    /**
     * Check for late arrival patterns
     */
    checkLatePatterns(analysis) {
        const notifications = [];

        // Consecutive late days warning
        if (analysis.currentStreak.type === 'late' && 
            analysis.currentStreak.count >= this.thresholds.lateStreakWarning) {
            notifications.push({
                category: SmartNotificationCategory.WARNING,
                priority: NotificationPriority.HIGH,
                type: NotificationType.LATE,
                title: 'Late Arrival Pattern Detected',
                message: `You've been late ${analysis.currentStreak.count} days in a row. Consider adjusting your schedule to arrive on time.`,
                data: { streakCount: analysis.currentStreak.count },
                actionable: true,
                suggestions: [
                    'Set an earlier alarm',
                    'Prepare items the night before',
                    'Check traffic conditions before leaving'
                ]
            });
        }

        // Weekly late frequency warning
        const currentWeek = this.getWeekKey(new Date());
        const weekStats = analysis.weeklyStats[currentWeek];
        if (weekStats && weekStats.late >= 3) {
            notifications.push({
                category: SmartNotificationCategory.WARNING,
                priority: NotificationPriority.MEDIUM,
                type: NotificationType.LATE,
                title: 'High Late Frequency This Week',
                message: `You've been late ${weekStats.late} times this week. This may affect your attendance record.`,
                data: { weeklyLateCount: weekStats.late }
            });
        }

        // Improving late pattern (positive reinforcement)
        if (analysis.recentTrend?.lateImprovement > 0) {
            notifications.push({
                category: SmartNotificationCategory.INSIGHT,
                priority: NotificationPriority.LOW,
                type: NotificationType.GENERAL,
                title: 'Great Improvement! 🎉',
                message: `Your punctuality has improved by ${analysis.recentTrend.lateImprovement}% compared to last week. Keep it up!`,
                data: { improvement: analysis.recentTrend.lateImprovement }
            });
        }

        return notifications;
    }

    /**
     * Check for absence patterns
     */
    checkAbsencePatterns(analysis) {
        const notifications = [];

        // Consecutive absence warning
        if (analysis.currentStreak.type === 'absent' && 
            analysis.currentStreak.count >= this.thresholds.absenceStreakWarning) {
            notifications.push({
                category: SmartNotificationCategory.WARNING,
                priority: NotificationPriority.URGENT,
                type: NotificationType.ABSENCE,
                title: 'Multiple Absences Detected',
                message: `You've been absent ${analysis.currentStreak.count} consecutive days. Please contact your supervisor if you're experiencing issues.`,
                data: { absenceCount: analysis.currentStreak.count },
                actionable: true,
                requiresAction: true
            });
        }

        // Monthly absence threshold
        const currentMonth = this.getMonthKey(new Date());
        const monthStats = analysis.monthlyStats[currentMonth];
        if (monthStats && monthStats.absent >= 3) {
            notifications.push({
                category: SmartNotificationCategory.WARNING,
                priority: NotificationPriority.HIGH,
                type: NotificationType.ABSENCE,
                title: 'Monthly Absence Alert',
                message: `You have ${monthStats.absent} absences this month. This may impact your attendance standing.`,
                data: { monthlyAbsences: monthStats.absent }
            });
        }

        return notifications;
    }

    /**
     * Check for positive streaks and achievements
     */
    checkStreaks(analysis) {
        const notifications = [];

        // Perfect on-time streak
        if (analysis.currentStreak.type === 'onTime' && 
            analysis.currentStreak.count >= this.thresholds.perfectWeekCelebration) {
            notifications.push({
                category: SmartNotificationCategory.STREAK,
                priority: NotificationPriority.MEDIUM,
                type: NotificationType.GENERAL,
                title: 'On-Time Streak! 🔥',
                message: `Amazing! You've been on time for ${analysis.currentStreak.count} consecutive days. Keep up the excellent work!`,
                data: { streakCount: analysis.currentStreak.count },
                celebratory: true
            });
        }

        // Early bird streak
        if (analysis.consecutiveEarlyDays >= this.thresholds.earlyBirdStreak) {
            notifications.push({
                category: SmartNotificationCategory.STREAK,
                priority: NotificationPriority.LOW,
                type: NotificationType.GENERAL,
                title: 'Early Bird Achievement! 🐦',
                message: `You've arrived early ${analysis.consecutiveEarlyDays} days in a row. Your dedication is impressive!`,
                data: { earlyStreak: analysis.consecutiveEarlyDays },
                celebratory: true
            });
        }

        // Consistency streak
        if (analysis.consecutiveOnTimeDays >= this.thresholds.consistencyStreak) {
            notifications.push({
                category: SmartNotificationCategory.MILESTONE,
                priority: NotificationPriority.MEDIUM,
                type: NotificationType.GENERAL,
                title: 'Consistency Champion! 🏆',
                message: `${analysis.consecutiveOnTimeDays} days of consistent attendance! You're setting a great example.`,
                data: { consistencyStreak: analysis.consecutiveOnTimeDays },
                celebratory: true
            });
        }

        return notifications;
    }


    /**
     * Check for milestones
     */
    checkMilestones(analysis) {
        const notifications = [];
        const milestones = [10, 25, 50, 100, 200, 365, 500, 1000];

        // Total days milestone
        for (const milestone of milestones) {
            if (analysis.presentDays === milestone) {
                notifications.push({
                    category: SmartNotificationCategory.MILESTONE,
                    priority: NotificationPriority.MEDIUM,
                    type: NotificationType.GENERAL,
                    title: `${milestone} Days Milestone! 🎯`,
                    message: `Congratulations! You've completed ${milestone} days of attendance. That's a fantastic achievement!`,
                    data: { milestone, totalDays: analysis.presentDays },
                    celebratory: true
                });
                break;
            }
        }

        // Hours worked milestones
        const hourMilestones = [100, 500, 1000, 2000, 5000];
        for (const milestone of hourMilestones) {
            if (Math.floor(analysis.totalHoursWorked) === milestone) {
                notifications.push({
                    category: SmartNotificationCategory.MILESTONE,
                    priority: NotificationPriority.MEDIUM,
                    type: NotificationType.GENERAL,
                    title: `${milestone} Hours Worked! ⏰`,
                    message: `You've logged ${milestone} hours of work. Your dedication is remarkable!`,
                    data: { hoursMilestone: milestone },
                    celebratory: true
                });
                break;
            }
        }

        // Perfect month achievement
        const currentMonth = this.getMonthKey(new Date());
        const monthStats = analysis.monthlyStats[currentMonth];
        if (monthStats && monthStats.days >= 20 && monthStats.late === 0 && monthStats.absent === 0) {
            notifications.push({
                category: SmartNotificationCategory.MILESTONE,
                priority: NotificationPriority.HIGH,
                type: NotificationType.GENERAL,
                title: 'Perfect Month! 🌟',
                message: 'Incredible! You had a perfect attendance month with no late arrivals or absences!',
                data: { perfectMonth: currentMonth },
                celebratory: true
            });
        }

        return notifications;
    }

    /**
     * Check for overtime patterns
     */
    checkOvertimePatterns(analysis) {
        const notifications = [];

        // Weekly overtime warning
        const currentWeek = this.getWeekKey(new Date());
        const weekStats = analysis.weeklyStats[currentWeek];
        
        if (weekStats) {
            const weeklyOvertimeHours = (analysis.totalOvertimeMinutes / 60);
            
            if (weeklyOvertimeHours >= this.thresholds.overtimeWarning) {
                notifications.push({
                    category: SmartNotificationCategory.WARNING,
                    priority: NotificationPriority.HIGH,
                    type: NotificationType.GENERAL,
                    title: 'High Overtime Alert ⚠️',
                    message: `You've worked ${Math.round(weeklyOvertimeHours)} hours of overtime this week. Remember to maintain work-life balance.`,
                    data: { overtimeHours: weeklyOvertimeHours },
                    actionable: true,
                    suggestions: [
                        'Take regular breaks',
                        'Discuss workload with your manager',
                        'Prioritize tasks effectively'
                    ]
                });
            }
        }

        // Consistent overtime pattern
        if (analysis.overtimeDays >= 5) {
            const overtimePercentage = (analysis.overtimeDays / analysis.presentDays) * 100;
            if (overtimePercentage > 50) {
                notifications.push({
                    category: SmartNotificationCategory.INSIGHT,
                    priority: NotificationPriority.MEDIUM,
                    type: NotificationType.GENERAL,
                    title: 'Overtime Pattern Detected',
                    message: `You've worked overtime on ${Math.round(overtimePercentage)}% of your work days. Consider reviewing your workload.`,
                    data: { overtimePercentage }
                });
            }
        }

        return notifications;
    }

    /**
     * Generate insights based on attendance data
     */
    generateInsights(analysis) {
        const notifications = [];

        // Average hours insight
        const avgHours = analysis.presentDays > 0 
            ? analysis.totalHoursWorked / analysis.presentDays 
            : 0;
        
        if (avgHours > 0) {
            const standardHours = analysis.config?.standardHoursPerDay || 8;
            const deviation = ((avgHours - standardHours) / standardHours) * 100;

            if (Math.abs(deviation) > 10) {
                notifications.push({
                    category: SmartNotificationCategory.INSIGHT,
                    priority: NotificationPriority.LOW,
                    type: NotificationType.GENERAL,
                    title: 'Work Hours Insight',
                    message: deviation > 0 
                        ? `You average ${avgHours.toFixed(1)} hours/day, ${Math.abs(deviation).toFixed(0)}% above standard.`
                        : `You average ${avgHours.toFixed(1)} hours/day, ${Math.abs(deviation).toFixed(0)}% below standard.`,
                    data: { averageHours: avgHours, deviation }
                });
            }
        }

        // Punctuality score insight
        const punctualityScore = analysis.presentDays > 0
            ? ((analysis.presentDays - analysis.lateDays) / analysis.presentDays) * 100
            : 0;

        if (punctualityScore >= 95) {
            notifications.push({
                category: SmartNotificationCategory.INSIGHT,
                priority: NotificationPriority.LOW,
                type: NotificationType.GENERAL,
                title: 'Excellent Punctuality! ⭐',
                message: `Your punctuality score is ${punctualityScore.toFixed(0)}%. Outstanding performance!`,
                data: { punctualityScore },
                celebratory: true
            });
        } else if (punctualityScore < 70) {
            notifications.push({
                category: SmartNotificationCategory.INSIGHT,
                priority: NotificationPriority.MEDIUM,
                type: NotificationType.GENERAL,
                title: 'Punctuality Needs Attention',
                message: `Your punctuality score is ${punctualityScore.toFixed(0)}%. There's room for improvement.`,
                data: { punctualityScore },
                actionable: true
            });
        }

        // Best day pattern
        const dayPatterns = this.analyzeDayPatterns(analysis.records);
        if (dayPatterns.bestDay && dayPatterns.worstDay) {
            notifications.push({
                category: SmartNotificationCategory.INSIGHT,
                priority: NotificationPriority.LOW,
                type: NotificationType.GENERAL,
                title: 'Weekly Pattern Insight',
                message: `You tend to be most punctual on ${dayPatterns.bestDay}s and least on ${dayPatterns.worstDay}s.`,
                data: { dayPatterns }
            });
        }

        return notifications;
    }


    /**
     * Check goal progress
     */
    checkGoalProgress(analysis) {
        const notifications = [];
        const currentMonth = this.getMonthKey(new Date());
        const monthStats = analysis.monthlyStats[currentMonth];

        if (monthStats) {
            const targetDays = this.thresholds.monthlyGoalDays;
            const progress = (monthStats.days / targetDays) * 100;
            const daysRemaining = this.getDaysRemainingInMonth();

            // Goal progress update
            if (progress >= 100) {
                notifications.push({
                    category: SmartNotificationCategory.GOAL,
                    priority: NotificationPriority.MEDIUM,
                    type: NotificationType.GENERAL,
                    title: 'Monthly Goal Achieved! 🎉',
                    message: `You've reached your monthly attendance goal of ${targetDays} days!`,
                    data: { goalDays: targetDays, actualDays: monthStats.days },
                    celebratory: true
                });
            } else if (progress >= 75 && daysRemaining <= 7) {
                notifications.push({
                    category: SmartNotificationCategory.GOAL,
                    priority: NotificationPriority.LOW,
                    type: NotificationType.GENERAL,
                    title: 'Almost There!',
                    message: `You're ${Math.round(progress)}% toward your monthly goal. ${targetDays - monthStats.days} more days to go!`,
                    data: { progress, remaining: targetDays - monthStats.days }
                });
            }

            // On-time goal
            const onTimeGoal = Math.round(targetDays * 0.9); // 90% on-time target
            if (monthStats.onTime >= onTimeGoal) {
                notifications.push({
                    category: SmartNotificationCategory.GOAL,
                    priority: NotificationPriority.LOW,
                    type: NotificationType.GENERAL,
                    title: 'On-Time Goal Met! ✅',
                    message: `You've achieved your on-time attendance goal for this month!`,
                    data: { onTimeGoal, actualOnTime: monthStats.onTime },
                    celebratory: true
                });
            }
        }

        return notifications;
    }

    /**
     * Filter notifications by user preferences
     */
    filterByPreferences(notifications) {
        if (!this.preferences || Object.keys(this.preferences).length === 0) {
            return notifications;
        }

        return notifications.filter(notif => {
            // Check category preference
            if (this.preferences.disabledCategories?.includes(notif.category)) {
                return false;
            }

            // Check priority preference
            if (this.preferences.minPriority) {
                const priorityOrder = [
                    NotificationPriority.LOW,
                    NotificationPriority.MEDIUM,
                    NotificationPriority.HIGH,
                    NotificationPriority.URGENT
                ];
                const minIndex = priorityOrder.indexOf(this.preferences.minPriority);
                const notifIndex = priorityOrder.indexOf(notif.priority);
                if (notifIndex < minIndex) return false;
            }

            // Check celebratory preference
            if (this.preferences.disableCelebratory && notif.celebratory) {
                return false;
            }

            return true;
        });
    }

    // Helper methods

    /**
     * Get current streak from recent records
     */
    getCurrentStreak(records, config) {
        if (!records.length) return { type: null, count: 0 };

        const recentRecords = records.slice(-30).reverse(); // Last 30 days, most recent first
        let streakType = null;
        let streakCount = 0;

        for (const record of recentRecords) {
            const analysis = record.analysis || this.analyzeRecord(record, config);
            
            if (analysis.isMissed) {
                if (streakType === null) {
                    streakType = 'absent';
                    streakCount = 1;
                } else if (streakType === 'absent') {
                    streakCount++;
                } else {
                    break;
                }
            } else if (analysis.isLate) {
                if (streakType === null) {
                    streakType = 'late';
                    streakCount = 1;
                } else if (streakType === 'late') {
                    streakCount++;
                } else {
                    break;
                }
            } else {
                if (streakType === null) {
                    streakType = 'onTime';
                    streakCount = 1;
                } else if (streakType === 'onTime') {
                    streakCount++;
                } else {
                    break;
                }
            }
        }

        return { type: streakType, count: streakCount };
    }

    /**
     * Analyze recent trend (last 7 days vs previous 7 days)
     */
    analyzeRecentTrend(records, config) {
        if (records.length < 14) return null;

        const recent = records.slice(-7);
        const previous = records.slice(-14, -7);

        const recentLate = recent.filter(r => 
            (r.analysis || this.analyzeRecord(r, config)).isLate
        ).length;
        const previousLate = previous.filter(r => 
            (r.analysis || this.analyzeRecord(r, config)).isLate
        ).length;

        const lateImprovement = previousLate > 0 
            ? Math.round(((previousLate - recentLate) / previousLate) * 100)
            : recentLate === 0 ? 100 : 0;

        return {
            recentLateDays: recentLate,
            previousLateDays: previousLate,
            lateImprovement: lateImprovement > 0 ? lateImprovement : 0
        };
    }

    /**
     * Analyze day-of-week patterns
     */
    analyzeDayPatterns(records) {
        const dayStats = {
            0: { name: 'Sunday', late: 0, total: 0 },
            1: { name: 'Monday', late: 0, total: 0 },
            2: { name: 'Tuesday', late: 0, total: 0 },
            3: { name: 'Wednesday', late: 0, total: 0 },
            4: { name: 'Thursday', late: 0, total: 0 },
            5: { name: 'Friday', late: 0, total: 0 },
            6: { name: 'Saturday', late: 0, total: 0 }
        };

        records.forEach(record => {
            const day = new Date(record.date).getDay();
            dayStats[day].total++;
            if (record.analysis?.isLate) {
                dayStats[day].late++;
            }
        });

        let bestDay = null;
        let worstDay = null;
        let bestRate = 0;
        let worstRate = 100;

        Object.values(dayStats).forEach(stat => {
            if (stat.total >= 3) { // Need at least 3 data points
                const onTimeRate = ((stat.total - stat.late) / stat.total) * 100;
                if (onTimeRate > bestRate) {
                    bestRate = onTimeRate;
                    bestDay = stat.name;
                }
                if (onTimeRate < worstRate) {
                    worstRate = onTimeRate;
                    worstDay = stat.name;
                }
            }
        });

        return { bestDay, worstDay, dayStats };
    }


    /**
     * Analyze a single record
     */
    analyzeRecord(record, config) {
        const analysis = {
            isLate: false,
            isOvertime: false,
            isUndertime: false,
            isMissed: false,
            lateMinutes: 0,
            overtimeMinutes: 0,
            totalHours: 0
        };

        if (!record.checkIn?.timestamp) {
            analysis.isMissed = true;
            return analysis;
        }

        const checkInMinutes = this.getMinutesFromTimestamp(record.checkIn.timestamp);
        const standardStart = this.parseTime(config.standardStartTime);
        const lateThreshold = config.lateThresholdMinutes || 15;

        if (checkInMinutes > standardStart + lateThreshold) {
            analysis.isLate = true;
            analysis.lateMinutes = checkInMinutes - standardStart;
        }

        if (record.checkOut?.timestamp) {
            const checkIn = new Date(record.checkIn.timestamp);
            const checkOut = new Date(record.checkOut.timestamp);
            analysis.totalHours = (checkOut - checkIn) / (1000 * 60 * 60);

            const standardHours = config.standardHoursPerDay || 8;
            const overtimeThreshold = config.overtimeThresholdMinutes || 30;

            if (analysis.totalHours * 60 > standardHours * 60 + overtimeThreshold) {
                analysis.isOvertime = true;
                analysis.overtimeMinutes = (analysis.totalHours * 60) - (standardHours * 60);
            }

            if (analysis.totalHours * 60 < standardHours * 60 - overtimeThreshold) {
                analysis.isUndertime = true;
            }
        }

        return analysis;
    }

    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getMinutesFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.getHours() * 60 + date.getMinutes();
    }

    getWeekKey(date) {
        const d = new Date(date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
    }

    getMonthKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    getDaysRemainingInMonth() {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.getDate() - now.getDate();
    }
}

/**
 * Send smart notifications to user
 */
export async function sendSmartNotifications(userId, notifications, options = {}) {
    if (!browser || !notifications?.length) return { sent: 0, failed: 0 };

    const { showPush = true, saveToDb = true } = options;
    let sent = 0;
    let failed = 0;

    for (const notification of notifications) {
        try {
            // Save to database
            if (saveToDb) {
                await sendNotification(userId, {
                    type: notification.type,
                    title: notification.title,
                    message: notification.message
                });
            }

            // Show push notification for high priority
            if (showPush && (
                notification.priority === NotificationPriority.HIGH ||
                notification.priority === NotificationPriority.URGENT
            )) {
                await showPushNotification({
                    title: notification.title,
                    body: notification.message,
                    tag: `smart-${notification.category}`,
                    sound: notification.priority === NotificationPriority.URGENT ? 'urgent' : 'default',
                    vibrate: notification.priority === NotificationPriority.URGENT ? 'urgent' : 'default',
                    data: notification.data
                });
            }

            sent++;
        } catch (error) {
            console.error('Error sending smart notification:', error);
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(userId) {
    if (!browser || !db) return null;

    try {
        const prefsRef = ref(db, `users/${userId}/notificationPreferences`);
        const snapshot = await get(prefsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        return null;
    }
}

/**
 * Save user's notification preferences
 */
export async function saveNotificationPreferences(userId, preferences) {
    if (!browser || !db) return false;

    try {
        const prefsRef = ref(db, `users/${userId}/notificationPreferences`);
        await set(prefsRef, {
            ...preferences,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error saving notification preferences:', error);
        return false;
    }
}

/**
 * Schedule daily smart notification check
 */
export function scheduleSmartNotificationCheck(userId, attendanceRecords, workConfig, callback) {
    if (!browser) return null;

    const engine = new SmartNotificationEngine(userId);
    
    // Run immediately
    engine.analyzeAndNotify(attendanceRecords, workConfig).then(notifications => {
        if (callback) callback(notifications);
    });

    // Schedule daily check at 9 AM
    const now = new Date();
    const nextCheck = new Date(now);
    nextCheck.setHours(9, 0, 0, 0);
    if (nextCheck <= now) {
        nextCheck.setDate(nextCheck.getDate() + 1);
    }

    const msUntilCheck = nextCheck - now;
    const timeoutId = setTimeout(() => {
        engine.analyzeAndNotify(attendanceRecords, workConfig).then(notifications => {
            if (callback) callback(notifications);
        });
        // Reschedule for next day
        scheduleSmartNotificationCheck(userId, attendanceRecords, workConfig, callback);
    }, msUntilCheck);

    return timeoutId;
}

/**
 * Create a smart notification engine instance with user preferences
 */
export async function createSmartEngine(userId) {
    const preferences = await getNotificationPreferences(userId);
    return new SmartNotificationEngine(userId, { preferences });
}

export default SmartNotificationEngine;
