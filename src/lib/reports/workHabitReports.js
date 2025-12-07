// src/lib/reports/workHabitReports.js
// Work Habit Reports - Weekly/Monthly attendance reports with PDF generation

import { browser } from '$app/environment';
import { db } from '$lib/firebase';
import { ref, get, set, push } from 'firebase/database';

// Report Types
export const ReportType = {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    CUSTOM: 'custom'
};

// Report Sections
export const ReportSection = {
    SUMMARY: 'summary',
    ATTENDANCE: 'attendance',
    TRENDS: 'trends',
    WORKLOAD: 'workload',
    EARLY_LEAVE: 'early_leave',
    SUGGESTIONS: 'suggestions'
};

/**
 * Work Habit Report Generator
 */
export class WorkHabitReportGenerator {
    constructor(userId, options = {}) {
        this.userId = userId;
        this.userName = options.userName || 'Employee';
        this.department = options.department || '';
        this.workConfig = options.workConfig || {
            standardStartTime: '09:00',
            standardEndTime: '18:00',
            standardHoursPerDay: 8,
            lateThresholdMinutes: 15,
            earlyLeaveThresholdMinutes: 30
        };
    }

    /**
     * Generate a complete work habit report
     */
    async generateReport(records, reportType = ReportType.WEEKLY, dateRange = null) {
        const { startDate, endDate } = this.getDateRange(reportType, dateRange);
        const filteredRecords = this.filterRecordsByDate(records, startDate, endDate);

        const report = {
            meta: {
                reportId: `${this.userId}-${Date.now()}`,
                userId: this.userId,
                userName: this.userName,
                department: this.department,
                reportType,
                generatedAt: new Date().toISOString(),
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    label: this.getPeriodLabel(startDate, endDate, reportType)
                }
            },
            summary: this.generateSummary(filteredRecords),
            attendance: this.analyzeAttendance(filteredRecords),
            trends: this.analyzeTrends(filteredRecords),
            workload: this.analyzeWorkload(filteredRecords),
            earlyLeave: this.analyzeEarlyLeave(filteredRecords),
            suggestions: this.generateSuggestions(filteredRecords),
            charts: this.generateChartData(filteredRecords)
        };

        return report;
    }

    /**
     * Generate executive summary
     */
    generateSummary(records) {
        const totalDays = records.length;
        const presentDays = records.filter(r => r.checkIn?.timestamp).length;
        const absentDays = totalDays - presentDays;
        
        let totalHours = 0;
        let totalOvertime = 0;
        let lateDays = 0;
        let earlyLeaveDays = 0;
        let onTimeDays = 0;

        records.forEach(record => {
            if (!record.checkIn?.timestamp) return;

            const hours = this.calculateHours(record);
            totalHours += hours;

            const overtime = Math.max(0, hours - this.workConfig.standardHoursPerDay);
            totalOvertime += overtime;

            if (this.isLate(record)) lateDays++;
            else onTimeDays++;

            if (this.isEarlyLeave(record)) earlyLeaveDays++;
        });

        const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
        const punctualityRate = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        return {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            earlyLeaveDays,
            onTimeDays,
            totalHours: Math.round(totalHours * 10) / 10,
            totalOvertime: Math.round(totalOvertime * 10) / 10,
            avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
            punctualityRate: Math.round(punctualityRate),
            attendanceRate: Math.round(attendanceRate),
            score: this.calculateOverallScore(punctualityRate, attendanceRate, avgHoursPerDay)
        };
    }

    /**
     * Analyze attendance patterns
     */
    analyzeAttendance(records) {
        const dailyBreakdown = [];
        const weekdayStats = {
            0: { name: 'Sunday', count: 0, late: 0, hours: 0 },
            1: { name: 'Monday', count: 0, late: 0, hours: 0 },
            2: { name: 'Tuesday', count: 0, late: 0, hours: 0 },
            3: { name: 'Wednesday', count: 0, late: 0, hours: 0 },
            4: { name: 'Thursday', count: 0, late: 0, hours: 0 },
            5: { name: 'Friday', count: 0, late: 0, hours: 0 },
            6: { name: 'Saturday', count: 0, late: 0, hours: 0 }
        };

        records.forEach(record => {
            const date = new Date(record.date);
            const dayOfWeek = date.getDay();
            const hours = this.calculateHours(record);
            const isLate = this.isLate(record);
            const isEarly = this.isEarlyLeave(record);
            const isPresent = !!record.checkIn?.timestamp;

            dailyBreakdown.push({
                date: record.date,
                dayName: weekdayStats[dayOfWeek].name,
                checkIn: record.checkIn?.timestamp ? this.formatTime(record.checkIn.timestamp) : null,
                checkOut: record.checkOut?.timestamp ? this.formatTime(record.checkOut.timestamp) : null,
                hours: Math.round(hours * 10) / 10,
                status: !isPresent ? 'absent' : isLate ? 'late' : 'on-time',
                isEarlyLeave: isEarly,
                overtime: Math.max(0, hours - this.workConfig.standardHoursPerDay)
            });

            if (isPresent) {
                weekdayStats[dayOfWeek].count++;
                weekdayStats[dayOfWeek].hours += hours;
                if (isLate) weekdayStats[dayOfWeek].late++;
            }
        });

        // Calculate averages for weekday stats
        Object.values(weekdayStats).forEach(stat => {
            stat.avgHours = stat.count > 0 ? Math.round((stat.hours / stat.count) * 10) / 10 : 0;
            stat.lateRate = stat.count > 0 ? Math.round((stat.late / stat.count) * 100) : 0;
        });

        return {
            dailyBreakdown,
            weekdayStats: Object.values(weekdayStats),
            bestDay: this.findBestDay(weekdayStats),
            worstDay: this.findWorstDay(weekdayStats)
        };
    }


    /**
     * Analyze trends over time
     */
    analyzeTrends(records) {
        const sortedRecords = [...records].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        // Weekly trends
        const weeklyData = this.groupByWeek(sortedRecords);
        const weeklyTrends = Object.entries(weeklyData).map(([week, weekRecords]) => {
            const presentDays = weekRecords.filter(r => r.checkIn?.timestamp).length;
            const lateDays = weekRecords.filter(r => this.isLate(r)).length;
            const totalHours = weekRecords.reduce((sum, r) => sum + this.calculateHours(r), 0);
            
            return {
                week,
                presentDays,
                lateDays,
                totalHours: Math.round(totalHours * 10) / 10,
                avgHours: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
                punctualityRate: presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 0
            };
        });

        // Calculate trend direction
        const hoursChange = this.calculateTrendDirection(weeklyTrends.map(w => w.avgHours));
        const punctualityChange = this.calculateTrendDirection(weeklyTrends.map(w => w.punctualityRate));

        // Arrival time trend
        const arrivalTimes = sortedRecords
            .filter(r => r.checkIn?.timestamp)
            .map(r => ({
                date: r.date,
                minutes: this.getMinutesFromTimestamp(r.checkIn.timestamp)
            }));

        const avgArrivalTrend = this.calculateMovingAverage(arrivalTimes.map(a => a.minutes), 5);

        return {
            weeklyTrends,
            hoursChange: {
                direction: hoursChange > 0 ? 'increasing' : hoursChange < 0 ? 'decreasing' : 'stable',
                percentage: Math.abs(hoursChange)
            },
            punctualityChange: {
                direction: punctualityChange > 0 ? 'improving' : punctualityChange < 0 ? 'declining' : 'stable',
                percentage: Math.abs(punctualityChange)
            },
            arrivalTimeTrend: {
                data: arrivalTimes,
                movingAverage: avgArrivalTrend,
                trend: this.calculateTrendDirection(avgArrivalTrend) < 0 ? 'earlier' : 'later'
            }
        };
    }

    /**
     * Analyze workload balance
     */
    analyzeWorkload(records) {
        const presentRecords = records.filter(r => r.checkIn?.timestamp);
        
        // Hours distribution
        const hoursDistribution = {
            under6: 0,
            normal: 0,    // 6-9 hours
            overtime: 0,  // 9-11 hours
            excessive: 0  // 11+ hours
        };

        let totalOvertime = 0;
        let maxHoursDay = null;
        let minHoursDay = null;
        let maxHours = 0;
        let minHours = Infinity;

        presentRecords.forEach(record => {
            const hours = this.calculateHours(record);
            
            if (hours < 6) hoursDistribution.under6++;
            else if (hours <= 9) hoursDistribution.normal++;
            else if (hours <= 11) hoursDistribution.overtime++;
            else hoursDistribution.excessive++;

            if (hours > this.workConfig.standardHoursPerDay) {
                totalOvertime += hours - this.workConfig.standardHoursPerDay;
            }

            if (hours > maxHours) {
                maxHours = hours;
                maxHoursDay = { date: record.date, hours };
            }
            if (hours < minHours && hours > 0) {
                minHours = hours;
                minHoursDay = { date: record.date, hours };
            }
        });

        // Calculate balance score (0-100)
        const normalPercentage = presentRecords.length > 0 
            ? (hoursDistribution.normal / presentRecords.length) * 100 
            : 0;
        const excessivePercentage = presentRecords.length > 0 
            ? (hoursDistribution.excessive / presentRecords.length) * 100 
            : 0;
        
        const balanceScore = Math.max(0, Math.min(100, 
            normalPercentage - (excessivePercentage * 2)
        ));

        return {
            hoursDistribution,
            totalOvertime: Math.round(totalOvertime * 10) / 10,
            avgOvertime: presentRecords.length > 0 
                ? Math.round((totalOvertime / presentRecords.length) * 10) / 10 
                : 0,
            maxHoursDay,
            minHoursDay,
            balanceScore: Math.round(balanceScore),
            balanceStatus: balanceScore >= 70 ? 'healthy' : balanceScore >= 40 ? 'moderate' : 'concerning',
            recommendations: this.getWorkloadRecommendations(hoursDistribution, totalOvertime)
        };
    }

    /**
     * Analyze early leave patterns
     */
    analyzeEarlyLeave(records) {
        const earlyLeaves = [];
        let totalEarlyMinutes = 0;

        records.forEach(record => {
            if (!record.checkOut?.timestamp) return;

            const checkOutMinutes = this.getMinutesFromTimestamp(record.checkOut.timestamp);
            const standardEnd = this.parseTime(this.workConfig.standardEndTime);
            const earlyMinutes = standardEnd - checkOutMinutes;

            if (earlyMinutes >= this.workConfig.earlyLeaveThresholdMinutes) {
                earlyLeaves.push({
                    date: record.date,
                    checkOut: this.formatTime(record.checkOut.timestamp),
                    earlyBy: earlyMinutes,
                    reason: record.earlyLeaveReason || 'Not specified'
                });
                totalEarlyMinutes += earlyMinutes;
            }
        });

        // Pattern detection
        const dayPattern = this.detectDayPattern(earlyLeaves);
        const frequencyTrend = this.calculateFrequencyTrend(earlyLeaves, records.length);

        return {
            count: earlyLeaves.length,
            instances: earlyLeaves,
            totalMinutesLost: totalEarlyMinutes,
            avgEarlyMinutes: earlyLeaves.length > 0 
                ? Math.round(totalEarlyMinutes / earlyLeaves.length) 
                : 0,
            percentage: records.length > 0 
                ? Math.round((earlyLeaves.length / records.length) * 100) 
                : 0,
            dayPattern,
            frequencyTrend,
            impact: this.assessEarlyLeaveImpact(earlyLeaves.length, records.length)
        };
    }

    /**
     * Generate behavioral improvement suggestions
     */
    generateSuggestions(records) {
        const suggestions = [];
        const summary = this.generateSummary(records);
        const workload = this.analyzeWorkload(records);
        const earlyLeave = this.analyzeEarlyLeave(records);
        const attendance = this.analyzeAttendance(records);

        // Punctuality suggestions
        if (summary.punctualityRate < 80) {
            suggestions.push({
                category: 'punctuality',
                priority: 'high',
                title: 'Improve Arrival Time',
                description: `Your punctuality rate is ${summary.punctualityRate}%. Aim for at least 90%.`,
                actions: [
                    'Set multiple alarms 30 minutes before usual wake time',
                    'Prepare work items the night before',
                    'Consider adjusting your commute route or timing',
                    'Request flexible hours if available'
                ],
                metric: { current: summary.punctualityRate, target: 90, unit: '%' }
            });
        }

        // Overtime suggestions
        if (workload.totalOvertime > 10) {
            suggestions.push({
                category: 'workload',
                priority: workload.totalOvertime > 20 ? 'urgent' : 'medium',
                title: 'Reduce Overtime Hours',
                description: `You've accumulated ${workload.totalOvertime} hours of overtime. This may affect your wellbeing.`,
                actions: [
                    'Prioritize tasks using the Eisenhower matrix',
                    'Discuss workload with your manager',
                    'Delegate tasks where possible',
                    'Set firm end-of-day boundaries'
                ],
                metric: { current: workload.totalOvertime, target: 5, unit: 'hours' }
            });
        }

        // Early leave suggestions
        if (earlyLeave.percentage > 20) {
            suggestions.push({
                category: 'attendance',
                priority: 'medium',
                title: 'Address Early Leave Pattern',
                description: `You left early on ${earlyLeave.percentage}% of work days.`,
                actions: [
                    'Plan personal appointments outside work hours',
                    'Communicate scheduling needs with your team',
                    'Use flexible hours if available',
                    'Consider time-blocking for focused work'
                ],
                metric: { current: earlyLeave.percentage, target: 10, unit: '%' }
            });
        }

        // Work-life balance suggestions
        if (workload.balanceScore < 50) {
            suggestions.push({
                category: 'balance',
                priority: 'high',
                title: 'Improve Work-Life Balance',
                description: 'Your work hours show an imbalanced pattern that may lead to burnout.',
                actions: [
                    'Take regular breaks during the day',
                    'Use your vacation days',
                    'Set boundaries for after-hours work',
                    'Practice stress management techniques'
                ],
                metric: { current: workload.balanceScore, target: 70, unit: 'score' }
            });
        }

        // Day-specific suggestions
        if (attendance.worstDay) {
            suggestions.push({
                category: 'pattern',
                priority: 'low',
                title: `Focus on ${attendance.worstDay.name}s`,
                description: `${attendance.worstDay.name} shows the highest late arrival rate (${attendance.worstDay.lateRate}%).`,
                actions: [
                    `Prepare extra well on ${attendance.worstDay.name} eve`,
                    'Identify what makes this day challenging',
                    'Consider scheduling important meetings later on this day'
                ]
            });
        }

        // Positive reinforcement
        if (summary.punctualityRate >= 95) {
            suggestions.push({
                category: 'recognition',
                priority: 'info',
                title: 'Excellent Punctuality! 🌟',
                description: `Your ${summary.punctualityRate}% punctuality rate is outstanding. Keep it up!`,
                actions: ['Continue your current routine', 'Share tips with colleagues']
            });
        }

        return suggestions.sort((a, b) => {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, info: 4 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }


    /**
     * Generate chart data for visualization
     */
    generateChartData(records) {
        const sortedRecords = [...records].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        // Daily hours chart
        const dailyHoursChart = sortedRecords.map(record => ({
            date: record.date,
            label: this.formatDateShort(record.date),
            hours: Math.round(this.calculateHours(record) * 10) / 10,
            standard: this.workConfig.standardHoursPerDay
        }));

        // Arrival time chart
        const arrivalTimeChart = sortedRecords
            .filter(r => r.checkIn?.timestamp)
            .map(record => ({
                date: record.date,
                label: this.formatDateShort(record.date),
                minutes: this.getMinutesFromTimestamp(record.checkIn.timestamp),
                time: this.formatTime(record.checkIn.timestamp),
                standard: this.parseTime(this.workConfig.standardStartTime)
            }));

        // Weekly summary chart
        const weeklyData = this.groupByWeek(sortedRecords);
        const weeklySummaryChart = Object.entries(weeklyData).map(([week, weekRecords]) => {
            const present = weekRecords.filter(r => r.checkIn?.timestamp).length;
            const late = weekRecords.filter(r => this.isLate(r)).length;
            const hours = weekRecords.reduce((sum, r) => sum + this.calculateHours(r), 0);
            
            return {
                week,
                label: `Week ${week.split('-W')[1]}`,
                presentDays: present,
                lateDays: late,
                onTimeDays: present - late,
                totalHours: Math.round(hours * 10) / 10
            };
        });

        // Status distribution (pie chart data)
        const statusDistribution = {
            onTime: sortedRecords.filter(r => r.checkIn?.timestamp && !this.isLate(r)).length,
            late: sortedRecords.filter(r => this.isLate(r)).length,
            absent: sortedRecords.filter(r => !r.checkIn?.timestamp).length
        };

        // Hours distribution (pie chart data)
        const workload = this.analyzeWorkload(records);

        return {
            dailyHours: dailyHoursChart,
            arrivalTime: arrivalTimeChart,
            weeklySummary: weeklySummaryChart,
            statusDistribution,
            hoursDistribution: workload.hoursDistribution
        };
    }

    // Helper methods

    getDateRange(reportType, customRange) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        let startDate, endDate;

        if (customRange) {
            startDate = new Date(customRange.start);
            endDate = new Date(customRange.end);
        } else if (reportType === ReportType.WEEKLY) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
        } else if (reportType === ReportType.MONTHLY) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = today;
        } else {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
        }

        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
    }

    filterRecordsByDate(records, startDate, endDate) {
        return records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    getPeriodLabel(startDate, endDate, reportType) {
        const options = { month: 'short', day: 'numeric' };
        const start = startDate.toLocaleDateString('en-US', options);
        const end = endDate.toLocaleDateString('en-US', options);
        
        if (reportType === ReportType.WEEKLY) {
            return `Week of ${start} - ${end}`;
        } else if (reportType === ReportType.MONTHLY) {
            return `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        }
        return `${start} - ${end}`;
    }

    calculateHours(record) {
        if (!record.checkIn?.timestamp) return 0;
        
        const checkIn = new Date(record.checkIn.timestamp);
        const checkOut = record.checkOut?.timestamp 
            ? new Date(record.checkOut.timestamp)
            : new Date();
        
        let breakMinutes = 0;
        if (record.breakStart?.timestamp && record.breakEnd?.timestamp) {
            const breakStart = new Date(record.breakStart.timestamp);
            const breakEnd = new Date(record.breakEnd.timestamp);
            breakMinutes = (breakEnd - breakStart) / (1000 * 60);
        }
        
        const totalMinutes = (checkOut - checkIn) / (1000 * 60) - breakMinutes;
        return Math.max(0, totalMinutes / 60);
    }

    isLate(record) {
        if (!record.checkIn?.timestamp) return false;
        
        const arrivalMinutes = this.getMinutesFromTimestamp(record.checkIn.timestamp);
        const standardStart = this.parseTime(this.workConfig.standardStartTime);
        
        return arrivalMinutes > standardStart + this.workConfig.lateThresholdMinutes;
    }

    isEarlyLeave(record) {
        if (!record.checkOut?.timestamp) return false;
        
        const departureMinutes = this.getMinutesFromTimestamp(record.checkOut.timestamp);
        const standardEnd = this.parseTime(this.workConfig.standardEndTime);
        
        return departureMinutes < standardEnd - this.workConfig.earlyLeaveThresholdMinutes;
    }

    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getMinutesFromTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.getHours() * 60 + date.getMinutes();
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    formatDateShort(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    groupByWeek(records) {
        const weeks = {};
        records.forEach(record => {
            const date = new Date(record.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate()) / 7)}`;
            
            if (!weeks[weekKey]) weeks[weekKey] = [];
            weeks[weekKey].push(record);
        });
        return weeks;
    }

    calculateOverallScore(punctuality, attendance, avgHours) {
        const punctualityScore = punctuality * 0.4;
        const attendanceScore = attendance * 0.4;
        const hoursScore = Math.min(100, (avgHours / this.workConfig.standardHoursPerDay) * 100) * 0.2;
        
        return Math.round(punctualityScore + attendanceScore + hoursScore);
    }

    findBestDay(weekdayStats) {
        let best = null;
        let bestRate = -1;
        
        Object.values(weekdayStats).forEach(stat => {
            if (stat.count >= 2) {
                const onTimeRate = 100 - stat.lateRate;
                if (onTimeRate > bestRate) {
                    bestRate = onTimeRate;
                    best = { ...stat, onTimeRate };
                }
            }
        });
        
        return best;
    }

    findWorstDay(weekdayStats) {
        let worst = null;
        let worstRate = 101;
        
        Object.values(weekdayStats).forEach(stat => {
            if (stat.count >= 2) {
                const onTimeRate = 100 - stat.lateRate;
                if (onTimeRate < worstRate) {
                    worstRate = onTimeRate;
                    worst = { ...stat, onTimeRate };
                }
            }
        });
        
        return worst;
    }

    calculateTrendDirection(values) {
        if (values.length < 2) return 0;
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (firstAvg === 0) return 0;
        return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
    }

    calculateMovingAverage(values, window) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            const start = Math.max(0, i - window + 1);
            const subset = values.slice(start, i + 1);
            result.push(subset.reduce((a, b) => a + b, 0) / subset.length);
        }
        return result;
    }

    getWorkloadRecommendations(distribution, totalOvertime) {
        const recommendations = [];
        
        if (distribution.excessive > 0) {
            recommendations.push('Reduce days with 11+ hours - this is unsustainable');
        }
        if (distribution.under6 > 2) {
            recommendations.push('Several short days detected - ensure consistent work hours');
        }
        if (totalOvertime > 15) {
            recommendations.push('High overtime accumulated - consider taking time off');
        }
        if (distribution.normal < distribution.overtime + distribution.excessive) {
            recommendations.push('More overtime days than normal days - review workload');
        }
        
        return recommendations;
    }

    detectDayPattern(earlyLeaves) {
        const dayCounts = {};
        earlyLeaves.forEach(leave => {
            const day = new Date(leave.date).toLocaleDateString('en-US', { weekday: 'long' });
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        
        const maxDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        return maxDay ? { day: maxDay[0], count: maxDay[1] } : null;
    }

    calculateFrequencyTrend(earlyLeaves, totalDays) {
        if (earlyLeaves.length < 2) return 'stable';
        
        const midpoint = Math.floor(earlyLeaves.length / 2);
        const firstHalf = earlyLeaves.slice(0, midpoint).length;
        const secondHalf = earlyLeaves.slice(midpoint).length;
        
        if (secondHalf > firstHalf * 1.5) return 'increasing';
        if (secondHalf < firstHalf * 0.5) return 'decreasing';
        return 'stable';
    }

    assessEarlyLeaveImpact(count, totalDays) {
        const percentage = (count / totalDays) * 100;
        if (percentage > 30) return { level: 'high', message: 'Significant impact on productivity' };
        if (percentage > 15) return { level: 'moderate', message: 'Noticeable pattern detected' };
        return { level: 'low', message: 'Within acceptable range' };
    }
}


/**
 * Generate PDF report (returns HTML that can be printed/saved as PDF)
 */
export function generatePDFContent(report) {
    const { meta, summary, attendance, trends, workload, earlyLeave, suggestions } = report;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Work Habit Report - ${meta.userName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            color: #1f2937; 
            line-height: 1.5;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4f46e5;
        }
        .header h1 { 
            font-size: 28px; 
            color: #4f46e5;
            margin-bottom: 8px;
        }
        .header .period { 
            font-size: 16px; 
            color: #6b7280;
        }
        .header .meta {
            margin-top: 12px;
            font-size: 14px;
            color: #9ca3af;
        }
        .section { 
            margin-bottom: 32px;
            page-break-inside: avoid;
        }
        .section h2 { 
            font-size: 18px;
            color: #374151;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }
        .score-card {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
        }
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .score-circle .score { font-size: 36px; font-weight: bold; }
        .score-circle .label { font-size: 12px; opacity: 0.9; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }
        .stat-box {
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-box .value { 
            font-size: 24px; 
            font-weight: bold;
            color: #4f46e5;
        }
        .stat-box .label { 
            font-size: 12px; 
            color: #6b7280;
            margin-top: 4px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th { 
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }
        .status-badge.on-time { background: #d1fae5; color: #065f46; }
        .status-badge.late { background: #fee2e2; color: #991b1b; }
        .status-badge.absent { background: #f3f4f6; color: #6b7280; }
        .suggestion-card {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 0 8px 8px 0;
        }
        .suggestion-card.high { border-left-color: #ef4444; background: #fef2f2; }
        .suggestion-card.urgent { border-left-color: #dc2626; background: #fef2f2; }
        .suggestion-card h4 { 
            font-size: 14px;
            margin-bottom: 8px;
            color: #1f2937;
        }
        .suggestion-card p { 
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 8px;
        }
        .suggestion-card ul {
            margin-left: 20px;
            font-size: 12px;
            color: #6b7280;
        }
        .trend-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
        }
        .trend-indicator.up { color: #059669; }
        .trend-indicator.down { color: #dc2626; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
        }
        @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Work Habit Report</h1>
        <div class="period">${meta.period.label}</div>
        <div class="meta">
            <strong>${meta.userName}</strong> ${meta.department ? `• ${meta.department}` : ''}
            <br>Generated: ${new Date(meta.generatedAt).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })}
        </div>
    </div>

    <div class="section">
        <div class="score-card">
            <div class="score-circle">
                <span class="score">${summary.score}</span>
                <span class="label">Overall Score</span>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-box">
                <div class="value">${summary.presentDays}/${summary.totalDays}</div>
                <div class="label">Days Present</div>
            </div>
            <div class="stat-box">
                <div class="value">${summary.punctualityRate}%</div>
                <div class="label">Punctuality</div>
            </div>
            <div class="stat-box">
                <div class="value">${summary.totalHours}h</div>
                <div class="label">Total Hours</div>
            </div>
            <div class="stat-box">
                <div class="value">${summary.avgHoursPerDay}h</div>
                <div class="label">Avg/Day</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📅 Daily Attendance</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${attendance.dailyBreakdown.slice(0, 14).map(day => `
                    <tr>
                        <td>${day.date}</td>
                        <td>${day.dayName}</td>
                        <td>${day.checkIn || '-'}</td>
                        <td>${day.checkOut || '-'}</td>
                        <td>${day.hours}h</td>
                        <td><span class="status-badge ${day.status}">${day.status}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📈 Trends & Patterns</h2>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="value">
                    <span class="trend-indicator ${trends.punctualityChange.direction === 'improving' ? 'up' : 'down'}">
                        ${trends.punctualityChange.direction === 'improving' ? '↑' : trends.punctualityChange.direction === 'declining' ? '↓' : '→'}
                        ${trends.punctualityChange.percentage}%
                    </span>
                </div>
                <div class="label">Punctuality Trend</div>
            </div>
            <div class="stat-box">
                <div class="value">${workload.balanceScore}</div>
                <div class="label">Balance Score</div>
            </div>
            <div class="stat-box">
                <div class="value">${summary.totalOvertime}h</div>
                <div class="label">Total Overtime</div>
            </div>
            <div class="stat-box">
                <div class="value">${earlyLeave.count}</div>
                <div class="label">Early Leaves</div>
            </div>
        </div>
        ${attendance.bestDay ? `<p style="font-size: 13px; color: #6b7280;">
            🌟 Best day: <strong>${attendance.bestDay.name}</strong> (${attendance.bestDay.onTimeRate}% on-time)
            ${attendance.worstDay ? ` • Needs attention: <strong>${attendance.worstDay.name}</strong> (${attendance.worstDay.lateRate}% late)` : ''}
        </p>` : ''}
    </div>

    ${suggestions.length > 0 ? `
    <div class="section">
        <h2>💡 Improvement Suggestions</h2>
        ${suggestions.slice(0, 4).map(s => `
            <div class="suggestion-card ${s.priority}">
                <h4>${s.title}</h4>
                <p>${s.description}</p>
                ${s.actions ? `<ul>${s.actions.slice(0, 3).map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was automatically generated by the Attendance System.</p>
        <p>Report ID: ${meta.reportId}</p>
    </div>
</body>
</html>`;
}

/**
 * Download report as PDF (using browser print)
 */
export function downloadReportAsPDF(report) {
    if (!browser) return;

    const content = generatePDFContent(report);
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        
        // Wait for content to load then trigger print
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 250);
        };
    }
}

/**
 * Save report to Firebase
 */
export async function saveReport(userId, report) {
    if (!browser || !db) return null;

    try {
        const reportRef = push(ref(db, `reports/${userId}`));
        await set(reportRef, {
            ...report,
            savedAt: new Date().toISOString()
        });
        return reportRef.key;
    } catch (error) {
        console.error('Error saving report:', error);
        return null;
    }
}

/**
 * Get saved reports
 */
export async function getSavedReports(userId, limit = 10) {
    if (!browser || !db) return [];

    try {
        const reportsRef = ref(db, `reports/${userId}`);
        const snapshot = await get(reportsRef);
        
        if (!snapshot.exists()) return [];

        const reports = [];
        snapshot.forEach(child => {
            reports.push({ id: child.key, ...child.val() });
        });

        return reports
            .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting reports:', error);
        return [];
    }
}

/**
 * Schedule automatic report generation
 */
export async function scheduleAutoReport(userId, schedule) {
    if (!browser || !db) return false;

    try {
        const scheduleRef = ref(db, `reportSchedules/${userId}`);
        await set(scheduleRef, {
            ...schedule,
            enabled: true,
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error scheduling report:', error);
        return false;
    }
}

/**
 * Get report schedule
 */
export async function getReportSchedule(userId) {
    if (!browser || !db) return null;

    try {
        const scheduleRef = ref(db, `reportSchedules/${userId}`);
        const snapshot = await get(scheduleRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error getting schedule:', error);
        return null;
    }
}

/**
 * Queue report for email delivery (to be processed by backend)
 */
export async function queueReportEmail(userId, report, emailOptions) {
    if (!browser || !db) return false;

    try {
        const queueRef = push(ref(db, `emailQueue`));
        await set(queueRef, {
            type: 'work_habit_report',
            userId,
            reportId: report.meta.reportId,
            email: emailOptions.email,
            subject: emailOptions.subject || `Work Habit Report - ${report.meta.period.label}`,
            reportData: report,
            status: 'pending',
            queuedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('Error queuing email:', error);
        return false;
    }
}

export default WorkHabitReportGenerator;
