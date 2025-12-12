<script>
    import { IconMapPin, IconBuilding } from '@tabler/icons-svelte';

    export let locations = [];

    $: maxCount = Math.max(...locations.map(l => l.count), 1);

    function getHeatColor(count) {
        const intensity = count / maxCount;
        if (intensity >= 0.8) return { bg: 'rgba(255, 59, 48, 0.2)', border: 'var(--apple-red)' };
        if (intensity >= 0.5) return { bg: 'rgba(255, 149, 0, 0.2)', border: 'var(--apple-orange)' };
        if (intensity >= 0.3) return { bg: 'rgba(255, 204, 0, 0.2)', border: 'var(--apple-yellow)' };
        return { bg: 'rgba(52, 199, 89, 0.2)', border: 'var(--apple-green)' };
    }

    function getPercentage(count) {
        return Math.round((count / maxCount) * 100);
    }
</script>

<div class="location-heatmap">
    <div class="heatmap-header">
        <h3>
            <IconMapPin size={18} stroke={1.5} />
            Location Traffic
        </h3>
        <span class="subtitle">Entrance activity by location</span>
    </div>

    <div class="locations-grid">
        {#each locations as location}
            {@const colors = getHeatColor(location.count)}
            <div 
                class="location-card"
                style="background: {colors.bg}; border-color: {colors.border}"
            >
                <div class="location-icon">
                    <IconBuilding size={20} stroke={1.5} />
                </div>
                <div class="location-info">
                    <span class="location-name">{location.name}</span>
                    <span class="location-count">{location.count.toLocaleString()} scans</span>
                </div>
                <div class="location-bar">
                    <div 
                        class="bar-fill"
                        style="width: {getPercentage(location.count)}%; background: {colors.border}"
                    ></div>
                </div>
                <span class="location-percent">{getPercentage(location.count)}%</span>
            </div>
        {/each}
    </div>

    <div class="heatmap-legend">
        <span class="legend-item">
            <span class="legend-dot" style="background: var(--apple-green)"></span>
            Low
        </span>
        <span class="legend-item">
            <span class="legend-dot" style="background: var(--apple-yellow)"></span>
            Medium
        </span>
        <span class="legend-item">
            <span class="legend-dot" style="background: var(--apple-orange)"></span>
            High
        </span>
        <span class="legend-item">
            <span class="legend-dot" style="background: var(--apple-red)"></span>
            Peak
        </span>
    </div>
</div>

<style>
    .location-heatmap {
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-xl);
        box-shadow: var(--apple-shadow-sm);
        overflow: hidden;
    }

    .heatmap-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .heatmap-header h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
        margin: 0 0 4px;
    }

    .subtitle {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .locations-grid {
        padding: 16px 20px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    .location-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
        border-radius: var(--apple-radius-md);
        border: 2px solid;
        transition: var(--apple-transition);
    }

    .location-card:hover {
        transform: translateY(-2px);
    }

    .location-icon {
        width: 36px;
        height: 36px;
        background: var(--theme-card-bg, var(--apple-white));
        border-radius: var(--apple-radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .location-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .location-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-text, var(--apple-black));
    }

    .location-count {
        font-size: 12px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .location-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 3px;
        overflow: hidden;
    }

    .bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease;
    }

    .location-percent {
        font-size: 20px;
        font-weight: 700;
        color: var(--theme-text, var(--apple-black));
        text-align: right;
    }

    .heatmap-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        padding: 16px;
        border-top: 1px solid var(--theme-border-light, var(--apple-gray-5));
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--theme-text-secondary, var(--apple-gray-1));
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    @media (max-width: 768px) {
        .heatmap-header {
            padding: 16px 18px;
        }

        .heatmap-header h3 {
            font-size: 15px;
        }

        .locations-grid {
            padding: 14px 16px;
            gap: 10px;
        }

        .location-card {
            padding: 14px;
        }

        .location-icon {
            width: 32px;
            height: 32px;
        }

        .location-name {
            font-size: 13px;
        }

        .location-count {
            font-size: 11px;
        }

        .location-percent {
            font-size: 18px;
        }

        .heatmap-legend {
            gap: 14px;
            padding: 14px;
        }

        .legend-item {
            font-size: 10px;
        }
    }

    @media (max-width: 640px) {
        .locations-grid {
            grid-template-columns: 1fr;
        }

        .location-card {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
        }

        .location-icon {
            flex-shrink: 0;
        }

        .location-info {
            flex: 1;
            min-width: 100px;
        }

        .location-bar {
            width: 100%;
            order: 3;
        }

        .location-percent {
            font-size: 16px;
        }
    }
</style>
