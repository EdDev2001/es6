<script>
    import { onMount } from 'svelte';
    import { IconFlame, IconTrophy, IconMedal, IconChartBar, IconStar, IconCrown } from '@tabler/icons-svelte';
    import { getGamificationData, getLeaderboard, getUserRank, BadgeTypes } from '$lib/stores/gamification.js';

    export let userId;

    let gamificationData = null;
    let leaderboard = [];
    let userRank = null;
    let loading = true;
    let activeTab = 'overview';

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        try {
            const [gamifResult, leaderboardResult, rankResult] = await Promise.all([
                getGamificationData(userId),
                getLeaderboard(10),
                getUserRank(userId)
            ]);
            
            // Use default data if null
            gamificationData = gamifResult || {
                currentStreak: 0,
                longestStreak: 0,
                totalCheckIns: 0,
                earlyCheckIns: 0,
                perfectMonths: 0,
                badges: [],
                lastCheckInDate: null,
                points: 0
            };
            leaderboard = leaderboardResult || [];
            userRank = rankResult;
        } catch (error) {
            console.error('Error loading gamification data:', error);
            // Set defaults on error
            gamificationData = {
                currentStreak: 0,
                longestStreak: 0,
                totalCheckIns: 0,
                earlyCheckIns: 0,
                perfectMonths: 0,
                badges: [],
                lastCheckInDate: null,
                points: 0
            };
            leaderboard = [];
            userRank = null;
        }
        loading = false;
    }

    function getBadgeInfo(badgeId) {
        return Object.values(BadgeTypes).find(b => b.id === badgeId) || null;
    }

    function getStreakMessage(streak) {
        if (streak >= 30) return "Incredible! You're on fire! 🔥";
        if (streak >= 14) return "Amazing consistency! Keep it up!";
        if (streak >= 7) return "Great week! You're building momentum!";
        if (streak >= 3) return "Nice start! Keep the streak going!";
        if (streak >= 1) return "Good job! Come back tomorrow!";
        return "Start your streak today!";
    }
</script>

<div class="gamification-container">
    {#if loading}
        <div class="loading-state">
            <div class="apple-spinner"></div>
            <p>Loading achievements...</p>
        </div>
    {:else}
        <!-- Tab Navigation -->
        <div class="tab-nav">
            <button class="tab-btn" class:active={activeTab === 'overview'} on:click={() => activeTab = 'overview'}>
                <IconChartBar size={18} stroke={1.5} />
                <span>Overview</span>
            </button>
            <button class="tab-btn" class:active={activeTab === 'badges'} on:click={() => activeTab = 'badges'}>
                <IconMedal size={18} stroke={1.5} />
                <span>Badges</span>
            </button>
            <button class="tab-btn" class:active={activeTab === 'leaderboard'} on:click={() => activeTab = 'leaderboard'}>
                <IconTrophy size={18} stroke={1.5} />
                <span>Leaderboard</span>
            </button>
        </div>

        <!-- Overview Tab -->
        {#if activeTab === 'overview'}
            <div class="overview-section apple-animate-in">
                <!-- Streak Card -->
                <div class="streak-card">
                    <div class="streak-icon">
                        <IconFlame size={32} stroke={1.5} />
                    </div>
                    <div class="streak-content">
                        <div class="streak-number">{gamificationData?.currentStreak || 0}</div>
                        <div class="streak-label">Day Streak</div>
                        <p class="streak-message">{getStreakMessage(gamificationData?.currentStreak || 0)}</p>
                    </div>
                    <div class="streak-best">
                        <span class="best-label">Best</span>
                        <span class="best-value">{gamificationData?.longestStreak || 0}</span>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon points">
                            <IconStar size={20} stroke={1.5} />
                        </div>
                        <div class="stat-value">{gamificationData?.points || 0}</div>
                        <div class="stat-label">Total Points</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon checkins">
                            <IconChartBar size={20} stroke={1.5} />
                        </div>
                        <div class="stat-value">{gamificationData?.totalCheckIns || 0}</div>
                        <div class="stat-label">Check-ins</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon rank">
                            <IconCrown size={20} stroke={1.5} />
                        </div>
                        <div class="stat-value">#{userRank || '-'}</div>
                        <div class="stat-label">Your Rank</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon badges">
                            <IconMedal size={20} stroke={1.5} />
                        </div>
                        <div class="stat-value">{gamificationData?.badges?.length || 0}</div>
                        <div class="stat-label">Badges</div>
                    </div>
                </div>

                <!-- Recent Badges Preview -->
                {#if gamificationData?.badges?.length > 0}
                    <div class="badges-preview">
                        <h4>Recent Badges</h4>
                        <div class="badges-row">
                            {#each gamificationData.badges.slice(-3) as badgeId}
                                {@const badge = getBadgeInfo(badgeId)}
                                {#if badge}
                                    <div class="badge-mini" style="--badge-color: {badge.color}">
                                        <span class="badge-emoji">{badge.icon}</span>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Badges Tab -->
        {#if activeTab === 'badges'}
            <div class="badges-section apple-animate-in">
                <div class="badges-grid">
                    {#each Object.values(BadgeTypes) as badge}
                        {@const earned = gamificationData?.badges?.includes(badge.id)}
                        <div class="badge-card" class:earned style="--badge-color: {badge.color}">
                            <div class="badge-icon-wrapper">
                                <span class="badge-emoji">{badge.icon}</span>
                                {#if !earned}
                                    <div class="badge-lock">🔒</div>
                                {/if}
                            </div>
                            <div class="badge-info">
                                <h4 class="badge-name">{badge.name}</h4>
                                <p class="badge-desc">{badge.description}</p>
                            </div>
                            {#if earned}
                                <div class="badge-earned-tag">Earned</div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Leaderboard Tab -->
        {#if activeTab === 'leaderboard'}
            <div class="leaderboard-section apple-animate-in">
                {#if leaderboard.length === 0}
                    <div class="empty-state">
                        <IconTrophy size={48} stroke={1} />
                        <p>No leaderboard data yet</p>
                    </div>
                {:else}
                    <div class="leaderboard-list">
                        {#each leaderboard as user, index}
                            <div class="leaderboard-item" class:current-user={user.id === userId} class:top-three={index < 3}>
                                <div class="rank-badge" class:gold={index === 0} class:silver={index === 1} class:bronze={index === 2}>
                                    {#if index === 0}
                                        <IconCrown size={16} stroke={2} />
                                    {:else}
                                        {index + 1}
                                    {/if}
                                </div>
                                <div class="user-avatar">
                                    {#if user.profilePhoto}
                                        <img src={user.profilePhoto} alt={user.name} />
                                    {:else}
                                        <div class="avatar-placeholder">{user.name?.charAt(0) || '?'}</div>
                                    {/if}
                                </div>
                                <div class="user-info">
                                    <span class="user-name">{user.name}</span>
                                    <span class="user-stats">
                                        <IconFlame size={12} stroke={1.5} />
                                        {user.currentStreak} streak
                                    </span>
                                </div>
                                <div class="user-points">
                                    <span class="points-value">{user.points}</span>
                                    <span class="points-label">pts</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    {/if}
</div>


<style>
    .gamification-container {
        padding: 20px;
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--apple-gray-1);
    }

    .loading-state p {
        margin-top: 16px;
        font-size: 14px;
    }

    /* Tab Navigation */
    .tab-nav {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
        padding: 4px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-lg);
    }

    .tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-radius: var(--apple-radius-md);
        font-size: 14px;
        font-weight: 500;
        color: var(--apple-gray-1);
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .tab-btn:hover {
        color: var(--theme-text, var(--apple-black));
    }

    .tab-btn.active {
        background: var(--theme-card-bg, var(--apple-white));
        color: var(--apple-accent);
        box-shadow: var(--apple-shadow-sm);
    }

    /* Streak Card */
    .streak-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px;
        background: linear-gradient(135deg, #FF6B35 0%, #FF3B30 100%);
        border-radius: var(--apple-radius-xl);
        color: white;
        margin-bottom: 20px;
    }

    .streak-icon {
        width: 64px;
        height: 64px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .streak-content {
        flex: 1;
    }

    .streak-number {
        font-size: 48px;
        font-weight: 700;
        line-height: 1;
    }

    .streak-label {
        font-size: 14px;
        font-weight: 600;
        opacity: 0.9;
        margin-top: 4px;
    }

    .streak-message {
        font-size: 13px;
        opacity: 0.8;
        margin-top: 8px;
    }

    .streak-best {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: var(--apple-radius-md);
    }

    .best-label {
        font-size: 11px;
        opacity: 0.8;
    }

    .best-value {
        font-size: 24px;
        font-weight: 700;
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 20px;
    }

    .stat-card {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        padding: 16px;
        text-align: center;
        box-shadow: var(--apple-shadow-sm);
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
    }

    .stat-icon.points { background: rgba(255, 204, 0, 0.15); color: #B38F00; }
    .stat-icon.checkins { background: rgba(0, 122, 255, 0.15); color: var(--apple-accent); }
    .stat-icon.rank { background: rgba(175, 82, 222, 0.15); color: var(--apple-purple); }
    .stat-icon.badges { background: rgba(52, 199, 89, 0.15); color: var(--apple-green); }

    .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
    }

    .stat-label {
        font-size: 12px;
        color: var(--apple-gray-1);
        margin-top: 4px;
    }

    /* Badges Preview */
    .badges-preview {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        padding: 16px;
        box-shadow: var(--apple-shadow-sm);
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .badges-preview h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 12px;
    }

    .badges-row {
        display: flex;
        gap: 12px;
    }

    .badge-mini {
        width: 48px;
        height: 48px;
        background: color-mix(in srgb, var(--badge-color) 15%, transparent);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--badge-color);
    }

    .badge-emoji {
        font-size: 24px;
    }

    /* Badges Grid */
    .badges-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
    }

    .badge-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
        box-shadow: var(--apple-shadow-sm);
        position: relative;
        opacity: 0.6;
        filter: grayscale(0.5);
        transition: var(--apple-transition);
    }

    .badge-card.earned {
        opacity: 1;
        filter: none;
        border-color: var(--badge-color);
    }

    .badge-icon-wrapper {
        position: relative;
        width: 56px;
        height: 56px;
        background: color-mix(in srgb, var(--badge-color) 15%, transparent);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .badge-lock {
        position: absolute;
        bottom: -4px;
        right: -4px;
        font-size: 14px;
    }

    .badge-info {
        flex: 1;
        min-width: 0;
    }

    .badge-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin-bottom: 4px;
    }

    .badge-desc {
        font-size: 12px;
        color: var(--apple-gray-1);
        line-height: 1.4;
    }

    .badge-earned-tag {
        position: absolute;
        top: 12px;
        right: 12px;
        font-size: 10px;
        font-weight: 600;
        padding: 4px 8px;
        background: var(--apple-green);
        color: white;
        border-radius: 20px;
    }

    /* Leaderboard */
    .leaderboard-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .leaderboard-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-lg);
        border: 1px solid var(--theme-border-light, var(--apple-gray-5));
        transition: var(--apple-transition);
    }

    .leaderboard-item.current-user {
        background: rgba(0, 122, 255, 0.08);
        border-color: var(--apple-accent);
    }

    .leaderboard-item.top-three {
        box-shadow: var(--apple-shadow-sm);
    }

    .rank-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        background: var(--theme-border-light, var(--apple-gray-6));
        color: var(--apple-gray-1);
    }

    .rank-badge.gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; }
    .rank-badge.silver { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: white; }
    .rank-badge.bronze { background: linear-gradient(135deg, #CD7F32, #B87333); color: white; }

    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
    }

    .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .avatar-placeholder {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, var(--apple-accent), #5856D6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 16px;
    }

    .user-info {
        flex: 1;
        min-width: 0;
    }

    .user-name {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .user-stats {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--apple-gray-1);
        margin-top: 2px;
    }

    .user-points {
        text-align: right;
    }

    .points-value {
        display: block;
        font-size: 18px;
        font-weight: 700;
        color: var(--apple-accent);
    }

    .points-label {
        font-size: 11px;
        color: var(--apple-gray-1);
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: var(--apple-gray-2);
    }

    .empty-state p {
        margin-top: 16px;
        font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .tab-btn span {
            display: none;
        }

        .streak-card {
            flex-wrap: wrap;
        }

        .streak-best {
            width: 100%;
            flex-direction: row;
            justify-content: center;
            gap: 8px;
            margin-top: 8px;
        }

        .badges-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
