<script>
    export let data = [];
    export let type = 'bar'; // 'bar', 'line', 'ring'
    export let height = 120;
    export let color = 'blue';
    export let showLabels = true;
    export let maxValue = null;
    export let ringValue = 0;
    export let ringMax = 100;
    export let ringLabel = '';
    export let ringSubLabel = '';

    const colors = {
        blue: { primary: '#007AFF', gradient: 'rgba(0, 122, 255, 0.15)', light: 'rgba(0, 122, 255, 0.08)' },
        green: { primary: '#34C759', gradient: 'rgba(52, 199, 89, 0.15)', light: 'rgba(52, 199, 89, 0.08)' },
        purple: { primary: '#AF52DE', gradient: 'rgba(175, 82, 222, 0.15)', light: 'rgba(175, 82, 222, 0.08)' },
        orange: { primary: '#FF9500', gradient: 'rgba(255, 149, 0, 0.15)', light: 'rgba(255, 149, 0, 0.08)' }
    };

    $: colorSet = colors[color] || colors.blue;
    $: computedMax = maxValue || Math.max(...data.map(d => d.value || d.hoursWorked || 0), 1);
    $: ringPercent = Math.min((ringValue / ringMax) * 100, 100);
    $: circumference = 2 * Math.PI * 45;
    $: strokeDashoffset = circumference - (ringPercent / 100) * circumference;
</script>

{#if type === 'ring'}
    <div class="ring-chart" style="--ring-color: {colorSet.primary}">
        <svg viewBox="0 0 100 100" class="ring-svg">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--apple-gray-5)" stroke-width="8" />
            <circle 
                cx="50" cy="50" r="45" fill="none" 
                stroke={colorSet.primary} 
                stroke-width="8" 
                stroke-linecap="round"
                stroke-dasharray={circumference}
                stroke-dashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                class="ring-progress"
            />
        </svg>
        <div class="ring-content">
            <span class="ring-value">{ringLabel}</span>
            <span class="ring-sublabel">{ringSubLabel}</span>
        </div>
    </div>

{:else if type === 'line'}
    <div class="line-chart" style="height: {height}px">
        <svg viewBox="0 0 {data.length * 20} {height}" preserveAspectRatio="none" class="line-svg">
            <defs>
                <linearGradient id="lineGradient-{color}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:{colorSet.primary};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:{colorSet.primary};stop-opacity:0" />
                </linearGradient>
            </defs>
            <!-- Area fill -->
            <path 
                d={`M 0 ${height} ${data.map((d, i) => {
                    const x = i * 20 + 10;
                    const val = d.value ?? d.hoursWorked ?? 0;
                    const y = height - (val / computedMax) * (height - 20);
                    return `L ${x} ${y}`;
                }).join(' ')} L ${data.length * 20} ${height} Z`}
                fill="url(#lineGradient-{color})"
            />
            <!-- Line -->
            <path 
                d={`M ${data.map((d, i) => {
                    const x = i * 20 + 10;
                    const val = d.value ?? d.hoursWorked ?? 0;
                    const y = height - (val / computedMax) * (height - 20);
                    return `${i === 0 ? '' : 'L '}${x} ${y}`;
                }).join(' ')}`}
                fill="none"
                stroke={colorSet.primary}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="line-path"
            />
            <!-- Dots -->
            {#each data as d, i}
                {@const val = d.value ?? d.hoursWorked ?? 0}
                {#if val > 0}
                    <circle 
                        cx={i * 20 + 10} 
                        cy={height - (val / computedMax) * (height - 20)}
                        r="3"
                        fill={colorSet.primary}
                        class="line-dot"
                    />
                {/if}
            {/each}
        </svg>
        {#if showLabels}
            <div class="line-labels">
                {#each data as d, i}
                    {#if i % Math.ceil(data.length / 7) === 0}
                        <span class="line-label">{d.date || d.label}</span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>

{:else}
    <!-- Bar Chart -->
    <div class="bar-chart" style="height: {height}px">
        <div class="bars-container">
            {#each data as d, i}
                {@const val = d.value ?? d.hoursWorked ?? 0}
                {@const barHeight = (val / computedMax) * 100}
                <div class="bar-wrapper" class:weekend={d.isWeekend} class:no-data={!d.hasData && d.hasData !== undefined}>
                    <div 
                        class="bar" 
                        style="height: {barHeight}%; background: {d.isWeekend ? 'var(--apple-gray-4)' : colorSet.primary}"
                    >
                        {#if val > 0}
                            <span class="bar-tooltip">{val.toFixed(1)}h</span>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
        {#if showLabels}
            <div class="bar-labels">
                {#each data as d, i}
                    {#if i % Math.ceil(data.length / 7) === 0 || data.length <= 7}
                        <span class="bar-label" style="left: {(i / data.length) * 100}%">{d.dayOfWeek || d.date || d.label}</span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    /* Ring Chart */
    .ring-chart { position: relative; width: 120px; height: 120px; }
    .ring-svg { width: 100%; height: 100%; }
    .ring-progress { transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1); }
    .ring-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .ring-value { font-size: 22px; font-weight: 700; color: var(--apple-black); line-height: 1; }
    .ring-sublabel { font-size: 11px; color: var(--apple-gray-1); margin-top: 2px; }

    /* Line Chart */
    .line-chart { position: relative; width: 100%; }
    .line-svg { width: 100%; height: 100%; }
    .line-path { animation: drawLine 1.5s ease-out forwards; }
    .line-dot { opacity: 0; animation: fadeIn 0.3s ease-out forwards; animation-delay: 1s; }
    .line-labels { display: flex; justify-content: space-between; padding-top: 8px; }
    .line-label { font-size: 10px; color: var(--apple-gray-2); }

    /* Bar Chart */
    .bar-chart { position: relative; width: 100%; }
    .bars-container { display: flex; align-items: flex-end; gap: 2px; height: calc(100% - 24px); }
    .bar-wrapper { flex: 1; height: 100%; display: flex; align-items: flex-end; position: relative; }
    .bar-wrapper.weekend .bar { opacity: 0.4; }
    .bar-wrapper.no-data .bar { background: var(--apple-gray-5) !important; min-height: 4px; }
    .bar { width: 100%; border-radius: 3px 3px 0 0; min-height: 2px; transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
    .bar:hover .bar-tooltip { opacity: 1; transform: translateX(-50%) translateY(-4px); }
    .bar-tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--apple-black); color: white; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; white-space: nowrap; opacity: 0; transition: all 0.2s ease; pointer-events: none; }
    .bar-labels { display: flex; justify-content: space-between; position: relative; height: 24px; padding-top: 8px; }
    .bar-label { font-size: 10px; color: var(--apple-gray-2); position: absolute; transform: translateX(-50%); }

    @keyframes drawLine { from { stroke-dasharray: 1000; stroke-dashoffset: 1000; } to { stroke-dashoffset: 0; } }
    @keyframes fadeIn { to { opacity: 1; } }
</style>
