<script>
    import { IconBrain, IconTrendingUp, IconTrendingDown, IconAlertCircle, IconSparkles, IconMaximize, IconX } from '@tabler/icons-svelte';
    import { createEventDispatcher } from 'svelte';

    export let predictions = {
        tomorrowAttendance: 89,
        confidence: 85,
        insights: []
    };

    const dispatch = createEventDispatcher();
    let showModal = false;

    $: trendIcon = predictions.tomorrowAttendance >= 85 ? IconTrendingUp : IconTrendingDown;
    $: trendColor = predictions.tomorrowAttendance >= 85 ? 'green' : 'orange';
    $: displayInsights = predictions.insights.slice(0, 2);

    function openModal() {
        showModal = true;
    }

    function closeModal() {
        showModal = false;
    }
</script>

<div class="prediction-card">
    <div class="card-header">
        <div class="header-title">
            <IconBrain size={16} stroke={1.5} />
            <h3>AI Prediction</h3>
        </div>
        <div class="header-actions">
            <span class="ai-badge">
                <IconSparkles size={10} stroke={2} />
                AI
            </span>
            <button class="expand-btn" on:click={openModal} title="Expand">
                <IconMaximize size={14} stroke={1.5} />
            </button>
        </div>
    </div>

    <div class="prediction-content">
        <div class="main-prediction">
            <div class="prediction-value {trendColor}">
                <svelte:component this={trendIcon} size={18} stroke={2} />
                <span class="value">{predictions.tomorrowAttendance}%</span>
            </div>
            <div class="prediction-label">
                <span class="label-text">Tomorrow's Attendance</span>
                <span class="confidence">{predictions.confidence}% confidence</span>
            </div>
        </div>

        {#if displayInsights.length > 0}
            <div class="insights-section">
                {#each displayInsights as insight}
                    <div class="insight-item">
                        <span class="insight-icon">💡</span>
                        <span class="insight-text">{insight}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Expanded Modal -->
{#if showModal}
    <div class="modal-overlay" on:click={closeModal} role="dialog" aria-modal="true">
        <div class="modal-content" on:click|stopPropagation>
            <div class="modal-header">
                <div class="modal-title">
                    <IconBrain size={20} stroke={1.5} />
                    <h2>AI Attendance Prediction</h2>
                    <span class="ai-badge-lg">
                        <IconSparkles size={12} stroke={2} />
                        AI Powered
                    </span>
                </div>
                <button class="close-btn" on:click={closeModal}>
                    <IconX size={20} stroke={2} />
                </button>
            </div>

            <div class="modal-body">
                <div class="prediction-hero">
                    <div class="prediction-main {trendColor}">
                        <svelte:component this={trendIcon} size={32} stroke={2} />
                        <span class="big-value">{predictions.tomorrowAttendance}%</span>
                    </div>
                    <div class="prediction-details">
                        <h3>Tomorrow's Expected Attendance</h3>
                        <p>Based on historical patterns and current trends</p>
                        <div class="confidence-bar">
                            <span class="confidence-label">Confidence Level</span>
                            <div class="bar-track">
                                <div class="bar-fill" style="width: {predictions.confidence}%"></div>
                            </div>
                            <span class="confidence-value">{predictions.confidence}%</span>
                        </div>
                    </div>
                </div>

                {#if predictions.insights.length > 0}
                    <div class="insights-full">
                        <h4>AI Insights</h4>
                        <div class="insights-grid">
                            {#each predictions.insights as insight, i}
                                <div class="insight-card">
                                    <span class="insight-number">{i + 1}</span>
                                    <span class="insight-text-full">{insight}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div class="prediction-factors">
                    <h4>Prediction Factors</h4>
                    <div class="factors-grid">
                        <div class="factor">
                            <span class="factor-icon">📅</span>
                            <span class="factor-label">Day of Week</span>
                            <span class="factor-impact high">High Impact</span>
                        </div>
                        <div class="factor">
                            <span class="factor-icon">🌤️</span>
                            <span class="factor-label">Weather</span>
                            <span class="factor-impact medium">Medium Impact</span>
                        </div>
                        <div class="factor">
                            <span class="factor-icon">📊</span>
                            <span class="factor-label">Historical Trend</span>
                            <span class="factor-impact high">High Impact</span>
                        </div>
                        <div class="factor">
                            <span class="factor-icon">🎉</span>
                            <span class="factor-label">Events/Holidays</span>
                            <span class="factor-impact low">Low Impact</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .prediction-card {
        background: linear-gradient(135deg, 
            rgba(175, 82, 222, 0.05),
            rgba(0, 122, 255, 0.05)
        );
        border: 1px solid rgba(175, 82, 222, 0.15);
        border-radius: var(--apple-radius-lg);
        overflow: hidden;
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--apple-purple);
    }

    .header-title h3 {
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .ai-badge {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 9px;
        font-weight: 600;
        color: var(--apple-purple);
        background: rgba(175, 82, 222, 0.1);
        padding: 3px 8px;
        border-radius: 10px;
        text-transform: uppercase;
    }

    .expand-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        border-radius: 6px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .expand-btn:hover {
        background: var(--apple-accent);
        color: white;
    }

    .prediction-content {
        padding: 12px 14px;
    }

    .main-prediction {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .prediction-value {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 14px;
        border-radius: var(--apple-radius-md);
    }

    .prediction-value.green {
        background: rgba(52, 199, 89, 0.1);
        color: var(--apple-green);
    }

    .prediction-value.orange {
        background: rgba(255, 149, 0, 0.1);
        color: var(--apple-orange);
    }

    .prediction-value .value {
        font-size: 24px;
        font-weight: 700;
    }

    .prediction-label {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .label-text {
        font-size: 12px;
        font-weight: 500;
        color: var(--theme-text, var(--apple-black));
    }

    .confidence {
        font-size: 10px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .insights-section {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .insight-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-sm);
    }

    .insight-icon {
        font-size: 11px;
        flex-shrink: 0;
    }

    .insight-text {
        font-size: 10px;
        color: var(--theme-text, var(--apple-black));
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (max-width: 768px) {
        .prediction-content {
            padding: 10px 12px;
        }

        .main-prediction {
            gap: 10px;
        }

        .prediction-value {
            padding: 8px 12px;
        }

        .prediction-value .value {
            font-size: 22px;
        }
    }

    @media (max-width: 480px) {
        .card-header {
            padding: 8px 12px;
        }

        .prediction-content {
            padding: 8px 10px;
        }

        .main-prediction {
            flex-direction: column;
            align-items: stretch;
        }

        .prediction-value {
            justify-content: center;
        }

        .prediction-label {
            text-align: center;
        }
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .modal-content {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
        width: 100%;
        max-width: 700px;
        max-height: 90vh;
        overflow: hidden;
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
        background: linear-gradient(135deg, rgba(175, 82, 222, 0.05), rgba(0, 122, 255, 0.05));
    }

    .modal-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--apple-purple);
    }

    .modal-title h2 {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0;
    }

    .ai-badge-lg {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 600;
        color: var(--apple-purple);
        background: rgba(175, 82, 222, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border: none;
        border-radius: 50%;
        color: var(--theme-text-secondary);
        cursor: pointer;
        transition: var(--apple-transition);
    }

    .close-btn:hover {
        background: var(--apple-red);
        color: white;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(90vh - 80px);
    }

    .prediction-hero {
        display: flex;
        gap: 24px;
        align-items: center;
        padding: 24px;
        background: linear-gradient(135deg, rgba(175, 82, 222, 0.08), rgba(0, 122, 255, 0.08));
        border-radius: var(--apple-radius-lg);
        margin-bottom: 24px;
    }

    .prediction-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 30px;
        border-radius: var(--apple-radius-lg);
    }

    .prediction-main.green {
        background: rgba(52, 199, 89, 0.15);
        color: var(--apple-green);
    }

    .prediction-main.orange {
        background: rgba(255, 149, 0, 0.15);
        color: var(--apple-orange);
    }

    .big-value {
        font-size: 48px;
        font-weight: 700;
        line-height: 1;
    }

    .prediction-details {
        flex: 1;
    }

    .prediction-details h3 {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-text);
        margin: 0 0 4px;
    }

    .prediction-details p {
        font-size: 13px;
        color: var(--theme-text-secondary);
        margin: 0 0 16px;
    }

    .confidence-bar {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .confidence-label {
        font-size: 12px;
        color: var(--theme-text-secondary);
        white-space: nowrap;
    }

    .bar-track {
        flex: 1;
        height: 8px;
        background: var(--theme-border-light);
        border-radius: 4px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--apple-purple), var(--apple-accent));
        border-radius: 4px;
        transition: width 0.5s ease;
    }

    .confidence-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--apple-purple);
    }

    .insights-full {
        margin-bottom: 24px;
    }

    .insights-full h4,
    .prediction-factors h4 {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text);
        margin: 0 0 12px;
    }

    .insights-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .insight-card {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
    }

    .insight-number {
        width: 24px;
        height: 24px;
        background: var(--apple-purple);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        flex-shrink: 0;
    }

    .insight-text-full {
        font-size: 13px;
        color: var(--theme-text);
        line-height: 1.5;
    }

    .factors-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .factor {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 16px;
        background: var(--theme-border-light, var(--apple-gray-6));
        border-radius: var(--apple-radius-md);
    }

    .factor-icon {
        font-size: 24px;
    }

    .factor-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-text);
    }

    .factor-impact {
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 10px;
        width: fit-content;
    }

    .factor-impact.high {
        background: rgba(52, 199, 89, 0.15);
        color: var(--apple-green);
    }

    .factor-impact.medium {
        background: rgba(255, 149, 0, 0.15);
        color: var(--apple-orange);
    }

    .factor-impact.low {
        background: rgba(142, 142, 147, 0.15);
        color: var(--apple-gray-1);
    }

    /* Modal Responsive */
    @media (max-width: 600px) {
        .modal-content {
            max-width: 100%;
            margin: 10px;
            border-radius: var(--apple-radius-lg);
        }

        .modal-header {
            padding: 16px;
        }

        .modal-title h2 {
            font-size: 16px;
        }

        .modal-body {
            padding: 16px;
        }

        .prediction-hero {
            flex-direction: column;
            padding: 16px;
            gap: 16px;
        }

        .big-value {
            font-size: 36px;
        }

        .prediction-details {
            text-align: center;
        }

        .confidence-bar {
            flex-direction: column;
            gap: 8px;
        }

        .factors-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
