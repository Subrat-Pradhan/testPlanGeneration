/**
 * INTEGRATION EXAMPLE: How to use StreamRenderer with your existing Gemini API streaming
 * 
 * This file shows how to replace the current renderOutput() function
 * with the optimized StreamRenderer class.
 */

// ============================================================================
// STEP 1: Include the StreamRenderer script in your HTML
// ============================================================================
// Add this to your index.html BEFORE app.js:
// <script src="js/streamRenderer.js"></script>


// ============================================================================
// STEP 2: Replace your streaming logic in app.js
// ============================================================================

// BEFORE (Current implementation - causes crashes):
// -------------------------------------------------------
/*
const renderOutput = (text) => {
    try {
        let html = marked.parse(text, { gfm: true });
        html = html.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, content) => {
            return `<div class="table-wrapper"><table${attrs}>${content}</table></div>`;
        });
        output.innerHTML = html;  // ❌ This causes layout thrashing!
    } catch (e) {
        console.warn('Rendering incomplete markdown:', e);
        output.innerHTML = `<pre class="whitespace-pre-wrap font-mono text-sm text-slate-300">${text}</pre>`;
    }
};

// In the stream loop:
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    // ... JSON parsing logic ...
    markdownContent += newText;
    renderOutput(markdownContent);  // ❌ Called too frequently!
}
*/


// AFTER (Optimized implementation with StreamRenderer):
// -------------------------------------------------------

// Create a custom markdown parser that wraps tables
function parseMarkdownWithTableWrapper(text) {
    try {
        let html = marked.parse(text, { gfm: true });

        // Wrap tables for scrolling
        html = html.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (match, attrs, content) => {
            return `<div class="table-wrapper"><table${attrs}>${content}</table></div>`;
        });

        return html;
    } catch (e) {
        console.warn('Rendering incomplete markdown:', e);
        return `<pre class="whitespace-pre-wrap font-mono text-sm text-slate-300">${text}</pre>`;
    }
}

// Custom sanitization to remove trailing separators
function sanitizeMarkdown(text) {
    // Remove trailing horizontal rules (3 or more hyphens/equals)
    return text.replace(/[\r\n]+[-=]{3,}[\r\n]*$/g, '').trim();
}

// ============================================================================
// STEP 3: Initialize StreamRenderer before streaming starts
// ============================================================================

// Inside your generateBtn click handler, BEFORE the API call:
generateBtn.addEventListener('click', async () => {
    // ... existing validation code ...

    loadingOverlay.classList.remove('hidden');
    output.innerHTML = ''; // Clear previous output

    // ✅ Initialize StreamRenderer
    const streamRenderer = new StreamRenderer(output, {
        useTextNode: false,  // We need HTML rendering for markdown
        markdownParser: parseMarkdownWithTableWrapper,
        sanitize: sanitizeMarkdown,
        onUpdate: (currentText) => {
            // Optional: track progress, update UI, etc.
            // This runs at 60fps max, not on every chunk
        },
        onComplete: (finalText) => {
            console.log('✅ Stream rendering complete!');

            // Trigger Mermaid diagram rendering
            const mermaidBlocks = output.querySelectorAll('pre code.language-mermaid, pre.mermaid');
            mermaidBlocks.forEach(block => {
                const code = block.textContent;
                const container = document.createElement('div');
                container.className = 'mermaid';
                container.textContent = code;
                block.parentNode.replaceWith(container);
            });
            if (window.mermaid) {
                window.mermaid.run?.();
            }

            // Show download button
            downloadPdfBtn.classList.remove('hidden');
            document.getElementById('aiDisclaimer').classList.remove('hidden');
        }
    });

    try {
        // ... existing code to build prompt ...

        // ============================================================================
        // STEP 4: Use StreamRenderer in your Gemini streaming loop
        // ============================================================================

        if (apiProvider === 'gemini') {
            // ... existing Gemini model selection code ...

            output.innerHTML = '<div class="animate-pulse text-violet-300 font-medium p-4">🚀 Connecting to Gemini...</div>';

            for (const model of geminiModels) {
                try {
                    const requestBody = {
                        contents: [{ parts: [{ text: `You are an expert QA Lead. always respond in Markdown.\n\n${prompt}` }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 8192,
                            stopSequences: ["\n\n----", "\n\n====="]
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                        ]
                    };

                    const response = await fetch(`https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:streamGenerateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || `Error with ${model.name}`);
                    }

                    // Stream Reader
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    output.innerHTML = ''; // Clear loading text

                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        // Parse stream: look for "text" fields in the JSON chunks
                        let openBraces = 0;
                        let objectStart = -1;

                        for (let i = 0; i < buffer.length; i++) {
                            if (buffer[i] === '{') {
                                if (openBraces === 0) objectStart = i;
                                openBraces++;
                            } else if (buffer[i] === '}') {
                                openBraces--;
                                if (openBraces === 0 && objectStart !== -1) {
                                    const jsonStr = buffer.substring(objectStart, i + 1);
                                    try {
                                        const jsonObj = JSON.parse(jsonStr);
                                        if (jsonObj.candidates && jsonObj.candidates[0] && jsonObj.candidates[0].content) {
                                            const newText = jsonObj.candidates[0].content.parts[0].text;
                                            if (newText) {
                                                // ✅ Instead of calling renderOutput(), use StreamRenderer
                                                streamRenderer.appendChunk(newText);
                                            }
                                        }
                                    } catch (e) {
                                        // Ignore parsing errors for partial objects
                                    }
                                    buffer = buffer.substring(i + 1);
                                    i = -1;
                                    objectStart = -1;
                                }
                            }
                        }
                    }

                    // ✅ Signal that streaming is complete
                    streamRenderer.finish();

                    streamSuccess = true;
                    break;

                } catch (err) {
                    lastError = err;
                    continue;
                }
            }

            if (!streamSuccess) throw new Error(lastError?.message || 'Gemini Streaming Failed');
        }

        // Similar changes for OpenAI provider...

    } catch (error) {
        console.error(error);
        // ... error handling ...
    } finally {
        loadingOverlay.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Test Plan';
        checkGenerateButtonState();
    }
});


// ============================================================================
// STEP 5: Add recommended CSS to your style.css
// ============================================================================
/*
#output {
  contain: content;
  will-change: contents;
  white-space: pre-wrap;
}
*/


// ============================================================================
// PERFORMANCE COMPARISON
// ============================================================================
/*
BEFORE (Direct DOM Updates):
- Every chunk arrival triggers innerHTML replacement
- Browser re-parses entire HTML on each update
- Layout recalculation happens 100+ times per second
- Main thread blocks, causing UI freezes
- Result: Website crashes, unresponsive UI

AFTER (StreamRenderer with rAF):
- Chunks are buffered in memory (fast)
- DOM updates happen max 60 times per second (60fps)
- Browser only recalculates layout when ready
- Main thread stays responsive
- Result: Smooth streaming, no crashes
*/


// ============================================================================
// ADVANCED USAGE: Plain Text Mode (Even Faster)
// ============================================================================
/*
If you don't need markdown rendering during streaming and only want
the final result to be rendered as markdown:

const streamRenderer = new StreamRenderer(output, {
    useTextNode: true,  // ✅ Super fast text-only mode
    onComplete: (finalText) => {
        // Now render as markdown once at the end
        output.innerHTML = parseMarkdownWithTableWrapper(finalText);
        
        // Trigger Mermaid
        // ... mermaid code ...
    }
});

This is the FASTEST option but users won't see markdown formatting
until the stream completes.
*/
