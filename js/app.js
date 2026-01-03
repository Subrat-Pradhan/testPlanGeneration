/**
 * Main Application Logic
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
        console.error('PDF.js library not loaded');
    }

    // Configure marked.js for table support (GFM mode)
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            gfm: true, // Enable GitHub Flavored Markdown (includes tables)
            breaks: true, // Convert line breaks to <br>
            headerIds: false,
            mangle: false
        });
    }

    // State management
    let apiProvider = sessionStorage.getItem('ai_provider') || 'gemini';
    let apiKey = sessionStorage.getItem(`${apiProvider}_api_key`) || '';
    let testers = [];
    const tokenLimit = 16000; // Fixed token limit

    // Provider configurations
    const providers = {
        openai: {
            name: 'OpenAI',
            keyPrefix: 'sk-',
            placeholder: 'sk-...',
            keyUrl: 'https://platform.openai.com/account/api-keys',
            validate: (key) => key.startsWith('sk-')
        },
        gemini: {
            name: 'Google Gemini',
            keyPrefix: 'AIza',
            placeholder: 'AIza...',
            keyUrl: 'https://makersuite.google.com/app/apikey',
            validate: (key) => key.startsWith('AIza')
        }
    };

    // DOM Elements
    const apiProviderSelect = document.getElementById('apiProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const apiKeyValidation = document.getElementById('apiKeyValidation');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const addTesterBtn = document.getElementById('addTester');
    const testersList = document.getElementById('testersList');
    const noTesters = document.getElementById('noTesters');
    const generateBtn = document.getElementById('generateBtn');
    const output = document.getElementById('output');
    const downloadPdfBtn = document.getElementById('downloadPdf');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Set minimum date to today for date inputs
    const today = new Date().toISOString().split('T')[0];
    startDateInput.setAttribute('min', today);
    endDateInput.setAttribute('min', today);

    // Validate end date is after start date
    startDateInput.addEventListener('change', (e) => {
        if (endDateInput.value && e.target.value > endDateInput.value) {
            endDateInput.value = '';
        }
        endDateInput.setAttribute('min', e.target.value || today);
    });

    endDateInput.addEventListener('change', (e) => {
        if (startDateInput.value && e.target.value < startDateInput.value) {
            alert('End date must be after start date');
            e.target.value = '';
        }
    });

    // Load saved provider and API key
    apiProviderSelect.value = apiProvider;
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }
    updatePlaceholder();

    // Update placeholder when provider changes
    apiProviderSelect.addEventListener('change', (e) => {
        apiProvider = e.target.value;
        sessionStorage.setItem('ai_provider', apiProvider);
        // Load provider-specific key
        apiKey = sessionStorage.getItem(`${apiProvider}_api_key`) || '';
        apiKeyInput.value = apiKey;
        updatePlaceholder();
        handleApiKeyValidation(apiKey);
        checkGenerateButtonState();
    });

    function updatePlaceholder() {
        const provider = providers[apiProvider];
        apiKeyInput.placeholder = provider.placeholder;
    }

    /**
     * Handles UI updates for API key validation.
     * Uses validateApiKey from utils.js
     * @param {string} key 
     */
    function handleApiKeyValidation(key) {
        if (key.length === 0) {
            apiKeyValidation.classList.add('hidden');
            apiKeyInput.classList.remove('border-red-500', 'border-green-500', 'border-slate-200');
            apiKeyInput.classList.add('border-slate-200');
            return false;
        }

        const provider = providers[apiProvider];
        apiKeyValidation.classList.remove('hidden');
        apiKeyInput.classList.remove('border-slate-200', 'border-red-500', 'border-green-500');

        if (validateApiKey(key, provider)) {
            apiKeyValidation.textContent = `✅ Valid ${provider.name} API key format`;
            apiKeyValidation.className = 'text-xs mt-2 text-green-600 font-medium';
            apiKeyInput.classList.add('border-green-500');
            return true;
        } else {
            apiKeyValidation.textContent = `⚠️ Invalid format! ${provider.name} keys start with "${provider.keyPrefix}"`;
            apiKeyValidation.className = 'text-xs mt-2 text-red-600 font-medium';
            apiKeyInput.classList.add('border-red-500');
            return false;
        }
    }

    // Real-time API key validation
    apiKeyInput.addEventListener('input', (e) => {
        handleApiKeyValidation(e.target.value.trim());
    });

    // Save API Key
    saveApiKeyBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }

        const provider = providers[apiProvider];

        // Validate API key format using utils
        if (!validateApiKey(apiKey, provider)) {
            alert(`⚠️ Invalid API key format!\n\n${provider.name} API keys should start with "${provider.keyPrefix}".\n\nYou entered a key starting with "${apiKey.substring(0, 7)}..."\n\nPlease get your ${provider.name} API key from: ${provider.keyUrl}`);
            apiKeyInput.focus();
            return;
        }

        sessionStorage.setItem(`${apiProvider}_api_key`, apiKey);
        sessionStorage.setItem('ai_provider', apiProvider);
        alert(`✅ ${provider.name} API key saved successfully!`);
        checkGenerateButtonState();
    });

    // File Upload Handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Update text to show file name
        const fileNameEl = fileName.querySelector('span') || fileName;
        fileNameEl.textContent = file.name;

        // Re-add icon if it was overwritten or ensure structure
        if (!fileName.querySelector('svg')) {
            fileName.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class="truncate">${file.name}</span>`;
        } else {
            fileName.querySelector('span').textContent = file.name;
        }

        fileName.classList.remove('hidden');
        checkGenerateButtonState();
    });

    // Timeline Logic
    const timelineStats = document.getElementById('timelineStats');
    const totalDaysEl = document.getElementById('totalDays');
    const workingDaysEl = document.getElementById('workingDays');

    function updateTimelineStats() {
        const start = startDateInput.value;
        const end = endDateInput.value;

        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);

            if (endDate >= startDate) {
                // Calculate total days (inclusive)
                const diffTime = Math.abs(endDate - startDate);
                const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                // Calculate working days using util function
                const workingDays = calculateWorkingDays(startDate, endDate);

                totalDaysEl.textContent = totalDays;
                workingDaysEl.textContent = workingDays;
                timelineStats.classList.remove('hidden');
                timelineStats.classList.add('grid');
            } else {
                timelineStats.classList.add('hidden');
                timelineStats.classList.remove('grid');
            }
        } else {
            timelineStats.classList.add('hidden');
            timelineStats.classList.remove('grid');
        }
    }

    startDateInput.addEventListener('change', updateTimelineStats);
    endDateInput.addEventListener('change', updateTimelineStats);

    // Add Tester
    addTesterBtn.addEventListener('click', () => {
        const testerId = Date.now();
        testers.push({
            id: testerId,
            experience: 0,
            specialization: 'Manual'
        });
        renderTesters();
        checkGenerateButtonState();
    });

    // Render Testers
    function renderTesters() {
        // Conditional Scroll Logic: only scroll if > 2 testers
        if (testers.length > 2) {
            testersList.classList.add('overflow-y-auto', 'max-h-[500px]', 'no-scrollbar', 'pr-2');
        } else {
            testersList.classList.remove('overflow-y-auto', 'max-h-[500px]', 'no-scrollbar', 'pr-2');
        }

        if (testers.length === 0) {
            noTesters.classList.remove('hidden');
            testersList.innerHTML = '';
            return;
        }

        noTesters.classList.add('hidden');
        testersList.innerHTML = testers.map(tester => `
        <div class="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 hover:border-white/20 transition-colors backdrop-blur-sm">
            <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-white">${tester.specialization} Tester ${testers.indexOf(tester) + 1}</span>
                <button 
                    onclick="removeTester(${tester.id})" 
                    class="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide transition-colors"
                >
                    Remove
                </button>
            </div>
            <div>
                <label class="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">Specialization</label>
                <div class="relative">
                    <select 
                        onchange="updateTesterSpecialization(${tester.id}, this.value)"
                        class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 outline-none appearance-none transition-all cursor-pointer"
                    >
                        <option value="Manual" ${tester.specialization === 'Manual' ? 'selected' : ''}>Manual Testing</option>
                        <option value="Automation" ${tester.specialization === 'Automation' ? 'selected' : ''}>Automation</option>
                        <option value="Fresher" ${tester.specialization === 'Fresher' ? 'selected' : ''}>Junior / Fresher</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-white/60">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
            <div>
                <label class="block text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                    Experience: <span id="exp-${tester.id}" class="text-violet-300 font-bold">${tester.experience}</span> Years
                </label>
                <div class="experience-bar" onclick="updateTesterExperienceFromBar(${tester.id}, event)">
                    <div class="experience-bar-fill" style="width: ${(tester.experience / 5) * 100}%">
                        ${tester.experience > 0 ? tester.experience + 'yr' : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    }

    // Update Tester Experience
    window.updateTesterExperience = function (id, value) {
        const tester = testers.find(t => t.id === id);
        if (tester) {
            tester.experience = parseInt(value);
            document.getElementById(`exp-${id}`).textContent = value;
        }
    };

    // Update Tester Experience from Progress Bar Click
    window.updateTesterExperienceFromBar = function (id, event) {
        const bar = event.currentTarget;
        const rect = bar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;
        const experience = Math.round(percentage * 5);

        const tester = testers.find(t => t.id === id);
        if (tester) {
            tester.experience = Math.max(0, Math.min(5, experience));
            renderTesters();
        }
    };

    // Update Tester Specialization
    window.updateTesterSpecialization = function (id, value) {
        const tester = testers.find(t => t.id === id);
        if (tester) {
            tester.specialization = value;
            renderTesters();
        }
    };

    // Remove Tester
    window.removeTester = function (id) {
        testers = testers.filter(t => t.id !== id);
        renderTesters();
        checkGenerateButtonState();
    };

    // Check if Generate button should be enabled
    function checkGenerateButtonState() {
        const hasFile = fileInput.files.length > 0;
        const hasApiKey = apiKey.trim().length > 0;
        const hasTesters = testers.length > 0;

        generateBtn.disabled = !(hasFile && hasApiKey && hasTesters);
    }

    // Generate Test Plan
    generateBtn.addEventListener('click', async () => {
        if (!apiKey || fileInput.files.length === 0 || testers.length === 0) {
            alert('Please fill in all required fields: API Key, Requirements Document, and at least one Tester');
            return;
        }

        loadingOverlay.classList.remove('hidden');
        output.innerHTML = '';

        try {
            // Extract text from file using util
            const file = fileInput.files[0];
            const requirementText = await extractTextFromFile(file);
            const startDateValue = document.getElementById('startDate').value;
            const endDateValue = document.getElementById('endDate').value;
            let eta = 'Not specified';
            if (startDateValue && endDateValue) {
                eta = `${startDateValue} to ${endDateValue}`;
            } else if (startDateValue) {
                eta = `From ${startDateValue}`;
            } else if (endDateValue) {
                eta = `Until ${endDateValue}`;
            }

            // Construct prompt
            const resourcesText = testers.map((tester, idx) =>
                `${tester.specialization} Tester ${idx + 1}: ${tester.experience} years of experience, Specialization: ${tester.specialization}`
            ).join('\n');

            const prompt = `You are an experienced QA Lead. Generate a comprehensive Test Plan based on the following requirements.

REQUIREMENTS DOCUMENT:
${requirementText}

EXECUTION TIMELINE:
${eta}

TEST TEAM:
${resourcesText}

Please generate a detailed Test Plan in Markdown format that includes:

1. **Test Plan Overview** - Brief introduction and purpose

2. **Test Scope and Objectives** - What will be tested and goals

3. **Test Strategy** - Overall approach and methodology

4. **Test Environment Requirements** - Infrastructure and setup needs

5. **Test Deliverables** - List of documents and artifacts

6. **Resource Allocation** - MUST be presented as a TABLE with columns:
   - Tester Name/ID
   - Years of Experience
   - Specialization
   - Assigned Tasks/Modules (keep concise, use bullet points if needed)
   - Estimated Effort
   - Responsibilities (brief summary)

7. **Task Allocation** - MUST be presented as a TABLE with columns:
   - Task ID
   - Task Description (keep brief, 1-2 sentences max)
   - Assigned Tester
   - Priority
   - Status
   - Dependencies (brief)
   - Estimated Duration

8. **Test Schedule/Timeline** - MUST be presented as a TABLE with columns:
   - Phase/Milestone
   - Start Date
   - End Date
   - Duration
   - Responsible Tester
   - Deliverables (brief list)

9. **End to End Flow Diagram** - MUST be a Mermaid.js flowchart (graph TD/LR) depicting the complete testing flow.

10. **Risk Assessment** - MUST be presented as a TABLE with columns:
   - Risk ID
   - Risk Description (concise)
   - Probability (High/Medium/Low)
   - Impact (High/Medium/Low)
   - Mitigation Strategy (brief)
   - Owner

11. **Entry and Exit Criteria** - Clear criteria for starting and completing testing


IMPORTANT FORMATTING REQUIREMENTS:
- Use Markdown tables for ALL sections that involve structured data (Resource Allocation, Task Allocation, Schedule, Risk Assessment)
- Keep table cells CONCISE - maximum 2-3 sentences per cell. Use bullet points within cells if needed.
- Use proper Markdown table syntax with headers
- Ensure tables are well-formatted and readable with proper line breaks
- Each table row should be on a separate line in the markdown
- Add visual separators and clear section headers
- Use bullet points and numbered lists where appropriate
- Be specific about task assignments to each tester based on their experience and specialization
- STRICTLY assign tasks based on specialization (e.g. Automation Testers for scripting, Manual Testers for test case creation/execution)
- DO NOT create extremely long table cells - keep content brief and to the point

MARKDOWN TABLE FORMAT EXAMPLE (use this exact syntax - each row on a new line):
| Column 1 | Column 2 | Column 3 |
|----------|---------|----------|
| Data 1   | Data 2  | Data 3   |
| Data 4   | Data 5  | Data 6   |

CRITICAL TABLE FORMATTING RULES:
1. You MUST use the pipe (|) and dash (-) syntax shown above for ALL tables
2. Each table row MUST be on a separate line
3. Keep cell content brief - if a cell needs more detail, use bullet points or keep it to 1-2 sentences
4. Do NOT use HTML tables, ASCII art, or any other format
5. Do NOT create tables with extremely long single-line cells
6. Ensure proper line breaks between table rows

Format the output as professional, well-structured Markdown with emphasis on tables for better readability.`;

            // Call AI API based on selected provider
            let markdownContent;
            const provider = providers[apiProvider];

            if (apiProvider === 'openai') {
                // OpenAI API call
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an expert QA Lead with extensive experience in creating comprehensive test plans. Always respond in Markdown format. When creating the test plan, use Markdown tables for resource allocation and use Mermaid.js syntax for the testing workflow or timeline diagrams. CRITICAL: Use Markdown tables for Resource Allocation, Task Allocation, Test Schedule, and Risk Assessment sections. Format tables properly with clear headers and detailed information.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: Math.min(tokenLimit, 16384) // OpenAI GPT-4 max is 16,384
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    let errorMessage = errorData.error?.message || 'Failed to generate test plan';

                    if (errorMessage.includes('Incorrect API key') || errorMessage.includes('Invalid API key') || errorMessage.includes('API key')) {
                        errorMessage = `🔑 API Key Error\n\n${errorMessage}\n\n⚠️ Make sure you're using a valid ${provider.name} API key.\n\nGet your API key from: ${provider.keyUrl}`;
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();
                markdownContent = data.choices[0].message.content;

                // Check if response was truncated
                if (data.choices[0].finish_reason === 'length') {
                    markdownContent += '\n\n---\n\n⚠️ **Note:** Response was truncated due to length limits. Some content may be incomplete.';
                }
            } else if (apiProvider === 'gemini') {
                // Google Gemini API call - try multiple models with fallback
                // Using latest models (2.5 series) as 1.5 models are deprecated
                const geminiModels = [
                    { name: 'gemini-2.5-pro-latest', version: 'v1beta' },
                    { name: 'gemini-2.5-flash', version: 'v1beta' },
                    { name: 'gemini-pro', version: 'v1' },
                    { name: 'gemini-1.5-flash', version: 'v1beta' },
                    { name: 'gemini-pro', version: 'v1beta' }
                ];

                let lastError = null;
                let response = null;
                let data = null;

                for (const model of geminiModels) {
                    try {
                        response = await fetch(`https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [{
                                        text: `You are an expert QA Lead with extensive experience in creating comprehensive test plans. Always respond in Markdown format. When creating the test plan, use Markdown tables for resource allocation and use Mermaid.js syntax for the testing workflow or timeline diagrams. CRITICAL: Use Markdown tables for Resource Allocation, Task Allocation, Test Schedule, and Risk Assessment sections. Format tables properly with clear headers and detailed information.\n\n${prompt}`
                                    }]
                                }],
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: Math.min(tokenLimit, 32000) // Gemini max is typically 32K
                                }
                            })
                        });

                        if (response.ok) {
                            data = await response.json();
                            break; // Success, exit loop
                        } else {
                            const errorData = await response.json();
                            lastError = errorData.error?.message || 'Failed to generate test plan';
                            // Continue to next model if this one fails
                        }
                    } catch (err) {
                        lastError = err.message;
                        // Continue to next model
                    }
                }

                if (!response || !response.ok || !data) {
                    let errorMessage = lastError || 'Failed to generate test plan with any available Gemini model';

                    if (errorMessage.includes('API key') || errorMessage.includes('invalid') || errorMessage.includes('permission') || errorMessage.includes('401') || errorMessage.includes('403')) {
                        errorMessage = `🔑 API Key Error\n\n${errorMessage}\n\n⚠️ Make sure you're using a valid ${provider.name} API key.\n\nGet your API key from: ${provider.keyUrl}`;
                    } else {
                        errorMessage = `⚠️ Model Error\n\n${errorMessage}\n\n💡 Tried multiple Gemini models but none worked. Please check:\n- Your API key is valid and has proper permissions\n- Check available models at: https://ai.google.dev/models/gemini\n- Ensure Gemini API is enabled in your Google Cloud Console`;
                    }

                    throw new Error(errorMessage);
                }

                markdownContent = data.candidates[0].content.parts[0].text;

                // Check if response was truncated
                if (data.candidates[0].finishReason === 'MAX_TOKENS' || data.candidates[0].finishReason === 'OTHER') {
                    markdownContent += '\n\n---\n\n⚠️ **Note:** Response was truncated due to token limits. Some content may be incomplete. Consider regenerating with more specific requirements.';
                }
            }

            // Post-process markdown to fix table formatting issues
            const lines = markdownContent.split('\n');
            let fixedContent = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if this line looks like a table row but is extremely long
                if (line.includes('|') && line.length > 1000) {
                    console.warn('Found extremely long table row at line', i, 'length:', line.length);
                    fixedContent.push(line);
                } else {
                    fixedContent.push(line);
                }
            }

            markdownContent = fixedContent.join('\n');

            // Render markdown with table & Mermaid diagram support
            let htmlContent;
            try {
                htmlContent = marked.parse(markdownContent, { gfm: true });
                // Wrap all tables in a scrollable container
                htmlContent = htmlContent.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, content) => {
                    return `<div class="table-wrapper"><table${attrs}>${content}</table></div>`;
                });
                output.innerHTML = htmlContent;
                // --- Mermaid.js rendering logic ---
                let mermaidBlocks = output.querySelectorAll('pre code.language-mermaid, pre.mermaid');
                mermaidBlocks.forEach(block => {
                    const code = block.textContent;
                    const container = document.createElement('div');
                    container.className = 'mermaid';
                    container.textContent = code;
                    block.parentNode.replaceWith(container);
                });
                // Render Mermaid diagrams
                if (window.mermaid) { window.mermaid.run?.(); }
                downloadPdfBtn.classList.remove('hidden');
                // Show AI disclaimer
                document.getElementById('aiDisclaimer').classList.remove('hidden');
            } catch (parseError) {
                console.error('Markdown parsing error:', parseError);
                // Fallback: display raw markdown with code formatting
                output.innerHTML = `<pre class="bg-slate-100 p-4 rounded-lg overflow-auto">${markdownContent}</pre>`;
                downloadPdfBtn.classList.remove('hidden');
                // Show AI disclaimer
                document.getElementById('aiDisclaimer').classList.remove('hidden');
            }

        } catch (error) {
            const errorText = error.message.replace(/\n/g, '<br>');
            const provider = providers[apiProvider];
            output.innerHTML = `
                <div class="bg-red-50 border border-red-100 rounded-xl p-6 shadow-sm">
                    <h3 class="text-red-900 font-bold mb-3 text-lg flex items-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        Generation Failed
                    </h3>
                    <p class="text-red-700 whitespace-pre-line text-sm leading-relaxed">${errorText}</p>
                    <div class="mt-4 p-4 bg-white/50 rounded-lg border border-red-100">
                        <p class="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Troubleshooting</p>
                        <ul class="text-sm text-red-700 space-y-1 list-disc list-inside">
                            <li>Go to <a href="${provider.keyUrl}" target="_blank" class="underline font-medium hover:text-red-900">${provider.name} API Keys</a></li>
                            <li>Check if your API key is valid and has credits</li>
                            <li>Ensure you selected the correct AI Provider above</li>
                        </ul>
                    </div>
                </div>
            `;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });


    // --- PDF Printing Logic ---

    // Download PDF Button Handler - Using iframe print approach
    downloadPdfBtn.addEventListener('click', async () => {
        const element = output; // The content we want to print
        const originalTitle = document.title;
        const filename = "AI_Test_Plan_" + new Date().toISOString().slice(0, 10) + ".pdf";

        // Set document title for PDF
        document.title = filename.replace('.pdf', '');

        // Get team info for cover page
        const projectTeam = testers.length > 0
            ? testers.map((t, i) => `${t.specialization} Tester ${i + 1} (${t.experience}y)`).join(', ')
            : "Not specified";

        // Create a hidden iframe for printing
        const printFrame = document.createElement("iframe");
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "0";
        printFrame.id = "printFrame";
        document.body.appendChild(printFrame);

        // Get clean content clone
        const contentClone = element.cloneNode(true);
        const cleanContent = contentClone.innerHTML;

        // Get CSS styles using util function
        const cssRules = extractCSSRules();

        // Write content to the iframe
        const frameDoc = printFrame.contentDocument || printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename.replace('.pdf', '')}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    /* Inlined CSS rules */
                    ${cssRules}

                    /* Print-specific styles */
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            margin: 0;
                            padding: 0;
                        }

                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        @page {
                            size: A4;
                            margin: 15mm;
                        }

                        .page-break {
                            page-break-after: always;
                        }

                        /* Avoid breaks inside elements */
                        h1, h2, h3, h4, h5, h6 {
                            page-break-after: avoid;
                            page-break-inside: avoid;
                        }

                        table, figure, img {
                            page-break-inside: avoid;
                        }

                        ul, ol {
                            page-break-inside: avoid;
                        }
                    }

                    /* General body styles */
                    body {
                        font-family: 'Inter', sans-serif;
                        margin: 0;
                        padding: 0;
                        background: white;
                        color: #1e293b;
                        font-size: 11pt;
                        line-height: 1.6;
                    }

                    /* Cover page styles */
                    .cover-page {
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        align-items: center;
                        text-align: center;
                        padding: 60px 40px;
                        box-sizing: border-box;
                        page-break-after: always;
                    }

                    .cover-content {
                        margin-top: 80px;
                    }

                    .cover-title {
                        font-size: 2.5rem;
                        color: #4f46e5;
                        margin-bottom: 1rem;
                        font-weight: 700;
                    }

                    .cover-subtitle {
                        font-size: 1.2rem;
                        color: #64748b;
                        margin-bottom: 3rem;
                        font-weight: 400;
                    }

                    .cover-info {
                        text-align: left;
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 2rem;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        background: #f8fafc;
                    }

                    .cover-info p {
                        margin: 12px 0;
                        font-size: 0.95rem;
                        color: #334155;
                    }

                    .cover-info strong {
                        color: #1e293b;
                    }

                    /* Main content styles */
                    .main-content {
                        padding: 20px;
                        max-width: 100%;
                        box-sizing: border-box;
                    }

                    .main-content * {
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }

                    .main-content h1 {
                        font-size: 1.8rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-top: 24px;
                        margin-bottom: 12px;
                        border-bottom: 2px solid #4f46e5;
                        padding-bottom: 8px;
                    }

                    .main-content h2 {
                        font-size: 1.4rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 6px;
                    }

                    .main-content h3 {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-top: 16px;
                        margin-bottom: 8px;
                    }

                    .main-content p {
                        color: #334155;
                        margin-bottom: 10px;
                        line-height: 1.6;
                    }

                    .main-content ul,
                    .main-content ol {
                        margin-bottom: 12px;
                        padding-left: 20px;
                    }

                    .main-content li {
                        color: #334155;
                        margin-bottom: 6px;
                    }

                    .main-content table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 9pt;
                        table-layout: fixed;
                    }

                    .main-content th,
                    .main-content td {
                        border: 1px solid #cbd5e1;
                        padding: 8px 6px;
                        color: #334155;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        hyphens: auto;
                        font-size: 9pt;
                        line-height: 1.4;
                    }

                    .main-content th {
                        background: #f1f5f9;
                        font-weight: 600;
                        color: #1e293b;
                    }

                    .main-content pre,
                    .main-content code {
                        background: #f8fafc;
                        color: #1e293b;
                        padding: 8px;
                        border-radius: 4px;
                        font-size: 9pt;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }

                    .main-content .mermaid {
                        page-break-inside: avoid;
                        margin: 15px 0;
                    }

                    /* Hide elements that shouldn't be printed */
                    button, .no-print {
                        display: none !important;
                    }
                </style>
            </head>
            <body>
                <!-- Cover Page -->
                <div class="cover-page">
                    <div class="cover-content">
                        <h1 class="cover-title">Test Plan</h1>
                        <div class="cover-subtitle">Generated by AI Test Plan Generator</div>
                        <div class="cover-info">
                            <p><strong>📅 Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>🤖 AI Model:</strong> ${apiProvider.toUpperCase()}</p>
                            <p><strong>👥 Team Composition:</strong> ${projectTeam}</p>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="main-content">
                    ${cleanContent}
                </div>
            </body>
            </html>
        `);
        frameDoc.close();

        // Wait for content to load before printing
        printFrame.onload = () => {
            try {
                setTimeout(() => {
                    // Trigger print dialog
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();

                    // Clean up after printing
                    setTimeout(() => {
                        if (document.body.contains(printFrame)) {
                            document.body.removeChild(printFrame);
                        }
                        document.title = originalTitle;
                    }, 500);
                }, 1000); // Delay to ensure styles are applied
            } catch (err) {
                console.error("Print failed:", err);
                if (document.body.contains(printFrame)) {
                    document.body.removeChild(printFrame);
                }
                document.title = originalTitle;
                alert('Failed to generate PDF. Please try again.');
            }
        };
    });

    // Initial state check
    if (apiKey) {
        handleApiKeyValidation(apiKey);
    }
    checkGenerateButtonState();
    renderTesters();
});
