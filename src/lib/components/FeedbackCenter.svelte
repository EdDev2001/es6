<script>
    import { createEventDispatcher, onMount } from 'svelte';
    import { feedbackStore } from '$lib/stores/feedbackStore';
    import { 
        FEEDBACK_CATEGORIES, 
        FEEDBACK_STATUS, 
        PRIORITY_LEVELS,
        suggestCategory,
        QUICK_FEEDBACK_OPTIONS 
    } from '$lib/services/feedbackService';
    import { IconX, IconCheck, IconChevronRight, IconUpload, IconSend, IconArrowLeft, IconStar, IconStarFilled } from '@tabler/icons-svelte';

    export let userId = null;
    export let show = false;

    const dispatch = createEventDispatcher();

    let currentView = 'home';
    let selectedCategory = null;
    let selectedFeedback = null;
    
    let formData = {
        title: '',
        description: '',
        priority: 'medium',
        rating: 0,
        screenshot: null
    };
    
    let isSubmitting = false;
    let submissionResult = null;
    let suggestedCategory = null;
    let screenshotPreview = null;
    let hoverRating = 0;

    onMount(() => {
        if (userId) {
            feedbackStore.loadFeedback(userId);
        }
    });

    function close() {
        show = false;
        resetForm();
        dispatch('close');
    }

    function resetForm() {
        currentView = 'home';
        selectedCategory = null;
        selectedFeedback = null;
        formData = { title: '', description: '', priority: 'medium', rating: 0, screenshot: null };
        submissionResult = null;
        suggestedCategory = null;
        screenshotPreview = null;
        hoverRating = 0;
    }

    function selectCategory(category) {
        selectedCategory = category;
        currentView = 'form';
    }

    function handleQuickFeedback(option) {
        selectedCategory = FEEDBACK_CATEGORIES.find(c => c.id === option.category);
        formData.title = option.label;
        currentView = 'form';
    }

    function handleDescriptionInput() {
        if (formData.description.length > 10 && !selectedCategory) {
            const suggested = suggestCategory(formData.description);
            if (suggested) {
                suggestedCategory = FEEDBACK_CATEGORIES.find(c => c.id === suggested);
            }
        }
    }

    function applySuggestedCategory() {
        if (suggestedCategory) {
            selectedCategory = suggestedCategory;
            suggestedCategory = null;
        }
    }

    function setRating(star) {
        formData.rating = star;
    }

    function handleFileUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            screenshotPreview = e.target.result;
            formData.screenshot = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function removeScreenshot() {
        screenshotPreview = null;
        formData.screenshot = null;
    }

    async function handleSubmit() {
        if (!formData.title.trim() || !formData.description.trim() || !selectedCategory) {
            return;
        }
        
        isSubmitting = true;
        
        try {
            const result = await feedbackStore.submit(userId, {
                category: selectedCategory.id,
                title: formData.title.trim(),
                description: formData.description.trim(),
                rating: formData.rating > 0 ? formData.rating : null,
                priority: formData.priority,
                screenshot: formData.screenshot
            });
            
            submissionResult = result;
            currentView = 'success';
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            isSubmitting = false;
        }
    }

    function viewFeedbackList() {
        currentView = 'list';
    }

    function viewFeedbackDetail(feedback) {
        selectedFeedback = feedback;
        currentView = 'detail';
    }

    function goBack() {
        if (currentView === 'form' || currentView === 'list') {
            currentView = 'home';
            selectedCategory = null;
        } else if (currentView === 'detail') {
            currentView = 'list';
            selectedFeedback = null;
        } else if (currentView === 'success') {
            resetForm();
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    function getCategoryInfo(categoryId) {
        return FEEDBACK_CATEGORIES.find(c => c.id === categoryId) || FEEDBACK_CATEGORIES[0];
    }

    function getStatusInfo(status) {
        return FEEDBACK_STATUS[status] || FEEDBACK_STATUS.pending;
    }

    function getRatingLabel(rating) {
        const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        return labels[rating] || '';
    }

    $: feedbackList = $feedbackStore.feedbackList;
    $: unreadCount = $feedbackStore.unreadCount;
    $: displayRating = hoverRating || formData.rating;
</script>

{#if show}
<div class="feedback-overlay" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="0">
    <div class="feedback-modal" on:click|stopPropagation role="dialog" aria-modal="true">
        <div class="modal-header">
            {#if currentView !== 'home' && currentView !== 'success'}
                <button class="back-btn" on:click={goBack} aria-label="Go back">
                    <IconArrowLeft size={20} stroke={1.5} />
                </button>
            {/if}
            <h2 class="modal-title">
                {#if currentView === 'home'}Feedback Center
                {:else if currentView === 'form'}New Feedback
                {:else if currentView === 'list'}My Feedback
                {:else if currentView === 'detail'}Feedback Details
                {:else if currentView === 'success'}Thank You!
                {/if}
            </h2>
            <button class="close-btn" on:click={close} aria-label="Close">
                <IconX size={20} stroke={1.5} />
            </button>
        </div>

        <div class="modal-content">
            {#if currentView === 'home'}
                <div class="home-view">
                    <div class="welcome-section">
                        <p class="welcome-text">We'd love your feedback</p>
                        <p class="welcome-subtext">Tell us how we can improve your experience.</p>
                    </div>

                    <div class="quick-feedback">
                        {#each QUICK_FEEDBACK_OPTIONS as option}
                            <button class="quick-btn" on:click={() => handleQuickFeedback(option)}>
                                <span class="quick-icon">{option.icon}</span>
                                <span class="quick-label">{option.label}</span>
                            </button>
                        {/each}
                    </div>

                    <div class="categories-section">
                        <h3 class="section-title">Select a Category</h3>
                        <div class="categories-grid">
                            {#each FEEDBACK_CATEGORIES as category}
                                <button class="category-card" on:click={() => selectCategory(category)} style="--category-color: {category.color}">
                                    <span class="category-icon">{category.icon}</span>
                                    <span class="category-label">{category.label}</span>
                                    <IconChevronRight size={16} stroke={2} class="category-arrow" />
                                </button>
                            {/each}
                        </div>
                    </div>

                    <button class="view-feedback-btn" on:click={viewFeedbackList}>
                        <span>View My Feedback</span>
                        {#if unreadCount > 0}
                            <span class="unread-badge">{unreadCount}</span>
                        {/if}
                        <IconChevronRight size={18} stroke={2} />
                    </button>
                </div>

            {:else if currentView === 'form'}
                <div class="form-view">
                    {#if selectedCategory}
                        <div class="selected-category" style="--category-color: {selectedCategory.color}">
                            <span class="category-icon">{selectedCategory.icon}</span>
                            <span>{selectedCategory.label}</span>
                        </div>
                    {/if}

                    {#if suggestedCategory && !selectedCategory}
                        <button class="suggestion-banner" on:click={applySuggestedCategory}>
                            <span>💡 Suggested: {suggestedCategory.label}</span>
                            <span class="tap-hint">Tap to apply</span>
                        </button>
                    {/if}

                    <form on:submit|preventDefault={handleSubmit} class="feedback-form">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-input" bind:value={formData.title} placeholder="Brief summary of your feedback" required maxlength="100" />
                        </div>

                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" bind:value={formData.description} on:input={handleDescriptionInput} placeholder="Please describe in detail..." required rows="4" maxlength="1000"></textarea>
                            <span class="char-count">{formData.description.length}/1000</span>
                        </div>

                        <!-- Star Rating -->
                        <div class="form-group">
                            <label class="form-label">Rate Your Experience</label>
                            <div class="star-rating">
                                {#each [1, 2, 3, 4, 5] as star}
                                    <button type="button" class="star-btn" on:click={() => setRating(star)} on:mouseenter={() => hoverRating = star} on:mouseleave={() => hoverRating = 0} aria-label="Rate {star} stars">
                                        {#if star <= displayRating}
                                            <IconStarFilled size={28} class="star-filled" />
                                        {:else}
                                            <IconStar size={28} class="star-empty" />
                                        {/if}
                                    </button>
                                {/each}
                                {#if displayRating > 0}
                                    <span class="rating-label">{getRatingLabel(displayRating)}</span>
                                {/if}
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <div class="priority-options">
                                {#each PRIORITY_LEVELS as priority}
                                    <button type="button" class="priority-btn" class:priority-active={formData.priority === priority.id} style="--priority-color: {priority.color}" on:click={() => formData.priority = priority.id}>
                                        {priority.label}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Screenshot (Optional)</label>
                            {#if screenshotPreview}
                                <div class="screenshot-preview">
                                    <img src={screenshotPreview} alt="Screenshot preview" />
                                    <button type="button" class="remove-screenshot" on:click={removeScreenshot}>
                                        <IconX size={16} />
                                    </button>
                                </div>
                            {:else}
                                <label class="upload-area">
                                    <input type="file" accept="image/*" on:change={handleFileUpload} hidden />
                                    <IconUpload size={24} stroke={1.5} />
                                    <span>Tap to upload image</span>
                                    <span class="upload-hint">Max 5MB</span>
                                </label>
                            {/if}
                        </div>

                        <button type="submit" class="submit-btn" disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}>
                            {#if isSubmitting}
                                <div class="btn-spinner"></div>
                                <span>Submitting...</span>
                            {:else}
                                <IconSend size={18} stroke={2} />
                                <span>Submit Feedback</span>
                            {/if}
                        </button>
                    </form>
                </div>

            {:else if currentView === 'list'}
                <div class="list-view">
                    {#if feedbackList.length === 0}
                        <div class="empty-state">
                            <span class="empty-icon">📭</span>
                            <p class="empty-text">No feedback submitted yet</p>
                            <button class="empty-btn" on:click={() => currentView = 'home'}>Submit Your First Feedback</button>
                        </div>
                    {:else}
                        <div class="feedback-list">
                            {#each feedbackList as feedback}
                                {@const category = getCategoryInfo(feedback.category)}
                                {@const status = getStatusInfo(feedback.status)}
                                <button class="feedback-item" on:click={() => viewFeedbackDetail(feedback)}>
                                    <div class="item-header">
                                        <span class="item-icon" style="background: {category.color}20; color: {category.color}">{category.icon}</span>
                                        <div class="item-info">
                                            <p class="item-title">{feedback.title}</p>
                                            <p class="item-id">{feedback.ticketId}</p>
                                        </div>
                                        <span class="item-status" style="background: {status.color}20; color: {status.color}">{status.label}</span>
                                    </div>
                                    {#if feedback.rating}
                                        <div class="item-rating">
                                            {#each [1, 2, 3, 4, 5] as star}
                                                {#if star <= feedback.rating}
                                                    <IconStarFilled size={14} class="star-filled" />
                                                {:else}
                                                    <IconStar size={14} class="star-empty" />
                                                {/if}
                                            {/each}
                                        </div>
                                    {/if}
                                    <p class="item-date">{formatDate(feedback.createdAt)}</p>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

            {:else if currentView === 'detail' && selectedFeedback}
                {@const category = getCategoryInfo(selectedFeedback.category)}
                {@const status = getStatusInfo(selectedFeedback.status)}
                <div class="detail-view">
                    <div class="detail-header">
                        <span class="detail-icon" style="background: {category.color}20; color: {category.color}">{category.icon}</span>
                        <div class="detail-meta">
                            <span class="detail-status" style="background: {status.color}20; color: {status.color}">{status.label}</span>
                            <span class="detail-id">{selectedFeedback.ticketId}</span>
                        </div>
                    </div>

                    <h3 class="detail-title">{selectedFeedback.title}</h3>
                    
                    {#if selectedFeedback.rating}
                        <div class="detail-rating">
                            {#each [1, 2, 3, 4, 5] as star}
                                {#if star <= selectedFeedback.rating}
                                    <IconStarFilled size={20} class="star-filled" />
                                {:else}
                                    <IconStar size={20} class="star-empty" />
                                {/if}
                            {/each}
                            <span class="rating-text">{getRatingLabel(selectedFeedback.rating)}</span>
                        </div>
                    {/if}
                    
                    <p class="detail-description">{selectedFeedback.description}</p>

                    <div class="detail-info">
                        <div class="info-row">
                            <span class="info-label">Category</span>
                            <span class="info-value">{category.label}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Priority</span>
                            <span class="info-value">{selectedFeedback.priority === 'high' ? '🔴 High' : selectedFeedback.priority === 'low' ? '⚪ Low' : '🔵 Medium'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Submitted</span>
                            <span class="info-value">{formatDate(selectedFeedback.createdAt)}</span>
                        </div>
                    </div>
                </div>

            {:else if currentView === 'success'}
                <div class="success-view">
                    <div class="success-animation">
                        <div class="success-circle">
                            <IconCheck size={48} stroke={2.5} />
                        </div>
                    </div>
                    <h3 class="success-title">Thank You!</h3>
                    <p class="success-text">We received your feedback.</p>
                    
                    {#if submissionResult}
                        <div class="success-details">
                            <div class="success-row">
                                <span class="success-label">Ticket ID</span>
                                <span class="success-value">{submissionResult.ticketId}</span>
                            </div>
                            <div class="success-row">
                                <span class="success-label">Est. Response</span>
                                <span class="success-value">{submissionResult.estimatedResponse}</span>
                            </div>
                        </div>
                    {/if}

                    <div class="success-actions">
                        <button class="success-btn primary" on:click={resetForm}>Submit Another</button>
                        <button class="success-btn secondary" on:click={close}>Done</button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
{/if}


<style>
    .feedback-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .feedback-modal {
        background: var(--theme-card-bg, #fff);
        border-radius: 20px 20px 0 0;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
    }

    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

    @media (min-width: 640px) {
        .feedback-modal { border-radius: 20px; margin: auto; max-height: 85vh; }
    }

    .modal-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--theme-border-light, #E5E5EA);
    }

    .modal-title { flex: 1; font-size: 18px; font-weight: 600; color: var(--theme-text, #0A0A0A); }

    .back-btn, .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--theme-border-light, #F2F2F7);
        border: none;
        color: var(--theme-text-secondary, #8E8E93);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .back-btn:hover, .close-btn:hover { background: var(--theme-border, #E5E5EA); color: var(--theme-text, #0A0A0A); }

    .modal-content { flex: 1; overflow-y: auto; padding: 20px; }

    .welcome-section { text-align: center; margin-bottom: 24px; }
    .welcome-text { font-size: 22px; font-weight: 600; color: var(--theme-text, #0A0A0A); margin-bottom: 4px; }
    .welcome-subtext { font-size: 14px; color: var(--theme-text-secondary, #8E8E93); }

    .quick-feedback { display: flex; gap: 10px; margin-bottom: 28px; }
    .quick-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 14px 8px;
        background: var(--theme-border-light, #F2F2F7);
        border: none;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .quick-btn:hover { background: var(--theme-border, #E5E5EA); transform: scale(1.02); }
    .quick-icon { font-size: 24px; }
    .quick-label { font-size: 11px; font-weight: 500; color: var(--theme-text, #0A0A0A); text-align: center; }

    .section-title { font-size: 14px; font-weight: 600; color: var(--theme-text-secondary, #8E8E93); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .categories-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .category-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        background: var(--theme-card-bg, #fff);
        border: 1px solid var(--theme-border-light, #E5E5EA);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
    }
    .category-card:hover { border-color: var(--category-color); background: color-mix(in srgb, var(--category-color) 5%, transparent); }
    .category-icon { font-size: 22px; }
    .category-label { flex: 1; font-size: 15px; font-weight: 500; color: var(--theme-text, #0A0A0A); }
    :global(.category-arrow) { color: var(--theme-text-secondary, #8E8E93); }

    .view-feedback-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 14px;
        background: transparent;
        border: 1px solid var(--theme-border, #D1D1D6);
        border-radius: 12px;
        font-size: 15px;
        font-weight: 500;
        color: var(--apple-accent, #007AFF);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .view-feedback-btn:hover { background: rgba(0, 122, 255, 0.05); border-color: var(--apple-accent, #007AFF); }
    .unread-badge { background: var(--apple-red, #FF3B30); color: white; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

    /* Form View */
    .selected-category {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: color-mix(in srgb, var(--category-color) 10%, transparent);
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        color: var(--category-color);
        margin-bottom: 20px;
    }

    .suggestion-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        background: rgba(255, 204, 0, 0.1);
        border: 1px solid rgba(255, 204, 0, 0.3);
        border-radius: 12px;
        margin-bottom: 16px;
        cursor: pointer;
    }
    .tap-hint { font-size: 12px; color: var(--theme-text-secondary, #8E8E93); }

    .feedback-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 14px; font-weight: 500; color: var(--theme-text-secondary, #8E8E93); }

    .form-input, .form-textarea {
        width: 100%;
        padding: 14px 16px;
        background: var(--theme-card-bg, #fff);
        border: 1px solid var(--theme-border, #D1D1D6);
        border-radius: 12px;
        font-size: 16px;
        color: var(--theme-text, #0A0A0A);
        transition: all 0.2s ease;
    }
    .form-input:focus, .form-textarea:focus { outline: none; border-color: var(--apple-accent, #007AFF); box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); }
    .form-textarea { resize: none; min-height: 100px; }
    .char-count { font-size: 12px; color: var(--theme-text-secondary, #8E8E93); text-align: right; }

    /* Star Rating */
    .star-rating {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .star-btn {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        transition: transform 0.15s ease;
    }

    .star-btn:hover { transform: scale(1.2); }
    .star-btn:active { transform: scale(0.95); }

    .star-rating :global(.star-filled) { color: #FFCC00; }
    .star-rating :global(.star-empty) { color: var(--theme-border, #D1D1D6); }

    .rating-label {
        margin-left: 12px;
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-text, #0A0A0A);
    }

    .priority-options { display: flex; gap: 10px; }
    .priority-btn {
        flex: 1;
        padding: 12px;
        background: var(--theme-border-light, #F2F2F7);
        border: 2px solid transparent;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-text, #0A0A0A);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .priority-btn:hover { background: var(--theme-border, #E5E5EA); }
    .priority-active { border-color: var(--priority-color); background: color-mix(in srgb, var(--priority-color) 10%, transparent); color: var(--priority-color); }

    .upload-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 24px;
        background: var(--theme-border-light, #F2F2F7);
        border: 2px dashed var(--theme-border, #D1D1D6);
        border-radius: 12px;
        cursor: pointer;
        color: var(--theme-text-secondary, #8E8E93);
    }
    .upload-area:hover { border-color: var(--apple-accent, #007AFF); background: rgba(0, 122, 255, 0.05); }
    .upload-hint { font-size: 12px; }

    .screenshot-preview { position: relative; border-radius: 12px; overflow: hidden; }
    .screenshot-preview img { width: 100%; max-height: 200px; object-fit: cover; }
    .remove-screenshot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        background: rgba(0, 0, 0, 0.6);
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 16px;
        background: var(--apple-accent, #007AFF);
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .submit-btn:hover:not(:disabled) { background: var(--apple-accent-hover, #0056CC); }
    .submit-btn:disabled { background: var(--theme-border, #D1D1D6); cursor: not-allowed; }
    .btn-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* List View */
    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
    .empty-text { font-size: 16px; color: var(--theme-text-secondary, #8E8E93); margin-bottom: 20px; }
    .empty-btn { padding: 12px 24px; background: var(--apple-accent, #007AFF); border: none; border-radius: 10px; font-size: 14px; font-weight: 600; color: white; cursor: pointer; }

    .feedback-list { display: flex; flex-direction: column; gap: 12px; }
    .feedback-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
        background: var(--theme-card-bg, #fff);
        border: 1px solid var(--theme-border-light, #E5E5EA);
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        width: 100%;
    }
    .feedback-item:hover { border-color: var(--apple-accent, #007AFF); }

    .item-header { display: flex; align-items: center; gap: 12px; }
    .item-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .item-info { flex: 1; min-width: 0; }
    .item-title { font-size: 15px; font-weight: 600; color: var(--theme-text, #0A0A0A); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-id { font-size: 12px; color: var(--theme-text-secondary, #8E8E93); }
    .item-status { padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .item-rating { display: flex; align-items: center; gap: 2px; }
    .item-rating :global(.star-filled) { color: #FFCC00; }
    .item-rating :global(.star-empty) { color: var(--theme-border, #D1D1D6); }
    .item-date { font-size: 12px; color: var(--theme-text-secondary, #8E8E93); }

    /* Detail View */
    .detail-view { display: flex; flex-direction: column; gap: 16px; }
    .detail-header { display: flex; align-items: center; justify-content: space-between; }
    .detail-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .detail-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .detail-status { padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
    .detail-id { font-size: 12px; color: var(--theme-text-secondary, #8E8E93); }
    .detail-title { font-size: 20px; font-weight: 600; color: var(--theme-text, #0A0A0A); }
    .detail-rating { display: flex; align-items: center; gap: 4px; }
    .detail-rating :global(.star-filled) { color: #FFCC00; }
    .detail-rating :global(.star-empty) { color: var(--theme-border, #D1D1D6); }
    .detail-rating .rating-text { margin-left: 8px; font-size: 14px; font-weight: 500; color: var(--theme-text-secondary, #8E8E93); }
    .detail-description { font-size: 15px; color: var(--theme-text-secondary, #6E6E73); line-height: 1.5; }
    .detail-info { background: var(--theme-border-light, #F2F2F7); border-radius: 12px; padding: 16px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--theme-border-light, #E5E5EA); }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 14px; color: var(--theme-text-secondary, #8E8E93); }
    .info-value { font-size: 14px; font-weight: 500; color: var(--theme-text, #0A0A0A); }

    /* Success View */
    .success-view { text-align: center; padding: 20px 0; }
    .success-animation { margin-bottom: 24px; }
    .success-circle {
        width: 80px;
        height: 80px;
        background: var(--apple-green, #34C759);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin: 0 auto;
        animation: successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes successPop { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    .success-title { font-size: 24px; font-weight: 600; color: var(--theme-text, #0A0A0A); margin-bottom: 8px; }
    .success-text { font-size: 16px; color: var(--theme-text-secondary, #8E8E93); margin-bottom: 24px; }
    .success-details { background: var(--theme-border-light, #F2F2F7); border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .success-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .success-label { font-size: 14px; color: var(--theme-text-secondary, #8E8E93); }
    .success-value { font-size: 14px; font-weight: 600; color: var(--apple-accent, #007AFF); }
    .success-actions { display: flex; gap: 12px; }
    .success-btn { flex: 1; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
    .success-btn.primary { background: var(--apple-accent, #007AFF); border: none; color: white; }
    .success-btn.secondary { background: transparent; border: 1px solid var(--theme-border, #D1D1D6); color: var(--theme-text, #0A0A0A); }
    .success-btn:hover { transform: scale(1.02); }
</style>
