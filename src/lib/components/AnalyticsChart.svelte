<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    export let data = [];
    export let type = 'bar';
    export let height = 140;
    export let color = 'blue';
    export let showLabels = true;
    export let maxValue = null;
    export let ringValue = 0;
    export let ringMax = 100;
    export let ringLabel = '';
    export let ringSubLabel = '';

    let isVisible = false;
    let scrollVelocity = 0;
    let lastScrollY = 0;
    let waveOffset = 0;
    let droplets = [];

    const colors = {
        blue: { primary: '#007AFF', secondary: '#5AC8FA', light: '#B3E0FF', glow: 'rgba(0, 122, 255, 0.4)' },
        green: { primary: '#34C759', secondary: '#30D158', light: '#B8F5C8', glow: 'rgba(52, 199, 89, 0.4)' },
        purple: { primary: '#AF52DE', secondary: '#BF5AF2', light: '#E8D4F5', glow: 'rgba(175, 82, 222, 0.4)' },
        orange: { primary: '#FF9500', secondary: '#FF9F0A', light: '#FFE0B3', glow: 'rgba(255, 149, 0, 0.4)' },
        red: { primary: '#FF3B30', secondary: '#FF453A', light: '#FFB3B0', glow: 'rgba(255, 59, 48, 0.4)' }
    };

    $: colorSet = colors[color] || colors.blue;
    $: displayData = type === 'bar' ? data.slice(-7) : data;
    $: computedMax = maxValue || Math.max(...displayData.map(d => d.value ?? d.hoursWorked ?? 0), 8);
    $: ringPercentage = Math.min((ringValue / ringMax) * 100, 100);
    $: circumference = 2 * Math.PI * 42;
    $: strokeDashoffset = circumference - (ringPercentage / 100) * circumference;

    onMount(() => {
        setTimeout(() => isVisible = true, 100);
        
        if (browser && type === 'bar') {
            let frame;
            let time = 0;
            
            const animate = () => {
                time += 0.016;
                waveOffset = Math.sin(time * 2) * 3;
                
                // Decay scroll velocity
                scrollVelocity *= 0.95;
                
                // Update droplets
                droplets = droplets.filter(d => d.life > 0).map(d => ({
                    ...d,
                    y: d.y + d.vy,
                    vy: d.vy + 0.3,
                    life: d.life - 1,
                    opacity: d.life / 30
                }));
                
                frame = requestAnimationFrame(animate);
            };
            animate();

            const handleScroll = () => {
                const currentScrollY = window.scrollY;
                const delta = currentScrollY - lastScrollY;
                scrollVelocity = Math.min(Math.max(delta * 0.5, -15), 15);
                lastScrollY = currentScrollY;
                
                // Create droplets on fast scroll
                if (Math.abs(delta) > 8 && droplets.length < 20) {
                    const numDroplets = Math.min(Math.floor(Math.abs(delta) / 10), 3);
                    for (let i = 0; i < numDroplets; i++) {
                        droplets = [...droplets, {
                            id: Date.now() + i,
                            x: 20 + Math.random() * 60,
                            y: 0,
                            vy: -2 - Math.random() * 3,
                            size: 2 + Math.random() * 3,
                            life: 30
                        }];
                    }
                }
            };
            
            window.addEventListener('scroll', handleScroll, { passive: true });
            return () => {
                cancelAnimationFrame(frame);
                window.removeEventListener('scroll', handleScroll);
            };
        }
    });
</script>

{#if type === 'ring'}
    <div class="ring-chart" class:visible={isVisible}>
        <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--apple-gray-5, #E5E5EA)" stroke-width="7"/>
            <circle 
                cx="50" cy="50" r="42" fill="none"
                stroke={colorSet.primary}
                stroke-width="7" 
                stroke-linecap="round"
                stroke-dasharray={circumference}
                stroke-dashoffset={isVisible ? strokeDashoffset : circumference}
                transform="rotate(-90 50 50)"
                class="ring-progress"
            />
        </svg>
        <div class="ring-content">
            <span class="ring-value">{ringLabel}</span>
            <span class="ring-sub">{ringSubLabel}</span>
        </div>
    </div>

{:else if type === 'line'}
    <div class="line-chart" class:visible={isVisible} style="height: {height}px">
        <svg viewBox="0 0 {displayData.length * 30} {height}" preserveAspectRatio="none">
            <defs>
                <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color={colorSet.primary} stop-opacity="0.25"/>
                    <stop offset="100%" stop-color={colorSet.primary} stop-opacity="0"/>
                </linearGradient>
            </defs>
            <path 
                d={`M 0 ${height} ${displayData.map((d, i) => `L ${i * 30 + 15} ${height - 10 - ((d.value ?? d.hoursWorked ?? 0) / computedMax) * (height - 30)}`).join(' ')} L ${displayData.length * 30} ${height} Z`}
                fill="url(#areaFill)"
            />
            <path 
                d={displayData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 30 + 15} ${height - 10 - ((d.value ?? d.hoursWorked ?? 0) / computedMax) * (height - 30)}`).join(' ')}
                fill="none" stroke={colorSet.primary} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            />
        </svg>
    </div>

{:else}
    <!-- Bar Chart with Realistic Water -->
    <div class="bar-chart" class:visible={isVisible} style="height: {height}px">
        <div class="bars-wrapper">
            {#each displayData as d, i}
                {@const val = d.value ?? d.hoursWorked ?? 0}
                {@const pct = Math.max((val / computedMax) * 100, val > 0 ? 5 : 0)}
                
                <div class="bar-col">
                    <!-- Hours Label -->
                    <div 
                        class="hours-label"
                        class:show={isVisible && val > 0}
                        style="color: {d.isWeekend ? '#AEAEB2' : colorSet.primary}; animation-delay: {150 + i * 60}ms"
                    >
                        {val > 0 ? val.toFixed(1) + 'h' : ''}
                    </div>
                    
                    <!-- Bar with Water -->
                    <div class="bar-container">
                        <div 
                            class="bar"
                            class:weekend={d.isWeekend}
                            style="
                                height: {isVisible ? pct : 0}%;
                                transition-delay: {i * 60}ms;
                            "
                        >
                            {#if val > 0 && !d.isWeekend}
                                <!-- Water Fill -->
                                <div class="water-body" style="background: linear-gradient(180deg, {colorSet.light} 0%, {colorSet.secondary} 30%, {colorSet.primary} 100%);">
                                    
                                    <!-- Animated Wave Surface -->
                                    <svg class="wave-svg" viewBox="0 0 100 30" preserveAspectRatio="none" 
                                         style="transform: translateY({waveOffset + scrollVelocity}px)">
                                        <defs>
                                            <linearGradient id="waveGrad-{i}" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stop-color="white" stop-opacity="0.9"/>
                                                <stop offset="40%" stop-color={colorSet.light} stop-opacity="0.7"/>
                                                <stop offset="100%" stop-color={colorSet.secondary} stop-opacity="0.5"/>
                                            </linearGradient>
                                        </defs>
                                        
                                        <!-- Back wave layer -->
                                        <path fill="url(#waveGrad-{i})">
                                            <animate 
                                                attributeName="d" 
                                                dur="2.5s" 
                                                repeatCount="indefinite"
                                                values="
                                                    M0,15 C20,10 35,20 50,15 C65,10 80,20 100,15 L100,30 L0,30 Z;
                                                    M0,15 C20,20 35,10 50,15 C65,20 80,10 100,15 L100,30 L0,30 Z;
                                                    M0,15 C20,10 35,20 50,15 C65,10 80,20 100,15 L100,30 L0,30 Z"
                                            />
                                        </path>
                                        
                                        <!-- Front wave layer -->
                                        <path fill={colorSet.secondary} fill-opacity="0.6">
                                            <animate 
                                                attributeName="d" 
                                                dur="1.8s" 
                                                repeatCount="indefinite"
                                                values="
                                                    M0,18 C15,14 30,22 50,18 C70,14 85,22 100,18 L100,30 L0,30 Z;
                                                    M0,18 C15,22 30,14 50,18 C70,22 85,14 100,18 L100,30 L0,30 Z;
                                                    M0,18 C15,14 30,22 50,18 C70,14 85,22 100,18 L100,30 L0,30 Z"
                                            />
                                        </path>
                                        
                                        <!-- Foam/bubbles -->
                                        <circle cx="25" cy="12" r="2" fill="white" fill-opacity="0.7">
                                            <animate attributeName="cy" dur="1.5s" repeatCount="indefinite" values="12;8;12"/>
                                            <animate attributeName="fill-opacity" dur="1.5s" repeatCount="indefinite" values="0.7;0.3;0.7"/>
                                        </circle>
                                        <circle cx="60" cy="14" r="1.5" fill="white" fill-opacity="0.5">
                                            <animate attributeName="cy" dur="2s" repeatCount="indefinite" values="14;10;14"/>
                                        </circle>
                                        <circle cx="80" cy="13" r="1" fill="white" fill-opacity="0.6">
                                            <animate attributeName="cy" dur="1.8s" repeatCount="indefinite" values="13;9;13"/>
                                        </circle>
                                    </svg>
                                    
                                    <!-- Water droplets from scroll -->
                                    {#each droplets as droplet (droplet.id)}
                                        <div 
                                            class="droplet"
                                            style="
                                                left: {droplet.x}%;
                                                top: {droplet.y}px;
                                                width: {droplet.size}px;
                                                height: {droplet.size}px;
                                                opacity: {droplet.opacity};
                                                background: {colorSet.light};
                                            "
                                        ></div>
                                    {/each}
                                    
                                    <!-- Glass reflection -->
                                    <div class="reflection"></div>
                                    
                                    <!-- Bubbles inside -->
                                    <div class="bubble b1"></div>
                                    <div class="bubble b2"></div>
                                    <div class="bubble b3"></div>
                                </div>
                                
                                <!-- Glow effect -->
                                <div class="bar-glow" style="background: {colorSet.glow}"></div>
                            {:else if val > 0}
                                <!-- Weekend bar - simple -->
                                <div class="weekend-fill"></div>
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Day Label -->
                    {#if showLabels}
                        <span class="day-label" class:weekend={d.isWeekend}>
                            {d.dayOfWeek || ''}
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}


<style>
    /* ===== RING CHART ===== */
    .ring-chart {
        position: relative;
        width: 110px; height: 110px;
        opacity: 0; transform: scale(0.9);
        transition: all 0.5s ease;
    }
    .ring-chart.visible { opacity: 1; transform: scale(1); }
    .ring-chart svg { width: 100%; height: 100%; }
    .ring-progress { 
        transition: stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 0 4px currentColor);
    }
    .ring-content {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
    }
    .ring-value { font-size: 20px; font-weight: 700; color: var(--theme-text, #1C1C1E); }
    .ring-sub { font-size: 10px; color: var(--theme-text-secondary, #8E8E93); margin-top: 2px; }

    /* ===== LINE CHART ===== */
    .line-chart {
        width: 100%; opacity: 0; transform: translateY(8px);
        transition: all 0.4s ease;
    }
    .line-chart.visible { opacity: 1; transform: translateY(0); }
    .line-chart svg { width: 100%; height: 100%; }

    /* ===== BAR CHART ===== */
    .bar-chart {
        width: 100%; opacity: 0; transform: translateY(8px);
        transition: all 0.4s ease;
    }
    .bar-chart.visible { opacity: 1; transform: translateY(0); }

    .bars-wrapper {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        height: 100%;
        gap: 10px;
        padding-top: 24px;
    }

    .bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        min-width: 0;
    }

    /* Hours Label */
    .hours-label {
        font-size: 12px;
        font-weight: 700;
        min-height: 18px;
        margin-bottom: 6px;
        opacity: 0;
        transform: translateY(4px);
    }
    .hours-label.show {
        animation: fadeUp 0.4s ease forwards;
    }

    /* Bar Container */
    .bar-container {
        flex: 1;
        width: 100%;
        display: flex;
        align-items: flex-end;
        min-height: 70px;
    }

    .bar {
        width: 100%;
        min-height: 0;
        border-radius: 10px 10px 4px 4px;
        position: relative;
        overflow: hidden;
        background: #E8E8ED;
        transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    .bar.weekend { 
        background: linear-gradient(180deg, #F2F2F7 0%, #E5E5EA 100%);
    }
    
    .bar:hover {
        transform: scaleX(1.03);
    }

    /* Water Body - The liquid inside */
    .water-body {
        position: absolute;
        inset: 0;
        border-radius: 8px 8px 3px 3px;
        overflow: hidden;
    }

    /* Wave SVG */
    .wave-svg {
        position: absolute;
        top: -12px;
        left: 0;
        right: 0;
        height: 24px;
        transition: transform 0.15s ease-out;
    }

    /* Water Droplets */
    .droplet {
        position: absolute;
        border-radius: 50%;
        pointer-events: none;
        box-shadow: inset -1px -1px 2px rgba(0,0,0,0.1), inset 1px 1px 2px rgba(255,255,255,0.8);
    }

    /* Glass Reflection */
    .reflection {
        position: absolute;
        top: 20px;
        left: 4px;
        right: 60%;
        bottom: 20%;
        background: linear-gradient(
            135deg,
            rgba(255,255,255,0.4) 0%,
            rgba(255,255,255,0.1) 50%,
            transparent 100%
        );
        border-radius: 4px;
        pointer-events: none;
    }

    /* Bubbles */
    .bubble {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
        box-shadow: inset -1px -1px 3px rgba(0,0,0,0.1);
        animation: bubbleRise 3s ease-in-out infinite;
    }
    .b1 { width: 6px; height: 6px; left: 20%; bottom: 15%; animation-delay: 0s; }
    .b2 { width: 4px; height: 4px; left: 50%; bottom: 25%; animation-delay: 1s; }
    .b3 { width: 5px; height: 5px; left: 70%; bottom: 10%; animation-delay: 2s; }

    /* Bar Glow */
    .bar-glow {
        position: absolute;
        bottom: -6px;
        left: 10%;
        right: 10%;
        height: 12px;
        filter: blur(8px);
        opacity: 0.6;
        border-radius: 50%;
    }

    /* Weekend Fill */
    .weekend-fill {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, #F2F2F7 0%, #D1D1D6 100%);
        border-radius: 8px 8px 3px 3px;
    }

    /* Day Label */
    .day-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--theme-text-secondary, #8E8E93);
        margin-top: 10px;
        text-align: center;
    }
    .day-label.weekend { color: #FF3B30; }

    /* ===== ANIMATIONS ===== */
    @keyframes fadeUp {
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes bubbleRise {
        0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.6;
        }
        50% { 
            transform: translateY(-15px) scale(1.1); 
            opacity: 0.9;
        }
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 480px) {
        .ring-chart { width: 90px; height: 90px; }
        .ring-value { font-size: 17px; }
        
        .bars-wrapper { gap: 6px; padding-top: 20px; }
        .hours-label { font-size: 10px; margin-bottom: 4px; }
        .bar { border-radius: 8px 8px 3px 3px; }
        .bar-container { min-height: 55px; }
        .day-label { font-size: 9px; margin-top: 8px; }
        .wave-svg { height: 18px; top: -9px; }
        .bubble { display: none; }
        .bar-glow { display: none; }
    }

    @media (max-width: 360px) {
        .hours-label { font-size: 9px; }
        .day-label { font-size: 8px; }
        .bars-wrapper { gap: 4px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .bubble { animation: none; }
        .wave-svg animate { animation-play-state: paused; }
        .bar { transition-duration: 0.2s; }
    }
</style>
