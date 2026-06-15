// Recipe Writing Assistant - Application Controller

// Network resilient CDN fallbacks
if (typeof lucide === 'undefined') {
  window.lucide = {
    createIcons: () => {
      console.warn('Lucide library failed to load from CDN. Dynamic icons are disabled.');
    }
  };
}
if (typeof marked === 'undefined') {
  window.marked = {
    parse: (text) => {
      // Basic fallback line-by-line parser to prevent crashes
      return (text || '')
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) return `<h1>${trimmed.substring(2)}</h1>`;
          if (trimmed.startsWith('## ')) return `<h2>${trimmed.substring(3)}</h2>`;
          if (trimmed.startsWith('### ')) return `<h3>${trimmed.substring(4)}</h3>`;
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li>${trimmed.substring(2)}</li>`;
          return trimmed ? `<p>${trimmed}</p>` : '';
        })
        .join('\n');
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Application State
  const state = {
    apiKey: localStorage.getItem('recipe_writer_openai_key') || '',
    tavilyKey: localStorage.getItem('recipe_writer_tavily_key') || '',
    wpUrl: localStorage.getItem('recipe_writer_wp_url') || '',
    wpUser: localStorage.getItem('recipe_writer_wp_user') || '',
    wpPassword: localStorage.getItem('recipe_writer_wp_password') || '',
    theme: localStorage.getItem('recipe_writer_theme') || 'light',
    ingredients: [],
    drafts: JSON.parse(localStorage.getItem('recipe_writer_drafts')) || [],
    currentDraftId: null,
    isGenerating: false,
    isPublishing: false,
    currentSources: [],
    currentImages: [],
    affiliates: JSON.parse(localStorage.getItem('recipe_writer_affiliates')) || [],
    queue: [],
    isQueueRunning: false,
    fetchedPosts: [],
    generatedPins: [],
    generatedPinPostIds: JSON.parse(localStorage.getItem('recipe_writer_generated_pin_post_ids')) || [],
    generatedPinHistory: JSON.parse(localStorage.getItem('recipe_writer_generated_pin_history')) || {}
  };

  // DOM Elements
  const body = document.body;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const darkIcon = themeToggleBtn.querySelector('.dark-icon');
  const lightIcon = themeToggleBtn.querySelector('.light-icon');

  // Drawers
  const settingsDrawer = document.getElementById('settingsDrawer');
  const settingsOpenBtn = document.getElementById('settingsOpenBtn');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  const inspirationDrawer = document.getElementById('inspirationDrawer');
  const inspirationOpenBtn = document.getElementById('inspirationOpenBtn');
  const inspirationCloseBtn = document.getElementById('inspirationCloseBtn');

  // Input Fields
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const tavilyApiKeyInput = document.getElementById('tavilyApiKey');
  const wpSiteUrlInput = document.getElementById('wpSiteUrl');
  const wpUsernameInput = document.getElementById('wpUsername');
  const wpAppPasswordInput = document.getElementById('wpAppPassword');

  // Affiliate Inputs
  const newAffiliateName = document.getElementById('newAffiliateName');
  const newAffiliateUrl = document.getElementById('newAffiliateUrl');
  const newAffiliateNote = document.getElementById('newAffiliateNote');
  const addAffiliateBtn = document.getElementById('addAffiliateBtn');
  const affiliatesList = document.getElementById('affiliatesList');
  const generatorAffiliatesList = document.getElementById('generatorAffiliatesList');

  // Pinterest Keyword & Queue Elements
  const pinterestKeywords = document.getElementById('pinterestKeywords');
  const pinterestTitleCount = document.getElementById('pinterestTitleCount');
  const suggestTitlesBtn = document.getElementById('suggestTitlesBtn');
  const suggestedTitlesContainer = document.getElementById('suggestedTitlesContainer');
  const suggestedTitlesList = document.getElementById('suggestedTitlesList');
  const queueCountBadge = document.getElementById('queueCountBadge');
  const generationQueueContainer = document.getElementById('generationQueueContainer');
  const runQueueBtn = document.getElementById('runQueueBtn');
  const inspirationImagesContainer = document.getElementById('inspirationImagesContainer');

  // Generator Controls
  const recipeConcept = document.getElementById('recipeConcept');
  const ingredientInput = document.getElementById('ingredientInput');
  const ingredientTags = document.getElementById('ingredientTags');
  const blogStylePreset = document.getElementById('blogStylePreset');
  const recipeTone = document.getElementById('recipeTone');
  const recipeLength = document.getElementById('recipeLength');
  const webSearchToggle = document.getElementById('webSearchToggle');
  const generateRecipeBtn = document.getElementById('generateRecipeBtn');
  const generationProgress = document.getElementById('generationProgress');

  // Tabs & Workspace
  const tabEdit = document.getElementById('tabEdit');
  const tabPreview = document.getElementById('tabPreview');
  const tabWordPress = document.getElementById('tabWordPress');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Editor, Preview & WordPress Panel
  const recipeMarkdown = document.getElementById('recipeMarkdown');
  const previewContainer = document.getElementById('previewContainer');
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const exportBtn = document.getElementById('exportBtn');
  
  // WordPress Post Config
  const wpPostTitle = document.getElementById('wpPostTitle');
  const wpPostStatus = document.getElementById('wpPostStatus');
  const wpCategory = document.getElementById('wpCategory');
  const wpTags = document.getElementById('wpTags');
  const wpPublishBtn = document.getElementById('wpPublishBtn');
  const wpPublishProgress = document.getElementById('wpPublishProgress');
  const wpMessageBanner = document.getElementById('wpMessageBanner');

  // Export Menu Dropdown & Actions
  const dropdownMenu = document.querySelector('.dropdown-menu');
  const copyMarkdownBtn = document.getElementById('copyMarkdownBtn');
  const copyHtmlBtn = document.getElementById('copyHtmlBtn');
  const downloadMdBtn = document.getElementById('downloadMdBtn');

  // Drafts Sidebar
  const draftSearch = document.getElementById('draftSearch');
  const draftsListContainer = document.getElementById('draftsListContainer');

  // Pinterest Pin Maker UI Bindings
  const tabPinMaker = document.getElementById('tabPinMaker');
  const pinMakerPane = document.getElementById('pin-maker-pane');
  const pinDefaultBoard = document.getElementById('pinDefaultBoard');
  const fetchWpPostsBtn = document.getElementById('fetchWpPostsBtn');
  const wpPostsSelectionContainer = document.getElementById('wpPostsSelectionContainer');
  const selectAllWpBtn = document.getElementById('selectAllWpBtn');
  const deselectAllWpBtn = document.getElementById('deselectAllWpBtn');
  const wpPostsGrid = document.getElementById('wpPostsGrid');
  const generatePinsBtn = document.getElementById('generatePinsBtn');
  const wpPostsTargetKeywords = document.getElementById('wpPostsTargetKeywords');
  const wpFetchProgress = document.getElementById('wpFetchProgress');
  const pinsAiProgress = document.getElementById('pinsAiProgress');
  const generatedPinsContainer = document.getElementById('generatedPinsContainer');
  const downloadAllCsvBtn = document.getElementById('downloadAllCsvBtn');
  const pinsList = document.getElementById('pinsList');
  const pinMakerMessageBanner = document.getElementById('pinMakerMessageBanner');
  const pinScheduleStart = document.getElementById('pinScheduleStart');
  const pinScheduleSpacing = document.getElementById('pinScheduleSpacing');
  const distributeScheduleBtn = document.getElementById('distributeScheduleBtn');
  const toggleLeftPanelBtn = document.getElementById('toggleLeftPanelBtn');
  const toggleRightPanelBtn = document.getElementById('toggleRightPanelBtn');
  const showExistingPinsCheckbox = document.getElementById('showExistingPinsCheckbox');
  const clearPinHistoryBtn = document.getElementById('clearPinHistoryBtn');

  // --- INITIALIZATION ---
  
  // Date time helper
  function getLocalDateTimeString(d = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Hex to RGBA helper for translucent backgrounds
  function hexToRgba(hex, alpha) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
  }

  const themeBannerBgColors = {
    crimson: '#fff0f3',
    navy: '#f0f4f8',
    charcoal: '#f8f9fa',
    forest: '#f1f7f4',
    amber: '#fffdf5'
  };

  // Pre-fill scheduling start time with the next clean hour (00 minutes)
  if (pinScheduleStart) {
    const now = new Date();
    const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
    pinScheduleStart.value = getLocalDateTimeString(nextHour);
  }

  // Set theme from state
  applyTheme(state.theme);

  // Load credential inputs from state
  openaiApiKeyInput.value = state.apiKey;
  tavilyApiKeyInput.value = state.tavilyKey;
  wpSiteUrlInput.value = state.wpUrl;
  wpUsernameInput.value = state.wpUser;
  wpAppPasswordInput.value = state.wpPassword;

  // Render drafts list
  renderDraftsList();

  // Render affiliates list
  renderAffiliatesList();

  // Render queue list
  renderQueueList();

  // Render inspiration images list
  renderInspirationImages();

  // Collapse panels on mobile load
  if (window.innerWidth <= 900) {
    const pLeft = document.querySelector('.panel-left');
    const pRight = document.querySelector('.panel-right');
    if (pLeft) {
      pLeft.classList.add('collapsed');
      const leftIcon = toggleLeftPanelBtn?.querySelector('i');
      if (leftIcon) leftIcon.setAttribute('data-lucide', 'chevron-right');
    }
    if (pRight) {
      pRight.classList.add('collapsed');
      const rightIcon = toggleRightPanelBtn?.querySelector('i');
      if (rightIcon) rightIcon.setAttribute('data-lucide', 'chevron-left');
    }
    lucide.createIcons();
  }

  // --- CORE METHODS ---

  // Theme Toggling
  themeToggleBtn.addEventListener('click', () => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  });

  // Sidebar Panel Toggling (Collapsible Panels)
  const panelLeft = document.querySelector('.panel-left');
  const panelRight = document.querySelector('.panel-right');

  if (toggleLeftPanelBtn && panelLeft) {
    toggleLeftPanelBtn.addEventListener('click', () => {
      panelLeft.classList.toggle('collapsed');
      const isCollapsed = panelLeft.classList.contains('collapsed');
      const icon = toggleLeftPanelBtn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isCollapsed ? 'chevron-right' : 'chevron-left');
        lucide.createIcons();
      }
      toggleLeftPanelBtn.title = isCollapsed ? 'Expand Recipe Generator Panel' : 'Collapse Recipe Generator Panel';
    });
  }

  if (toggleRightPanelBtn && panelRight) {
    toggleRightPanelBtn.addEventListener('click', () => {
      panelRight.classList.toggle('collapsed');
      const isCollapsed = panelRight.classList.contains('collapsed');
      const icon = toggleRightPanelBtn.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', isCollapsed ? 'chevron-left' : 'chevron-right');
        lucide.createIcons();
      }
      toggleRightPanelBtn.title = isCollapsed ? 'Expand Right Panel' : 'Collapse Right Panel';
    });
  }

  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('recipe_writer_theme', theme);
    if (theme === 'dark') {
      body.classList.remove('theme-light');
      body.classList.add('theme-dark');
      darkIcon.style.display = 'none';
      lightIcon.style.display = 'block';
    } else {
      body.classList.remove('theme-dark');
      body.classList.add('theme-light');
      darkIcon.style.display = 'block';
      lightIcon.style.display = 'none';
    }
  }

  // Slide-out Drawer Controls
  settingsOpenBtn.addEventListener('click', () => openDrawer(settingsDrawer));
  settingsCloseBtn.addEventListener('click', () => closeDrawer(settingsDrawer));
  settingsDrawer.addEventListener('click', (e) => {
    if (e.target === settingsDrawer) closeDrawer(settingsDrawer);
  });

  inspirationOpenBtn.addEventListener('click', () => openDrawer(inspirationDrawer));
  inspirationCloseBtn.addEventListener('click', () => closeDrawer(inspirationDrawer));
  inspirationDrawer.addEventListener('click', (e) => {
    if (e.target === inspirationDrawer) closeDrawer(inspirationDrawer);
  });

  function openDrawer(drawer) {
    drawer.classList.remove('hidden');
  }

  function closeDrawer(drawer) {
    drawer.classList.add('hidden');
  }

  // Password visibility togglers
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
      } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
      }
      lucide.createIcons();
    });
  });

  // Save Settings Handlers
  saveSettingsBtn.addEventListener('click', () => {
    state.apiKey = openaiApiKeyInput.value.trim();
    state.tavilyKey = tavilyApiKeyInput.value.trim();
    state.wpUrl = wpSiteUrlInput.value.trim().replace(/\/$/, ""); // Strip trailing slash
    state.wpUser = wpUsernameInput.value.trim();
    state.wpPassword = wpAppPasswordInput.value.trim();

    localStorage.setItem('recipe_writer_openai_key', state.apiKey);
    localStorage.setItem('recipe_writer_tavily_key', state.tavilyKey);
    localStorage.setItem('recipe_writer_wp_url', state.wpUrl);
    localStorage.setItem('recipe_writer_wp_user', state.wpUser);
    localStorage.setItem('recipe_writer_wp_password', state.wpPassword);

    alert('Settings saved successfully!');
    closeDrawer(settingsDrawer);
  });

  // --- AFFILIATE INVENTORY MANAGEMENT ---
  addAffiliateBtn.addEventListener('click', () => {
    const name = newAffiliateName.value.trim();
    const url = newAffiliateUrl.value.trim();
    const note = newAffiliateNote.value.trim();

    if (!name || !url) {
      alert('Please enter both the Product Name and the Affiliate URL.');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      alert('Please enter a valid URL (including https:// or http://).');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: name,
      url: url,
      note: note
    };

    state.affiliates.push(newItem);
    localStorage.setItem('recipe_writer_affiliates', JSON.stringify(state.affiliates));
    
    newAffiliateName.value = '';
    newAffiliateUrl.value = '';
    newAffiliateNote.value = '';
    renderAffiliatesList();
  });

  function renderAffiliatesList() {
    if (!affiliatesList) return;

    if (state.affiliates.length === 0) {
      affiliatesList.innerHTML = `
        <div class="empty-state">
          <p>No affiliate products added yet</p>
        </div>
      `;
      return;
    }

    affiliatesList.innerHTML = '';
    state.affiliates.forEach(item => {
      const row = document.createElement('div');
      row.className = 'affiliate-item';
      row.innerHTML = `
        <div class="affiliate-item-info" style="width: calc(100% - 28px);">
          <span class="affiliate-item-name">${item.name}</span>
          <span class="affiliate-item-url">${item.url}</span>
          ${item.note ? `<span class="affiliate-item-note" style="color: var(--text-muted); font-size: 11px; font-style: italic; margin-top: 2px;">Note: "${item.note}"</span>` : ''}
        </div>
        <button class="delete-affiliate-btn" data-id="${item.id}" title="Remove Product">
          <i data-lucide="trash-2"></i>
        </button>
      `;
      affiliatesList.appendChild(row);
    });

    // Wire delete buttons
    affiliatesList.querySelectorAll('.delete-affiliate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteAffiliate(id);
      });
    });

    lucide.createIcons();
    renderGeneratorAffiliates();
  }

  function renderGeneratorAffiliates() {
    if (!generatorAffiliatesList) return;

    const checkboxesExist = generatorAffiliatesList.querySelectorAll('input[name="selectedAffiliate"]').length > 0;
    
    const checkedMap = {};
    if (checkboxesExist) {
      generatorAffiliatesList.querySelectorAll('input[name="selectedAffiliate"]').forEach(cb => {
        checkedMap[cb.value] = cb.checked;
      });
    }

    generatorAffiliatesList.innerHTML = '';
    if (state.affiliates.length === 0) {
      generatorAffiliatesList.innerHTML = `
        <span class="input-hint" style="grid-column: 1 / -1; margin-top: 4px;">No products in inventory. Add them in Settings.</span>
      `;
      return;
    }

    state.affiliates.forEach(item => {
      const isChecked = checkboxesExist ? (checkedMap[item.id] !== false) : true;

      const label = document.createElement('label');
      label.className = 'checkbox-label';
      label.innerHTML = `
        <input type="checkbox" name="selectedAffiliate" value="${item.id}" ${isChecked ? 'checked' : ''}>
        <span>${item.name}</span>
      `;
      generatorAffiliatesList.appendChild(label);
    });
  }

  function deleteAffiliate(id) {
    state.affiliates = state.affiliates.filter(item => item.id !== id);
    localStorage.setItem('recipe_writer_affiliates', JSON.stringify(state.affiliates));
    renderAffiliatesList();
  }

  // --- PINTEREST KEYWORD PLANNER & BATCH QUEUE ---
  suggestTitlesBtn.addEventListener('click', async () => {
    const keywords = pinterestKeywords.value.trim();
    const count = parseInt(pinterestTitleCount.value) || 6;
    if (!keywords) {
      alert('Please enter some Pinterest target keywords first.');
      return;
    }

    if (!state.apiKey) {
      alert('Please configure your OpenAI API Key first under Settings.');
      openDrawer(settingsDrawer);
      return;
    }

    // Set UI to loading state
    suggestTitlesBtn.disabled = true;
    const origBtnText = suggestTitlesBtn.innerHTML;
    suggestTitlesBtn.innerHTML = '<span class="progress-spinner" style="width:14px;height:14px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:6px;"></span>Suggesting...';

    suggestedTitlesContainer.classList.remove('hidden');
    suggestedTitlesList.innerHTML = `
      <div class="empty-state">
        <p>Generating Pinterest optimized titles...</p>
      </div>
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional Pinterest marketer and food blogger. Analyze the provided target keywords and generate exactly ${count} highly click-worthy, SEO-optimized, and viral Pinterest-style blog post titles for a food blog. CRITICAL: The titles MUST target singular, specific recipes, NOT listicles or summaries (do NOT use numbers like "10 Easy Recipes..." or "5 Ways to..."). Examples: "Foolproof 30-Minute Garlic Butter Chicken", "Life-Changing Crispy Pork Belly". Focus on quick timelines, curiosity hooks, and high-impact adjectives (e.g., "Life-Changing", "Foolproof", "Guilt-Free"). You MUST respond with a valid, raw JSON array of strings containing the titles. Do not wrap the response in markdown code blocks or write any extra text.`
            },
            {
              role: 'user',
              content: `Target Keywords: ${keywords}`
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      
      // Handle possible markdown wrapping e.g. ```json ... ```
      const cleanJson = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      const titles = JSON.parse(cleanJson);

      if (!Array.isArray(titles) || titles.length === 0) {
        throw new Error("Invalid format received from model.");
      }

      suggestedTitlesList.innerHTML = '';
      titles.forEach(title => {
        const card = document.createElement('div');
        card.className = 'title-suggestion-card';
        card.innerHTML = `
          <span class="title-card-text">${title}</span>
          <button class="queue-btn" title="Approve & Add to Batch Queue">
            <i data-lucide="plus"></i>
          </button>
        `;

        // Click title text to copy directly to Concept Input
        card.querySelector('.title-card-text').addEventListener('click', () => {
          if (state.isQueueRunning) return;
          recipeConcept.value = title;
          // Flash border of concept input
          recipeConcept.style.borderColor = 'var(--accent)';
          recipeConcept.style.boxShadow = '0 0 0 3px var(--accent-light)';
          setTimeout(() => {
            recipeConcept.style.borderColor = '';
            recipeConcept.style.boxShadow = '';
          }, 800);
        });

        // Click plus icon to add to Batch Queue
        card.querySelector('.queue-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          addToQueue(title);
          card.style.opacity = '0';
          setTimeout(() => {
            card.remove();
            if (suggestedTitlesList.children.length === 0) {
              suggestedTitlesContainer.classList.add('hidden');
            }
          }, 200);
        });

        suggestedTitlesList.appendChild(card);
      });

      lucide.createIcons();

    } catch (err) {
      console.error(err);
      suggestedTitlesList.innerHTML = `
        <div class="empty-state" style="color: var(--error-text);">
           <p>Failed to generate titles: ${err.message}</p>
        </div>
      `;
    } finally {
      suggestTitlesBtn.disabled = false;
      suggestTitlesBtn.innerHTML = origBtnText;
    }
  });

  function addToQueue(title) {
    if (state.queue.includes(title)) return;
    state.queue.push(title);
    renderQueueList();
  }

  function renderQueueList() {
    if (!generationQueueContainer) return;

    // Update badge count
    queueCountBadge.innerText = `${state.queue.length} queued`;

    if (state.queue.length === 0) {
      generationQueueContainer.innerHTML = `
        <div class="empty-state">
          <p>No titles approved to write yet</p>
        </div>
      `;
      runQueueBtn.classList.add('hidden');
      return;
    }

    generationQueueContainer.innerHTML = '';
    state.queue.forEach((title, index) => {
      const isCurrentActive = state.isQueueRunning && index === 0;
      const item = document.createElement('div');
      item.className = `queue-item ${isCurrentActive ? 'active' : ''}`;
      item.innerHTML = `
        <span class="queue-item-text">${title}</span>
        ${!state.isQueueRunning ? `
          <button class="remove-queue-btn" data-index="${index}" title="Remove Title">
            <i data-lucide="x"></i>
          </button>
        ` : ''}
      `;
      generationQueueContainer.appendChild(item);
    });

    if (!state.isQueueRunning) {
      // Wire remove buttons
      generationQueueContainer.querySelectorAll('.remove-queue-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'));
          state.queue.splice(idx, 1);
          renderQueueList();
        });
      });
      runQueueBtn.classList.remove('hidden');
      runQueueBtn.disabled = false;
      runQueueBtn.innerHTML = '<i data-lucide="play-circle"></i> <span>Start Batch Write</span>';
    } else {
      runQueueBtn.classList.remove('hidden');
      runQueueBtn.disabled = true;
      runQueueBtn.innerHTML = '<span class="progress-spinner" style="width:14px;height:14px;border-width:1.5px;display:inline-block;vertical-align:middle;margin-right:6px;"></span>Batch Writing...';
    }

    lucide.createIcons();
  }

  runQueueBtn.addEventListener('click', async () => {
    if (state.isQueueRunning || state.queue.length === 0) return;

    state.isQueueRunning = true;
    toggleControlsState(true);
    renderQueueList();

    processNextQueueItem();
  });

  async function processNextQueueItem() {
    if (state.queue.length === 0) {
      state.isQueueRunning = false;
      toggleControlsState(false);
      renderQueueList();
      alert('Batch generation completed! All recipes saved to Drafts.');
      return;
    }

    // Mark first item as active
    renderQueueList();

    const nextTitle = state.queue[0];
    try {
      // Run OpenAI recipe generation stream
      await startGeneration(nextTitle);
      
      // Success! Remove first item from queue and proceed
      state.queue.shift();
      // Short delay before next generation for stability
      setTimeout(processNextQueueItem, 1500);
    } catch (err) {
      console.error("Batch Queue failed on item:", nextTitle, err);
      state.isQueueRunning = false;
      toggleControlsState(false);
      renderQueueList();
      alert(`Batch generation paused due to error: ${err.message}`);
    }
  }

  function toggleControlsState(disabled) {
    pinterestKeywords.disabled = disabled;
    suggestTitlesBtn.disabled = disabled;
    generateRecipeBtn.disabled = disabled;
    recipeConcept.disabled = disabled;
    
    // Toggle interactive pointer events or cursor class
    const items = document.querySelectorAll('.title-suggestion-card, .draft-item');
    items.forEach(el => {
      if (disabled) {
        el.style.pointerEvents = 'none';
        el.style.opacity = '0.5';
      } else {
        el.style.pointerEvents = '';
        el.style.opacity = '';
      }
    });
  }

  // --- INGREDIENTS TAG INPUT ---
  ingredientInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = ingredientInput.value.trim();
      if (val && !state.ingredients.includes(val)) {
        state.ingredients.push(val);
        renderIngredientTags();
        ingredientInput.value = '';
      }
    }
  });

  function renderIngredientTags() {
    ingredientTags.innerHTML = '';
    state.ingredients.forEach((ing, index) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `
        <span>${ing}</span>
        <button class="remove-tag" data-index="${index}"><i data-lucide="x"></i></button>
      `;
      ingredientTags.appendChild(tag);
    });
    
    // Add remove listeners
    document.querySelectorAll('.remove-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        state.ingredients.splice(idx, 1);
        renderIngredientTags();
      });
    });
    
    lucide.createIcons();
  }

  // --- TABS CONTROLLERS ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.getAttribute('data-tab');
      
      // Update button highlights
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Toggle visibility
      tabPanes.forEach(pane => {
        if (pane.id === paneId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      // Special action on tabs
      if (paneId === 'preview-pane') {
        renderLivePreview();
      } else if (paneId === 'wordpress-pane') {
        // Sync markdown title to WordPress post title if empty
        if (!wpPostTitle.value.trim()) {
          const firstLine = recipeMarkdown.value.split('\n')[0] || '';
          if (firstLine.startsWith('# ')) {
            wpPostTitle.value = firstLine.substring(2).trim();
          }
        }
      }
    });
  });

  // Markdown Real-time Preview Engine
  recipeMarkdown.addEventListener('input', () => {
    if (tabPreview.classList.contains('active')) {
      renderLivePreview();
    }
  });

  function renderLivePreview() {
    const md = recipeMarkdown.value.trim();
    if (!md) {
      previewContainer.innerHTML = `
        <div class="preview-placeholder">
          <i data-lucide="book-open"></i>
          <p>No content to preview. Type in the editor or generate a recipe to see it rendered beautifully here.</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Parse Markdown to HTML using marked
    const html = marked.parse(md);
    previewContainer.innerHTML = html;
  }

  // --- DRAFTS PERSISTENCE SYSTEM ---
  saveDraftBtn.addEventListener('click', () => {
    const markdown = recipeMarkdown.value;
    if (!markdown.trim()) {
      alert('Cannot save an empty recipe post.');
      return;
    }

    // Extract title from H1 markdown or first line
    const lines = markdown.split('\n');
    let title = 'Untitled Recipe Draft';
    for (let line of lines) {
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
        break;
      }
    }

    if (state.currentDraftId) {
      // Update existing draft
      const draft = state.drafts.find(d => d.id === state.currentDraftId);
      if (draft) {
        draft.title = title;
        draft.markdown = markdown;
        draft.categories = wpCategory.value.trim();
        draft.tags = wpTags.value.trim();
        draft.sources = [...state.currentSources];
        draft.images = [...state.currentImages];
        draft.timestamp = new Date().toISOString();
      }
    } else {
      // Create new draft
      const newDraft = {
        id: Date.now().toString(),
        title: title,
        markdown: markdown,
        categories: wpCategory.value.trim(),
        tags: wpTags.value.trim(),
        sources: [...state.currentSources],
        images: [...state.currentImages],
        timestamp: new Date().toISOString()
      };
      state.drafts.push(newDraft);
      state.currentDraftId = newDraft.id;
    }

    localStorage.setItem('recipe_writer_drafts', JSON.stringify(state.drafts));
    renderDraftsList();
    
    // Provide a small animation alert or show save status
    const origText = saveDraftBtn.querySelector('span').innerText;
    saveDraftBtn.querySelector('span').innerText = 'Saved!';
    setTimeout(() => {
      saveDraftBtn.querySelector('span').innerText = origText;
    }, 2000);
  });

  function renderDraftsList() {
    const query = draftSearch.value.toLowerCase().trim();
    const filteredDrafts = state.drafts.filter(d => 
      d.title.toLowerCase().includes(query) || 
      d.markdown.toLowerCase().includes(query)
    );

    // Sort drafts: newest first
    filteredDrafts.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filteredDrafts.length === 0) {
      draftsListContainer.innerHTML = `
        <div class="empty-state">
          <p>${query ? 'No matching drafts found' : 'No saved drafts found'}</p>
        </div>
      `;
      return;
    }

    draftsListContainer.innerHTML = '';
    filteredDrafts.forEach(draft => {
      const date = new Date(draft.timestamp);
      const formattedDate = date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) + ' ' + date.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'});
      
      const item = document.createElement('div');
      item.className = `draft-item ${state.currentDraftId === draft.id ? 'active' : ''}`;
      item.innerHTML = `
        <div class="draft-item-title">${draft.title}</div>
        <div class="draft-item-meta">
          <span>${formattedDate}</span>
          <div class="draft-item-actions">
            <button class="delete-draft-btn" data-id="${draft.id}" title="Delete Draft"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `;
      
      // Load draft when item clicked (unless deleting)
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-draft-btn')) return;
        loadDraft(draft.id);
      });

      draftsListContainer.appendChild(item);
    });

    // Wire delete buttons
    document.querySelectorAll('.delete-draft-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this draft?')) {
          deleteDraft(id);
        }
      });
    });

    lucide.createIcons();
  }

  function loadDraft(id) {
    const draft = state.drafts.find(d => d.id === id);
    if (draft) {
      state.currentDraftId = draft.id;
      recipeMarkdown.value = draft.markdown;
      wpPostTitle.value = draft.title;
      wpCategory.value = draft.categories || '';
      wpTags.value = draft.tags || '';
      wpMessageBanner.className = 'message-banner hidden';
      wpMessageBanner.innerHTML = '';
      state.currentSources = draft.sources || [];
      state.currentImages = draft.images || [];
      renderInspirationImages();
      renderLivePreview();
      renderDraftsList();
      
      // Switch to editor tab if not there
      tabEdit.click();
    }
  }

  function deleteDraft(id) {
    state.drafts = state.drafts.filter(d => d.id !== id);
    if (state.currentDraftId === id) {
      state.currentDraftId = null;
      recipeMarkdown.value = '';
      wpPostTitle.value = '';
      wpCategory.value = '';
      wpTags.value = '';
      wpMessageBanner.className = 'message-banner hidden';
      wpMessageBanner.innerHTML = '';
      state.currentSources = [];
      state.currentImages = [];
      renderInspirationImages();
    }
    localStorage.setItem('recipe_writer_drafts', JSON.stringify(state.drafts));
    renderDraftsList();
    renderLivePreview();
  }

  draftSearch.addEventListener('input', renderDraftsList);

  // --- EXPORT DROP-DOWN ACTION ---
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  copyMarkdownBtn.addEventListener('click', () => {
    const md = recipeMarkdown.value;
    navigator.clipboard.writeText(md).then(() => {
      alert('Markdown copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy text: ' + err);
    });
  });

  copyHtmlBtn.addEventListener('click', () => {
    const md = recipeMarkdown.value;
    const html = marked.parse(md);
    navigator.clipboard.writeText(html).then(() => {
      alert('HTML copied to clipboard!');
    }).catch(err => {
      alert('Failed to copy HTML: ' + err);
    });
  });

  downloadMdBtn.addEventListener('click', () => {
    const md = recipeMarkdown.value;
    const firstLine = md.split('\n')[0] || 'recipe';
    let filename = 'recipe.md';
    if (firstLine.startsWith('# ')) {
      filename = firstLine.substring(2).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
    }
    
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });

  // --- GPT-4O-MINI OPENAI INTEGRATION ---
  generateRecipeBtn.addEventListener('click', async () => {
    if (state.isGenerating) return;

    const concept = recipeConcept.value.trim();
    if (!concept) {
      alert('Please enter a recipe concept or dish name first.');
      return;
    }

    try {
      await startGeneration(concept);
    } catch (err) {
      // Errors are already handled inside startGeneration (alert shown)
    }
  });

  async function startGeneration(concept) {
    if (!state.apiKey) {
      alert('Please configure your OpenAI API Key first under Settings.');
      openDrawer(settingsDrawer);
      throw new Error("API Key missing");
    }

    // Set UI to loading state
    state.isGenerating = true;
    generateRecipeBtn.disabled = true;
    generationProgress.classList.remove('hidden');
    recipeMarkdown.value = '';
    
    state.currentDraftId = null;
    state.currentSources = [];
    state.currentImages = [];
    renderInspirationImages();

    // Ensure progress container has correct text
    const progressTitle = generationProgress.querySelector('.progress-title');
    const progressSubtitle = generationProgress.querySelector('.progress-subtitle');
    progressTitle.innerText = 'Writing Recipe Post...';
    progressSubtitle.innerText = 'Calling OpenAI gpt-4o-mini';

    try {
      // 1. Perform Web Search if enabled
      let searchContext = '';
      if (webSearchToggle.checked) {
        if (!state.tavilyKey) {
          alert('Please configure your Tavily Search API Key under Settings to use the Web Search feature.');
          openDrawer(settingsDrawer);
          throw new Error("Tavily API Key is missing");
        }

        progressTitle.innerText = 'Researching online...';
        progressSubtitle.innerText = 'Searching YouTube, recipe sites & Pinterest images';

        try {
          const textSearchPromise = fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              api_key: state.tavilyKey,
              query: `${concept} recipe youtube cooking tutorial`,
              search_depth: 'basic',
              include_images: true,
              max_results: 5
            })
          }).then(res => res.ok ? res.json() : null).catch(() => null);

          const pinterestSearchPromise = fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              api_key: state.tavilyKey,
              query: `${concept} recipe`,
              search_depth: 'basic',
              include_images: true,
              include_domains: ['pinterest.com'],
              max_results: 5
            })
          }).then(res => res.ok ? res.json() : null).catch(() => null);

          const [textData, pinterestData] = await Promise.all([textSearchPromise, pinterestSearchPromise]);

          let rawImages = [];
          if (pinterestData && pinterestData.images && pinterestData.images.length > 0) {
            rawImages = pinterestData.images;
          }

          if (textData) {
            if (textData.results && textData.results.length > 0) {
              state.currentSources = textData.results;
              searchContext = 'Real-world search context from verified recipes and video tutorials:\n\n';
              textData.results.forEach((r, idx) => {
                searchContext += `Source [${idx + 1}]: "${r.title}" (${r.url})\nSnippet: ${r.content}\n\n`;
              });
            }
            if (rawImages.length === 0 && textData.images && textData.images.length > 0) {
              rawImages = textData.images;
            }
          }

          state.currentImages = rawImages.filter(url => 
            url && 
            !url.includes('spacer') && 
            !url.includes('transparent') && 
            !url.includes('pixel') && 
            !url.includes('tracker')
          );
          renderInspirationImages();
        } catch (searchErr) {
          console.error('Web search failed, proceeding with model defaults:', searchErr);
        }

        // Reset progress titles for writing state
        progressTitle.innerText = 'Writing Recipe Post...';
        progressSubtitle.innerText = 'Calling OpenAI gpt-4o-mini';
      }

      // Gather preferences
      const style = blogStylePreset.value;
      const tone = recipeTone.value;
      const length = recipeLength.value;
      
      const dietaryElements = [];
      document.querySelectorAll('input[name="dietary"]:checked').forEach(cb => {
        dietaryElements.push(cb.value);
      });

      // Construct system prompt guidelines based on selected presets
      let systemPrompt = '';
      if (style === 'pinch-of-yum') {
        systemPrompt = `You are a warm, popular food blogger writing in the style of Pinch of Yum.
Your tone is cozy, conversational, and highly personal.
Share a warm, friendly anecdote about the dish (e.g., how it fits into busy family life or cozy weekends).
Use sensory descriptions (textures, smells, visual steam, sizzle).
Structure the blog post with:
1. An engaging personal story introduction (about 2-3 paragraphs) that explains why this recipe brings comfort.
2. A 'Why You'll Love This Recipe' section with high-impact bullet points.
3. A quick 'How to Make This' high-level visual summary.
4. Wrap the core recipe card inside a HTML div block. CRITICAL: To allow correct markdown rendering, you must place empty lines before and after the HTML tags, like this:

<div class="recipe-card-box">

### [Dish Name] Recipe

* **Prep Time:** X mins
* **Cook Time:** Y mins
* **Servings:** Z

#### Ingredients
- (list ingredient items here with bullet points)

#### Directions
1. (step-by-step instructions)

</div>

5. A 'Recipe FAQ & Storage Notes' section answering common blogger questions (e.g. substitutions, gluten-free variations).
Write in a welcoming, cozy voice. Never use markdown code fences block wrappers (like \`\`\`markdown) for the final response. Output pure raw markdown text.`;
      } 
      else if (style === 'serious-eats') {
        systemPrompt = `You are a culinary expert writing in the style of Serious Eats.
Your tone is analytical, scientific, and authoritative, yet highly enthusiastic about testing.
Deconstruct the dish, critique traditional preparation methods, and explain the science behind why your method works (culinary chemistry, protein reactions, heat levels).
Focus on weights and measurements (include metric weights/grams).
Structure the blog post with:
1. An analytical introduction explaining the history/concept of the dish and what makes traditional recipes fail.
2. 'The Science of [Dish Name]' explaining key reactions (e.g., Maillard reaction, emulsification, temperature controls).
3. 'Key Testing Notes' outlining the variables you tested (e.g. different pan materials, oils, or temperatures).
4. Wrap the core recipe card inside a HTML div block. CRITICAL: To allow correct markdown rendering, you must place empty lines before and after the HTML tags, like this:

<div class="recipe-card-box">

### [Dish Name] Recipe

* **Prep Time:** X mins
* **Cook Time:** Y mins
* **Servings:** Z
* **Yield:** W

#### Ingredients
- (list ingredients with weights in grams and volume measurements with bullet points)

#### Directions
1. (highly precise step-by-step instructions with temperatures and physical indicators)

</div>

5. Recommended Equipment list.
Write with intense food-geek enthusiasm and scientific precision. Do not wrap output in \`\`\`markdown.`;
      }
      else if (style === 'sallys-baking') {
        systemPrompt = `You are an expert baking and cooking coach writing in the style of Sally's Baking Addiction.
Your tone is educational, encouraging, detail-oriented, and structured.
Provide blueprints, fail-safe baking guidelines, and specific cautions (e.g. room temperature butter, don't overmix, spoon and level flour).
Structure the blog post with:
1. An enthusiastic, encouraging introduction promising foolproof results.
2. '5 Keys to Success for This Recipe' detailing critical structural steps.
3. 'Ingredients Breakdown' explaining the chemical purpose of each ingredient (e.g. baking powder vs baking soda, role of cornstarch, sugar ratios).
4. Wrap the core recipe card inside a HTML div block. CRITICAL: To allow correct markdown rendering, you must place empty lines before and after the HTML tags, like this:

<div class="recipe-card-box">

### [Dish Name] Recipe

* **Prep Time:** X mins
* **Cook Time:** Y mins
* **Total Time:** Z mins

#### Ingredients
- (list detailed ingredients, provide volume and grams where applicable with bullet points)

#### Directions
1. (fail-proof step-by-step directions with visual cues)

</div>

5. Troubleshooting guidelines and make-ahead/freezing instructions.
Write as a supportive coach. Do not wrap output in \`\`\`markdown.`;
      }
      else {
        // Standard Foodie
        systemPrompt = `You are a professional food blogger. Your writing is highly engaging, friendly, SEO-optimized, and clear.
Generate a structured recipe blog post.
Structure the blog post with:
1. An engaging introduction that hooks the reader, explaining why this recipe works and its origins.
2. Key ingredients summary (why they are chosen and substitutions).
3. Wrap the core recipe card inside a HTML div block. CRITICAL: To allow correct markdown rendering, you must place empty lines before and after the HTML tags, like this:

<div class="recipe-card-box">

### [Dish Name] Recipe

* **Prep Time:** X mins
* **Cook Time:** Y mins
* **Servings:** Z

#### Ingredients
- (list ingredient items here with bullet points)

#### Directions
1. (step-by-step instructions)

</div>

4. Tips for success.
5. Common FAQs.
Write in an open, friendly tone. Do not wrap output in \`\`\`markdown.`;
      }

      // Enforce list markdown structure and blank lines
      systemPrompt += `\n\nCRITICAL FORMATTING GUIDELINE:
- Always format the Ingredients section as a clean bulleted list using "- " or "* " for each ingredient.
- Always format the Directions section as a clean numbered list using "1. ", "2. ", etc., for each step.
- ALWAYS place blank lines before and after the <div class="recipe-card-box"> and </div> tag blocks. If there are no blank lines around the HTML tag blocks, the markdown list formatting inside will break and become a jumbled mess.
- Never let lists merge into a single paragraph. Make sure each ingredient and instruction is on its own line and separated properly.`;

      // Construct user prompt with options
      let userPrompt = `Generate a blog post for the recipe: "${concept}".\n`;
      if (state.ingredients.length > 0) {
        userPrompt += `You MUST include and highlight these key ingredients: ${state.ingredients.join(', ')}.\n`;
      }
      if (dietaryElements.length > 0) {
        userPrompt += `Tailor the recipe to follow these dietary restrictions: ${dietaryElements.join(', ')}. Include substitutions if needed.\n`;
      }
      userPrompt += `Writing Tone: ${tone}\n`;
      userPrompt += `Target post length: ${length} length (approx. ${length === 'short' ? '600' : length === 'standard' ? '1200' : '2000'} words).\n`;

      if (searchContext) {
        userPrompt += `\n${searchContext}\n`;
        userPrompt += `IMPORTANT: You must ground your cooking instructions, prep steps, and ingredient ratios in the real-world search results provided above. Make sure the quantities are realistic and accurate. Do NOT include or append any "References" or "Sources" section at the end of the post, and do not cite the URLs inside the text body. Only write the recipe article.\n`;
      }

      const selectedAffiliateIds = Array.from(document.querySelectorAll('#generatorAffiliatesList input[name="selectedAffiliate"]:checked'))
        .map(cb => cb.value);
      const activeAffiliates = state.affiliates.filter(prod => selectedAffiliateIds.includes(prod.id));

      if (activeAffiliates && activeAffiliates.length > 0) {
        userPrompt += `\nAvailable Affiliate Products to naturally integrate into the post:\n`;
        activeAffiliates.forEach(prod => {
          userPrompt += `- ${prod.name}: ${prod.url}${prod.note ? ` (Personal review pitch note: "${prod.note}")` : ''}\n`;
        });
        userPrompt += `CRITICAL AFFILIATE RULES:
1. You MUST naturally integrate 1-2 relevant affiliate products from the list above inline, directly within the conversational "talking lines" or recipe instruction steps where the item/tool is first used. 
2. Do NOT assume the reader already knows or owns the brand-name affiliate product in the recipe text (e.g. do NOT write "Warm up your Caraway Double Burner Griddle over medium heat"). Instead, write the instructions using the generic tool name (e.g. "pan", "griddle", "pot", "plate"), and then contextually introduce your recommendation in the first person.
3. WEAVE IN PERSONAL NOTES: If a product has a "Personal review pitch note" listed, you MUST weave those specific details/anecdotes (e.g. who gave it to you, special core materials, why it is helpful) into your first-person recommendation voice to make it sound authentic and story-like.
4. CRITICAL FOR LINKS: Every single time you mention the affiliate product name in the text, you MUST format it as a clickable Markdown link wrapping the exact product name, using the exact URL provided in the list (e.g., "[Caraway Double Burner Griddle](URL)"). You must NEVER output the brand product name as plain text without a link.
For example, instead of writing:
"Warm up your [Caraway Double Burner Griddle](URL) over medium heat..." (Assuming they own it)
Or writing:
"...preferring a non-stick griddle like the Caraway Double Burner Griddle." (No link)
You should write:
"Warm up your pan over medium heat, preferably a non-stick griddle (I always use the [Caraway Double Burner Griddle](URL) because it flips pancakes beautifully without sticking), and..."
Ensure the markdown link wraps the specific product name/anchor text naturally within this conversational voice, and matches the exact URL provided. Do NOT group links at the end of the post.\n`;
      }

      userPrompt += `\nGuidelines:\n`;
      userPrompt += `- Start the post immediately on the first line with a single H1 header ('# [Your Title]') for the blog post title.\n`;
      userPrompt += `- Write the actual text and recipe. Do not use placeholders or summaries. Write the complete recipe.\n`;
      userPrompt += `- Generate SEO-friendly headings and details.\n`;

      // Call OpenAI API with Streaming
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // Set active tab to Editor
      tabEdit.click();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep partial line

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine === 'data: [DONE]') continue;

          if (cleanLine.startsWith('data: ')) {
            try {
              const json = JSON.parse(cleanLine.substring(6));
              const chunk = json.choices[0]?.delta?.content || '';
              recipeMarkdown.value += chunk;
              
              // Smooth auto-scroll as text streams in
              recipeMarkdown.scrollTop = recipeMarkdown.scrollHeight;
            } catch (err) {
              console.error('Error parsing streaming line:', err);
            }
          }
        }
      }

      // Clean up final buffer
      if (buffer.startsWith('data: ') && buffer !== 'data: [DONE]') {
        try {
          const json = JSON.parse(buffer.substring(6));
          const chunk = json.choices[0]?.delta?.content || '';
          recipeMarkdown.value += chunk;
        } catch (e) {}
      }

      // Auto-save generated post as new draft
      saveDraftBtn.click();

    } catch (error) {
      console.error(error);
      alert(`Error generating recipe: ${error.message}`);
      throw error;
    } finally {
      state.isGenerating = false;
      generateRecipeBtn.disabled = false;
      generationProgress.classList.add('hidden');
    }
  }

  // --- WORDPRESS PUBLISHING API CLIENT ---
  wpPublishBtn.addEventListener('click', async () => {
    if (state.isPublishing) return;

    const title = wpPostTitle.value.trim();
    const markdown = recipeMarkdown.value.trim();

    if (!title || !markdown) {
      alert('Please ensure you have a post title and content in the editor.');
      return;
    }

    if (!state.wpUrl || !state.wpUser || !state.wpPassword) {
      alert('Please configure your WordPress Site URL, Username, and Application Password in Settings.');
      openDrawer(settingsDrawer);
      return;
    }

    // Set UI to publishing state
    state.isPublishing = true;
    wpPublishBtn.disabled = true;
    wpPublishProgress.classList.remove('hidden');
    wpMessageBanner.className = 'message-banner hidden';
    wpMessageBanner.innerHTML = '';
    if (state.wpMessageTimeout) clearTimeout(state.wpMessageTimeout);

    try {
      // 1. Prepare HTML from Markdown
      let htmlContent = marked.parse(markdown);
      // Remove the first H1 tag block from the HTML so it doesn't duplicate the theme title in WordPress
      htmlContent = htmlContent.replace(/<h1[^>]*>.*?<\/h1>/i, '');



      // 2. Parse tags and categories (WordPress requires IDs for posting, so we do tag/category creation dynamic routing)
      const inputCategories = wpCategory.value.split(',').map(s => s.trim()).filter(Boolean);
      const inputTags = wpTags.value.split(',').map(s => s.trim()).filter(Boolean);

      const categoryIds = [];
      const tagIds = [];

      // Create Authorization header (Basic Username:AppPassword in Base64)
      const authHeader = 'Basic ' + btoa(`${state.wpUser}:${state.wpPassword}`);

      // Helper function to resolve or create categories in WordPress
      async function getOrCreateCategory(catName) {
        // Search category
        const searchRes = await fetch(`${state.wpUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(catName)}`, {
          headers: { 'Authorization': authHeader }
        });
        
        if (searchRes.ok) {
          const results = await searchRes.json();
          // Look for exact match
          const exactMatch = results.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (exactMatch) return exactMatch.id;
        }

        // If not found, create new category
        const createRes = await fetch(`${state.wpUrl}/wp-json/wp/v2/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({ name: catName })
        });

        if (createRes.ok) {
          const newCat = await createRes.json();
          return newCat.id;
        }
        return null;
      }

      // Helper function to resolve or create tags in WordPress
      async function getOrCreateTag(tagName) {
        // Search tag
        const searchRes = await fetch(`${state.wpUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, {
          headers: { 'Authorization': authHeader }
        });

        if (searchRes.ok) {
          const results = await searchRes.json();
          // Look for exact match
          const exactMatch = results.find(t => t.name.toLowerCase() === tagName.toLowerCase());
          if (exactMatch) return exactMatch.id;
        }

        // If not found, create new tag
        const createRes = await fetch(`${state.wpUrl}/wp-json/wp/v2/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({ name: tagName })
        });

        if (createRes.ok) {
          const newTag = await createRes.json();
          return newTag.id;
        }
        return null;
      }

      // Create tags/categories sequentially to prevent API rate/concurrency locks
      for (const cat of inputCategories) {
        try {
          const id = await getOrCreateCategory(cat);
          if (id) categoryIds.push(id);
        } catch (e) { console.error(`Error resolving category "${cat}":`, e); }
      }

      for (const tag of inputTags) {
        try {
          const id = await getOrCreateTag(tag);
          if (id) tagIds.push(id);
        } catch (e) { console.error(`Error resolving tag "${tag}":`, e); }
      }

      // 3. Post creation payload
      const status = wpPostStatus.value;
      const payload = {
        title: title,
        content: htmlContent,
        status: status,
        categories: categoryIds,
        tags: tagIds
      };


      // 4. Send Create Post Request
      const createPostRes = await fetch(`${state.wpUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      if (!createPostRes.ok) {
        const errJson = await createPostRes.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${createPostRes.status}`);
      }

      const postData = await createPostRes.json();

      // Show Success Banner
      wpMessageBanner.className = 'message-banner success';
      wpMessageBanner.innerHTML = `
        <p><strong>Success!</strong> Post created on WordPress.</p>
        <p>Post ID: <code>${postData.id}</code> | Status: <strong>${postData.status}</strong></p>
        <p><a href="${postData.link}" target="_blank">View Post <i data-lucide="external-link" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i></a> | <a href="${state.wpUrl}/wp-admin/post.php?post=${postData.id}&action=edit" target="_blank">Edit in Dashboard <i data-lucide="edit" style="width:12px;height:12px;display:inline-block;vertical-align:middle;"></i></a></p>
      `;

      // Clear the editor & form inputs on successful send
      recipeMarkdown.value = '';
      wpPostTitle.value = '';
      wpCategory.value = '';
      wpTags.value = '';
      state.currentDraftId = null;
      state.currentSources = [];
      state.currentImages = [];
      
      // Update preview, gallery, and draft lists to match empty editor state
      renderLivePreview();
      renderInspirationImages();
      renderDraftsList();

      // Automatically hide/clear the success banner after 10 seconds
      if (state.wpMessageTimeout) clearTimeout(state.wpMessageTimeout);
      state.wpMessageTimeout = setTimeout(() => {
        wpMessageBanner.className = 'message-banner hidden';
        wpMessageBanner.innerHTML = '';
      }, 10000);

    } catch (error) {
      console.error(error);
      wpMessageBanner.className = 'message-banner error';
      wpMessageBanner.innerHTML = `<p><strong>Publishing Failed:</strong> ${error.message}</p>`;
    } finally {
      state.isPublishing = false;
      wpPublishBtn.disabled = false;
      wpPublishProgress.classList.add('hidden');
      wpMessageBanner.classList.remove('hidden');
      lucide.createIcons();
    }
  });

  // --- RECIPE INSPIRATION GALLERY ---
  function renderInspirationImages() {
    if (!inspirationImagesContainer) return;

    if (!state.currentImages || state.currentImages.length === 0) {
      inspirationImagesContainer.innerHTML = `
        <div class="empty-state">
          <p>No inspiration images loaded yet. Run a search to see visual references.</p>
        </div>
      `;
      return;
    }

    inspirationImagesContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'inspiration-image-grid';

    state.currentImages.forEach(imgUrl => {
      const card = document.createElement('div');
      card.className = 'inspiration-image-card';
      card.innerHTML = `
        <img src="${imgUrl}" alt="Recipe visual reference" onerror="this.parentElement.style.display='none';">
      `;
      grid.appendChild(card);
    });

    inspirationImagesContainer.appendChild(grid);
  }

  // --- PINTEREST PIN MAKER LOGIC ---

  // Toggle visibility of already generated pins
  if (showExistingPinsCheckbox) {
    showExistingPinsCheckbox.addEventListener('change', () => {
      renderWpPostsGrid();
    });
  }

  // Clear generated pins history
  if (clearPinHistoryBtn) {
    clearPinHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your generated Pins history? This will allow you to generate pins for all posts again.')) {
        state.generatedPinPostIds = [];
        state.generatedPinHistory = {};
        localStorage.removeItem('recipe_writer_generated_pin_post_ids');
        localStorage.removeItem('recipe_writer_generated_pin_history');
        renderWpPostsGrid();
        
        // Show success status
        pinMakerMessageBanner.className = 'message-banner success';
        pinMakerMessageBanner.innerHTML = `<p><strong>Success:</strong> Pin history cleared.</p>`;
        pinMakerMessageBanner.classList.remove('hidden');
        setTimeout(() => {
          pinMakerMessageBanner.classList.add('hidden');
        }, 3000);
      }
    });
  }

  // Distribute schedule manually across the currently generated pins
  if (distributeScheduleBtn) {
    distributeScheduleBtn.addEventListener('click', () => {
      if (!state.generatedPins || state.generatedPins.length === 0) {
        alert("No generated pins in queue to schedule.");
        return;
      }
      
      const startDateTimeVal = pinScheduleStart ? pinScheduleStart.value : '';
      const spacingHoursVal = pinScheduleSpacing ? pinScheduleSpacing.value : '1';
      
      let baseDate;
      if (startDateTimeVal) {
        baseDate = new Date(startDateTimeVal);
      } else {
        const now = new Date();
        baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      }
      let spacingHours = spacingHoursVal === 'none' ? 0 : parseInt(spacingHoursVal);
      
      state.generatedPins.forEach((pin, index) => {
        let scheduledDate = new Date(baseDate.getTime() + index * spacingHours * 60 * 60 * 1000);
        pin.publishDate = getLocalDateTimeString(scheduledDate);
      });
      
      // Re-render the pins queue list to display the updated dates
      renderPinsQueueList();
      
      // Show success notification or banner
      pinMakerMessageBanner.className = 'message-banner success';
      pinMakerMessageBanner.innerHTML = `<p><strong>Success:</strong> Distributed sequential dates/times across all pins in queue.</p>`;
      pinMakerMessageBanner.classList.remove('hidden');
      setTimeout(() => {
        pinMakerMessageBanner.classList.add('hidden');
      }, 3000);
    });
  }

  // 1. Fetch WP Posts
  fetchWpPostsBtn.addEventListener('click', async () => {
    if (!state.wpUrl || !state.wpUser || !state.wpPassword) {
      alert('Please configure your WordPress Site URL, Username, and Application Password in Settings.');
      openDrawer(settingsDrawer);
      return;
    }

    fetchWpPostsBtn.disabled = true;
    wpFetchProgress.classList.remove('hidden');
    wpPostsSelectionContainer.classList.add('hidden');
    generatedPinsContainer.classList.add('hidden');
    pinMakerMessageBanner.className = 'message-banner hidden';

    try {
      const authHeader = 'Basic ' + btoa(`${state.wpUser}:${state.wpPassword}`);
      const response = await fetch(`${state.wpUrl}/wp-json/wp/v2/posts?status=publish&_embed&per_page=20`, {
        headers: { 'Authorization': authHeader }
      });

      if (!response.ok) {
        throw new Error(`WordPress API Error: ${response.status} ${response.statusText}`);
      }

      const posts = await response.json();
      state.fetchedPosts = posts.map(post => {
        let imageUrl = '';
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
          imageUrl = post._embedded['wp:featuredmedia'][0].source_url || '';
        }
        return {
          id: post.id,
          title: post.title?.rendered || 'Untitled Post',
          status: post.status,
          link: post.link,
          imageUrl: imageUrl
        };
      });

      renderWpPostsGrid();
      wpPostsSelectionContainer.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      pinMakerMessageBanner.className = 'message-banner error';
      pinMakerMessageBanner.innerHTML = `<p><strong>Failed to fetch posts:</strong> ${err.message}</p>`;
      pinMakerMessageBanner.classList.remove('hidden');
    } finally {
      fetchWpPostsBtn.disabled = false;
      wpFetchProgress.classList.add('hidden');
    }
  });

  function renderWpPostsGrid() {
    wpPostsGrid.innerHTML = '';
    
    // Filter posts that already have pins generated unless showExistingPinsCheckbox is checked
    const showExisting = showExistingPinsCheckbox ? showExistingPinsCheckbox.checked : false;
    const postsToRender = state.fetchedPosts.filter(post => {
      const alreadyHasPin = state.generatedPinPostIds.includes(post.id);
      return showExisting || !alreadyHasPin;
    });

    if (postsToRender.length === 0) {
      wpPostsGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><p>No posts to display.</p></div>`;
      return;
    }

    postsToRender.forEach(post => {
      const alreadyHasPin = state.generatedPinPostIds.includes(post.id);
      const card = document.createElement('div');
      card.className = 'wp-post-card';
      card.setAttribute('data-id', post.id);

      const thumbHtml = post.imageUrl 
        ? `<img src="${post.imageUrl}" class="wp-post-card-thumb" alt="">` 
        : `<div class="wp-post-card-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--border-color);color:var(--text-muted);"><i data-lucide="image" style="width:18px;height:18px;"></i></div>`;

      // Badge layout
      let pinStatusHtml = '';
      if (alreadyHasPin) {
        const historyInfo = state.generatedPinHistory[post.id];
        const dateStr = historyInfo && historyInfo.createdAt 
          ? new Date(historyInfo.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
          : '';
        const dateDisplay = dateStr ? ` (${dateStr})` : '';
        pinStatusHtml = `<span class="wp-post-card-status publish" style="background: var(--accent-light); color: var(--accent-text);">Pin Created${dateDisplay}</span>`;
      } else {
        pinStatusHtml = `<span class="wp-post-card-status publish">${post.status}</span>`;
      }

      card.innerHTML = `
        <input type="checkbox" class="wp-post-card-checkbox" data-id="${post.id}">
        ${thumbHtml}
        <div class="wp-post-card-info">
          <div class="wp-post-card-title" title="${post.title}">${post.title}</div>
          <div class="wp-post-card-meta">
            ${pinStatusHtml}
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.className !== 'wp-post-card-checkbox') {
          const cb = card.querySelector('.wp-post-card-checkbox');
          cb.checked = !cb.checked;
        }
        card.classList.toggle('selected', card.querySelector('.wp-post-card-checkbox').checked);
      });

      wpPostsGrid.appendChild(card);
    });

    lucide.createIcons();
  }

  selectAllWpBtn.addEventListener('click', () => {
    document.querySelectorAll('.wp-post-card').forEach(card => {
      const cb = card.querySelector('.wp-post-card-checkbox');
      cb.checked = true;
      card.classList.add('selected');
    });
  });

  deselectAllWpBtn.addEventListener('click', () => {
    document.querySelectorAll('.wp-post-card').forEach(card => {
      const cb = card.querySelector('.wp-post-card-checkbox');
      cb.checked = false;
      card.classList.remove('selected');
    });
  });

  // 2. Generate Pin Copies with AI
  generatePinsBtn.addEventListener('click', async () => {
    const selectedCheckboxes = Array.from(wpPostsGrid.querySelectorAll('.wp-post-card-checkbox:checked'));
    if (selectedCheckboxes.length === 0) {
      alert('Please select at least one WordPress post to generate Pins.');
      return;
    }

    if (!state.apiKey) {
      alert('Please configure your OpenAI API Key first under Settings.');
      openDrawer(settingsDrawer);
      return;
    }

    const selectedPostIds = selectedCheckboxes.map(cb => parseInt(cb.getAttribute('data-id')));
    const selectedPosts = state.fetchedPosts.filter(p => selectedPostIds.includes(p.id));

    const keywordsVal = wpPostsTargetKeywords ? wpPostsTargetKeywords.value.trim() : '';

    generatePinsBtn.disabled = true;
    pinsAiProgress.classList.remove('hidden');
    generatedPinsContainer.classList.add('hidden');
    pinMakerMessageBanner.className = 'message-banner hidden';

    try {
      const userPrompt = {
        posts: selectedPosts.map(p => ({
          id: p.id,
          title: p.title
        })),
        targetKeywords: keywordsVal
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional Pinterest copywriter and food blogger. For each food blog post provided, generate a catchy, click-worthy, SEO-optimized Pinterest Pin Title (maximum 50 chars) and a storyteller-style Pin Description (maximum 250 chars) that hooks the user and encourages them to click. If "targetKeywords" are provided, you MUST organically integrate these keywords into both the "pinTitle" and "pinDescription" for search engine optimization. Also, generate 3-5 relevant hashtags based on the keywords and title, and append them at the very end of the "pinDescription". You MUST respond with a valid, raw JSON array of objects, where each object has:\n- "postId": the original post ID (number)\n- "pinTitle": a catchy Pin headline\n- "pinDescription": a storyteller description + hashtags\nDo not include markdown code block syntax (like ```json) or any explanation text. Return raw JSON.'
            },
            {
              role: 'user',
              content: JSON.stringify(userPrompt)
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      const cleanJson = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      const aiSuggestions = JSON.parse(cleanJson);

      const defaultBoardVal = pinDefaultBoard.value.trim() || 'Recipes';
      const startDateTimeVal = pinScheduleStart ? pinScheduleStart.value : '';
      const spacingHoursVal = pinScheduleSpacing ? pinScheduleSpacing.value : '1';
      
      let baseDate;
      if (startDateTimeVal) {
        baseDate = new Date(startDateTimeVal);
      } else {
        const now = new Date();
        baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
      }
      let spacingHours = spacingHoursVal === 'none' ? 0 : parseInt(spacingHoursVal);

      let domainDefault = 'MY RECIPE BLOG';
      try {
        const urlObj = new URL(state.wpUrl);
        domainDefault = urlObj.hostname.replace('www.', '').toUpperCase();
      } catch (e) {}

      // Build state list of generated pins and append to existing queue
      const newPins = selectedPosts.map((post, idx) => {
        const aiInfo = aiSuggestions.find(item => item.postId === post.id) || {};
        
        // Calculate sequential schedule based on current size of queue
        const queueOffset = state.generatedPins.length + idx;
        let scheduledDate = new Date(baseDate.getTime() + queueOffset * spacingHours * 60 * 60 * 1000);
        let publishDateStr = getLocalDateTimeString(scheduledDate);

        return {
          postId: post.id,
          wpTitle: post.title,
          wpUrl: post.link,
          imageUrl: post.imageUrl,
          pinTitle: aiInfo.pinTitle || post.title,
          pinDescription: aiInfo.pinDescription || `Check out this delicious recipe for ${post.title}!`,
          board: defaultBoardVal,
          publishDate: publishDateStr,
          layout: 'text-top',
          color: 'crimson',
          fontFamily: 'serif',
          fontSize: 24,
          badgeText: domainDefault,
          overlayPosition: 50,
          overlayOpacity: 95,
          createdAt: new Date().toISOString()
        };
      });

      state.generatedPins = [...state.generatedPins, ...newPins];

      // Update generated pins tracking list
      selectedPosts.forEach(post => {
        if (!state.generatedPinPostIds.includes(post.id)) {
          state.generatedPinPostIds.push(post.id);
        }
        state.generatedPinHistory[post.id] = {
          createdAt: new Date().toISOString()
        };
      });
      localStorage.setItem('recipe_writer_generated_pin_post_ids', JSON.stringify(state.generatedPinPostIds));
      localStorage.setItem('recipe_writer_generated_pin_history', JSON.stringify(state.generatedPinHistory));

      // Clear keywords input on success
      if (wpPostsTargetKeywords) {
        wpPostsTargetKeywords.value = '';
      }

      // Update WordPress selectable posts list grid
      renderWpPostsGrid();

      renderPinsQueueList();
      generatedPinsContainer.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      pinMakerMessageBanner.className = 'message-banner error';
      pinMakerMessageBanner.innerHTML = `<p><strong>Failed to generate Pin copy:</strong> ${err.message}</p>`;
      pinMakerMessageBanner.classList.remove('hidden');
    } finally {
      generatePinsBtn.disabled = false;
      pinsAiProgress.classList.add('hidden');
    }
  });

  function renderPinsQueueList() {
    pinsList.innerHTML = '';
    if (state.generatedPins.length === 0) {
      generatedPinsContainer.classList.add('hidden');
      return;
    }

    let domain = 'MY RECIPE BLOG';
    try {
      const urlObj = new URL(state.wpUrl);
      domain = urlObj.hostname.replace('www.', '').toUpperCase();
    } catch (e) {}

    state.generatedPins.forEach((pin, idx) => {
      const card = document.createElement('div');
      card.className = 'pin-editor-card';
      card.setAttribute('data-index', idx);

      const proxiedImg = pin.imageUrl ? `https://images.weserv.nl/?url=${encodeURIComponent(pin.imageUrl)}` : '';

      // Compute initial styles if layout is text-banner
      const isBanner = pin.layout === 'text-banner';
      const initialPosStyle = isBanner ? `top: ${pin.overlayPosition || 50}%;` : '';
      const initialBgColorHex = themeBannerBgColors[pin.color] || '#ffffff';
      const initialRgbaColor = isBanner ? hexToRgba(initialBgColorHex, (pin.overlayOpacity !== undefined ? pin.overlayOpacity : 95) / 100) : '';
      const initialBgStyle = isBanner ? `background-color: ${initialRgbaColor};` : '';
      const textBlockStyle = isBanner ? `style="${initialPosStyle} ${initialBgStyle}"` : '';

      const createdDateStr = pin.createdAt ? new Date(pin.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div class="pin-preview-container-wrapper">
          <div class="pin-preview-card layout-${pin.layout} theme-${pin.color}">
            <img src="${proxiedImg}" class="pin-preview-image" alt="" onerror="this.style.display='none';">
            <div class="pin-preview-text-block" ${textBlockStyle}>
              <div class="pin-preview-site-name" style="${pin.badgeText ? '' : 'display: none;'}">${pin.badgeText || ''}</div>
              <h4 class="pin-preview-title" style="font-family: ${pin.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-ui)'}; font-size: ${pin.fontSize}px;">${pin.pinTitle}</h4>
            </div>
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">9:16 Live Preview</span>
        </div>

        <div class="pin-editor-fields">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;">
            <span>WP Post ID: <strong>#${pin.postId}</strong></span>
            <span>Created: <strong>${createdDateStr}</strong></span>
          </div>

          <div class="pin-editor-row">
            <div class="form-group">
              <label>Layout Template</label>
              <select class="pin-layout-select" data-index="${idx}">
                <option value="text-top" ${pin.layout === 'text-top' ? 'selected' : ''}>Text Top (Image Bottom)</option>
                <option value="text-bottom" ${pin.layout === 'text-bottom' ? 'selected' : ''}>Text Bottom (Image Top)</option>
                <option value="text-banner" ${pin.layout === 'text-banner' ? 'selected' : ''}>Banner Overlay</option>
              </select>
            </div>
            <div class="form-group">
              <label>Color Palette Theme</label>
              <select class="pin-color-select" data-index="${idx}">
                <option value="crimson" ${pin.color === 'crimson' ? 'selected' : ''}>Crimson Red</option>
                <option value="navy" ${pin.color === 'navy' ? 'selected' : ''}>Navy Blue</option>
                <option value="charcoal" ${pin.color === 'charcoal' ? 'selected' : ''}>Sleek Charcoal</option>
                <option value="forest" ${pin.color === 'forest' ? 'selected' : ''}>Forest Green</option>
                <option value="amber" ${pin.color === 'amber' ? 'selected' : ''}>Golden Amber</option>
              </select>
            </div>
          </div>

          <div class="pin-editor-row banner-overlay-controls" style="${pin.layout === 'text-banner' ? '' : 'display: none;'}">
            <div class="form-group">
              <label>Overlay Position (Vertical)</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="range" class="pin-overlay-position-input" data-index="${idx}" min="10" max="90" value="${pin.overlayPosition || 50}" style="flex: 1; accent-color: var(--accent); cursor: pointer;">
                <span class="pin-overlay-position-val" style="font-size: 12px; font-weight: 600; width: 36px; text-align: right;">${pin.overlayPosition || 50}%</span>
              </div>
            </div>
            <div class="form-group">
              <label>Overlay Opacity</label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="range" class="pin-overlay-opacity-input" data-index="${idx}" min="50" max="100" value="${pin.overlayOpacity !== undefined ? pin.overlayOpacity : 95}" style="flex: 1; accent-color: var(--accent); cursor: pointer;">
                <span class="pin-overlay-opacity-val" style="font-size: 12px; font-weight: 600; width: 36px; text-align: right;">${pin.overlayOpacity !== undefined ? pin.overlayOpacity : 95}%</span>
              </div>
            </div>
          </div>


          <div class="pin-editor-row">
            <div class="form-group">
              <label>Font Style</label>
              <select class="pin-font-family-select" data-index="${idx}">
                <option value="serif" ${pin.fontFamily === 'serif' ? 'selected' : ''}>Elegant Serif (Lora)</option>
                <option value="sans-serif" ${pin.fontFamily === 'sans-serif' ? 'selected' : ''}>Modern Sans-Serif (Jakarta)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Title Size (px)</label>
              <input type="number" class="pin-font-size-input" data-index="${idx}" value="${pin.fontSize}" min="16" max="36" step="1">
            </div>
            <div class="form-group">
              <label>Site Badge Text</label>
              <input type="text" class="pin-badge-input" data-index="${idx}" value="${pin.badgeText}" placeholder="Leave empty to remove" style="text-transform: uppercase;">
            </div>
          </div>

          <div class="form-group">
            <label>Pin Title</label>
            <input type="text" class="pin-title-input" data-index="${idx}" value="${pin.pinTitle}" maxlength="100">
          </div>

          <div class="form-group">
            <label>Pin Description</label>
            <textarea class="pin-desc-input" data-index="${idx}" rows="4" maxlength="500">${pin.pinDescription}</textarea>
          </div>

          <div class="pin-editor-row">
            <div class="form-group">
              <label>Destination Link</label>
              <input type="url" class="pin-link-input" data-index="${idx}" value="${pin.wpUrl}">
            </div>
            <div class="form-group">
              <label>Pinterest Board</label>
              <input type="text" class="pin-board-input" data-index="${idx}" value="${pin.board}">
            </div>
            <div class="form-group">
              <label>Publish Date & Time</label>
              <input type="datetime-local" class="pin-date-input" data-index="${idx}" value="${pin.publishDate}">
            </div>
          </div>

          <div class="pin-card-actions">
            <button class="action-btn download-pin-image-btn" data-index="${idx}">
              <i data-lucide="download"></i>
              <span>Download Pin Image</span>
            </button>
            <button class="icon-text-btn secondary remove-pin-btn" data-index="${idx}" style="margin-left:auto;">
              <i data-lucide="trash-2"></i>
              <span>Remove</span>
            </button>
          </div>
        </div>
      `;

      // Wire interactive updates
      const layoutSelect = card.querySelector('.pin-layout-select');
      const colorSelect = card.querySelector('.pin-color-select');
      const fontFamilySelect = card.querySelector('.pin-font-family-select');
      const fontSizeInput = card.querySelector('.pin-font-size-input');
      const badgeInput = card.querySelector('.pin-badge-input');

      const titleInput = card.querySelector('.pin-title-input');
      const descInput = card.querySelector('.pin-desc-input');
      const linkInput = card.querySelector('.pin-link-input');
      const boardInput = card.querySelector('.pin-board-input');
      const dateInput = card.querySelector('.pin-date-input');

      const previewCard = card.querySelector('.pin-preview-card');
      const previewBadge = card.querySelector('.pin-preview-site-name');
      const previewTitle = card.querySelector('.pin-preview-title');
      const previewTextBlock = card.querySelector('.pin-preview-text-block');

      // Sliders elements
      const bannerControls = card.querySelector('.banner-overlay-controls');
      const overlayPosInput = card.querySelector('.pin-overlay-position-input');
      const overlayPosVal = card.querySelector('.pin-overlay-position-val');
      const overlayOpacityInput = card.querySelector('.pin-overlay-opacity-input');
      const overlayOpacityVal = card.querySelector('.pin-overlay-opacity-val');

      function updateBannerPreview() {
        if (pin.layout === 'text-banner' && previewTextBlock) {
          previewTextBlock.style.top = `${pin.overlayPosition || 50}%`;
          const bgColorHex = themeBannerBgColors[pin.color] || '#ffffff';
          const opacityVal = pin.overlayOpacity !== undefined ? pin.overlayOpacity : 95;
          previewTextBlock.style.backgroundColor = hexToRgba(bgColorHex, opacityVal / 100);
        } else if (previewTextBlock) {
          previewTextBlock.style.top = '';
          previewTextBlock.style.backgroundColor = '';
        }
      }

      layoutSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        pin.layout = val;
        previewCard.className = `pin-preview-card layout-${val} theme-${pin.color}`;
        if (val === 'text-banner') {
          bannerControls.style.display = '';
        } else {
          bannerControls.style.display = 'none';
        }
        updateBannerPreview();
      });

      colorSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        pin.color = val;
        previewCard.className = `pin-preview-card layout-${pin.layout} theme-${val}`;
        updateBannerPreview();
      });

      overlayPosInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 50;
        pin.overlayPosition = val;
        overlayPosVal.innerText = `${val}%`;
        updateBannerPreview();
      });

      overlayOpacityInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 95;
        pin.overlayOpacity = val;
        overlayOpacityVal.innerText = `${val}%`;
        updateBannerPreview();
      });

      fontFamilySelect.addEventListener('change', (e) => {
        const val = e.target.value;
        pin.fontFamily = val;
        previewTitle.style.fontFamily = val === 'serif' ? 'var(--font-serif)' : 'var(--font-ui)';
      });

      fontSizeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 24;
        pin.fontSize = val;
        previewTitle.style.fontSize = `${val}px`;
      });

      badgeInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        pin.badgeText = val;
        previewBadge.innerText = val.toUpperCase();
        previewBadge.style.display = val ? '' : 'none';
      });

      titleInput.addEventListener('input', (e) => {
        const val = e.target.value;
        pin.pinTitle = val;
        previewTitle.innerText = val;
      });

      descInput.addEventListener('input', (e) => {
        pin.pinDescription = e.target.value;
      });

      linkInput.addEventListener('input', (e) => {
        pin.wpUrl = e.target.value;
      });

      boardInput.addEventListener('input', (e) => {
        pin.board = e.target.value;
      });

      dateInput.addEventListener('input', (e) => {
        pin.publishDate = e.target.value;
      });

      // Actions
      card.querySelector('.download-pin-image-btn').addEventListener('click', () => {
        downloadPinImage(pin);
      });

      card.querySelector('.remove-pin-btn').addEventListener('click', () => {
        state.generatedPins.splice(idx, 1);
        renderPinsQueueList();
      });

      pinsList.appendChild(card);
    });

    lucide.createIcons();
  }

  // 3. Canvas Renderer Engine
  async function downloadPinImage(item) {
    const canvas = document.createElement('canvas');
    canvas.width = 735;
    canvas.height = 1102;
    const ctx = canvas.getContext('2d');

    // Theme values matching CSS
    const themeColors = {
      crimson: { bg: '#800020', text: '#ffffff', accent: '#fecdd3', bannerBg: '#fff0f3', bannerText: '#800020' },
      navy: { bg: '#0F1E36', text: '#ffffff', accent: '#dbeafe', bannerBg: '#f0f4f8', bannerText: '#0F1E36' },
      charcoal: { bg: '#212529', text: '#ffffff', accent: '#f1f3f5', bannerBg: '#f8f9fa', bannerText: '#212529' },
      forest: { bg: '#1E352F', text: '#ffffff', accent: '#d1fae5', bannerBg: '#f1f7f4', bannerText: '#1E352F' },
      amber: { bg: '#C67817', text: '#ffffff', accent: '#fef3c7', bannerBg: '#fffdf5', bannerText: '#C67817' }
    };
    const colors = themeColors[item.color] || themeColors.crimson;

    const badgeTextVal = (item.badgeText || '').trim().toUpperCase();
    const titleFontFamily = item.fontFamily === 'sans-serif' ? '"Plus Jakarta Sans", sans-serif' : '"Lora", Georgia, serif';
    const canvasFontSize = Math.round((item.fontSize || 24) * 3.06);
    const titleLineHeight = Math.round(canvasFontSize * 1.25);

    // Load fonts properly: we should ensure fonts are loaded
    await document.fonts.ready;

    // Fetch image with proxy to avoid CORS taint
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      if (item.imageUrl) {
        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(item.imageUrl)}`;
      } else {
        resolve();
      }
    });

    // Drawing helper functions
    function drawCoverImage(ctx, img, x, y, w, h) {
      if (!img.complete || !img.naturalWidth) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(x, y, w, h);
        return;
      }
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const imgRatio = imgW / imgH;
      const targetRatio = w / h;

      let sx, sy, sw, sh;
      if (imgRatio > targetRatio) {
        sh = imgH;
        sw = imgH * targetRatio;
        sx = (imgW - sw) / 2;
        sy = 0;
      } else {
        sw = imgW;
        sh = imgW / targetRatio;
        sx = 0;
        sy = (imgH - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }

    function getLines(ctx, text, maxWidth) {
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0] || '';

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
          currentLine += ' ' + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    }

    function drawRoundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function drawTextBlock(ctx, badgeText, titleText, colors, yStart, yEnd, isBanner) {
      const blockHeight = yEnd - yStart;
      const centerX = 367.5;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Title config
      ctx.font = `bold ${canvasFontSize}px ${titleFontFamily}`;
      const maxWidth = isBanner ? 630 : 640;
      const lines = getLines(ctx, titleText, maxWidth);
      const totalTitleHeight = lines.length * titleLineHeight;

      // Domain config
      let domainHeight = 0;
      let gap = 0;
      if (badgeText) {
        domainHeight = 36;
        gap = 36;
      }
      const totalContentHeight = domainHeight + gap + totalTitleHeight;
      
      let currentY = yStart + (blockHeight - totalContentHeight) / 2;

      // Draw Domain / Badge if present
      if (badgeText) {
        ctx.fillStyle = isBanner ? colors.bannerText : colors.accent;
        ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(badgeText.split('').join(' '), centerX, currentY);
        currentY += domainHeight + gap;
      }

      // Title
      ctx.fillStyle = isBanner ? colors.bannerText : colors.text;
      ctx.font = `bold ${canvasFontSize}px ${titleFontFamily}`;
      lines.forEach((line) => {
        ctx.fillText(line, centerX, currentY);
        currentY += titleLineHeight;
      });
    }

    // Clean canvas
    ctx.clearRect(0, 0, 735, 1102);

    if (item.layout === 'text-top') {
      // Background for text
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, 735, 441);
      
      // Image
      drawCoverImage(ctx, img, 0, 441, 735, 661);
      
      // Text
      drawTextBlock(ctx, badgeTextVal, item.pinTitle, colors, 0, 441, false);

    } else if (item.layout === 'text-bottom') {
      // Image
      drawCoverImage(ctx, img, 0, 0, 735, 661);
      
      // Background for text
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 661, 735, 441);
      
      // Text
      drawTextBlock(ctx, badgeTextVal, item.pinTitle, colors, 661, 1102, false);

    } else if (item.layout === 'text-banner') {
      // Image fills background
      drawCoverImage(ctx, img, 0, 0, 735, 1102);

      // Measure layout for banner centering
      ctx.font = `bold ${canvasFontSize}px ${titleFontFamily}`;
      const lines = getLines(ctx, item.pinTitle, 630);
      const totalTitleHeight = lines.length * titleLineHeight;
      
      let domainHeight = 0;
      let gap = 0;
      if (badgeTextVal) {
        domainHeight = 36;
        gap = 36;
      }
      const padding = 40;
      const bannerHeight = domainHeight + gap + totalTitleHeight + padding * 2;
      
      const verticalPos = item.overlayPosition !== undefined ? item.overlayPosition / 100 : 0.50;
      let bannerY = (1102 * verticalPos) - (bannerHeight / 2);
      if (bannerY < 0) bannerY = 0;
      if (bannerY + bannerHeight > 1102) bannerY = 1102 - bannerHeight;

      // Draw full-width banner box
      const opacityVal = item.overlayOpacity !== undefined ? item.overlayOpacity / 100 : 0.95;
      ctx.fillStyle = hexToRgba(colors.bannerBg, opacityVal);
      ctx.fillRect(0, bannerY, 735, bannerHeight);

      // Border lines on top and bottom of the banner
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, bannerY);
      ctx.lineTo(735, bannerY);
      ctx.moveTo(0, bannerY + bannerHeight);
      ctx.lineTo(735, bannerY + bannerHeight);
      ctx.stroke();

      // Text inside banner
      drawTextBlock(ctx, badgeTextVal, item.pinTitle, colors, bannerY + padding, bannerY + bannerHeight - padding, true);
    }

    // Download PNG
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${item.pinTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-pin.png`;
      link.click();
    } catch (err) {
      alert("Security restriction: Could not download the canvas image due to cross-origin images. The Pinterest CSV can still be downloaded.");
      console.error(err);
    }
  }

  // 4. Download Bulk CSV
  downloadAllCsvBtn.addEventListener('click', () => {
    if (state.generatedPins.length === 0) {
      alert("No pins generated to export.");
      return;
    }

    function escapeCsvValue(val) {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    function formatCsvPublishDate(dateStr) {
      if (!dateStr) return '';
      if (dateStr.includes('T') && dateStr.length === 16) {
        return `${dateStr}:00`;
      }
      return dateStr;
    }

    const csvContent = [
      ['Title', 'Description', 'Link', 'Media URL', 'Pinterest board', 'Publish date'].map(escapeCsvValue).join(','),
      ...state.generatedPins.map(pin => [
        pin.pinTitle,
        pin.pinDescription,
        pin.wpUrl,
        pin.imageUrl,
        pin.board,
        formatCsvPublishDate(pin.publishDate)
      ].map(escapeCsvValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pinterest-bulk-upload.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });

});
