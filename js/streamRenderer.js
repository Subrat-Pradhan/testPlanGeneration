/**
 * StreamRenderer - Optimized text streaming renderer using requestAnimationFrame
 * 
 * Solves performance issues when streaming text from APIs by:
 * 1. Buffering incoming chunks and only updating DOM at 60fps (requestAnimationFrame)
 * 2. Using efficient DOM append operations instead of innerHTML replacement
 * 3. Throttling updates to prevent layout thrashing
 * 4. Cleaning up resources when stream completes
 * 
 * @example
 * const renderer = new StreamRenderer(containerElement, {
 *   onComplete: (finalText) => console.log('Stream complete!', finalText)
 * });
 * 
 * // In your stream handler:
 * renderer.appendChunk(newTextChunk);
 * 
 * // When stream ends:
 * renderer.finish();
 */

class StreamRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.textBuffer = '';
        this.lastRenderedText = '';
        this.rafId = null;
        this.isFinished = false;
        this.textNode = null;

        // Set default options
        this.options = {
            onComplete: options.onComplete || (() => { }),
            onUpdate: options.onUpdate || (() => { }),
            sanitize: options.sanitize || this.defaultSanitize.bind(this),
            useTextNode: options.useTextNode !== undefined ? options.useTextNode : true,
            markdownParser: options.markdownParser || ((text) => text)
        };

        // Initialize container
        this.initializeContainer();

        // Start the render loop
        this.startRenderLoop();
    }

    /**
     * Initialize the container with optimal settings
     */
    initializeContainer() {
        // Clear existing content
        this.container.innerHTML = '';

        // Add performance optimization styles if not already present
        if (!this.container.style.contain) {
            this.container.style.contain = 'content';
        }
        if (!this.container.style.willChange) {
            this.container.style.willChange = 'contents';
        }

        // Create a text node for efficient updates if using text mode
        if (this.options.useTextNode) {
            this.textNode = document.createTextNode('');
            this.container.appendChild(this.textNode);
        }
    }

    /**
     * Default sanitization: removes trailing hyphens and horizontal rules
     */
    defaultSanitize(text) {
        // Remove trailing horizontal rules (3 or more hyphens/equals)
        return text.replace(/[\r\n]+[-=]{3,}[\r\n]*$/g, '').trim();
    }

    /**
     * Start the requestAnimationFrame render loop
     */
    startRenderLoop() {
        const render = () => {
            // Only update if buffer has changed since last render
            if (this.textBuffer !== this.lastRenderedText) {
                this.renderToDOM();
                this.lastRenderedText = this.textBuffer;

                // Call update callback
                this.options.onUpdate(this.textBuffer);
            }

            // Continue loop unless finished
            if (!this.isFinished) {
                this.rafId = requestAnimationFrame(render);
            } else {
                // Final render and cleanup
                this.renderToDOM();
                this.cleanup();
            }
        };

        this.rafId = requestAnimationFrame(render);
    }

    /**
     * Efficiently render buffered text to DOM
     */
    renderToDOM() {
        if (this.options.useTextNode && this.textNode) {
            // Fast path: just update text node content
            this.textNode.textContent = this.textBuffer;
        } else {
            // Markdown/HTML path: parse and set innerHTML
            try {
                const parsed = this.options.markdownParser(this.textBuffer);
                this.container.innerHTML = parsed;
            } catch (error) {
                console.warn('Error parsing markdown, falling back to plain text:', error);
                this.container.textContent = this.textBuffer;
            }
        }
    }

    /**
     * Append a new chunk of text to the buffer
     * This is called each time new data arrives from the stream
     */
    appendChunk(chunk) {
        if (this.isFinished) {
            console.warn('StreamRenderer: Cannot append chunk after finish() has been called');
            return;
        }

        this.textBuffer += chunk;
    }

    /**
     * Signal that the stream has finished
     * Performs final sanitization and cleanup
     */
    finish() {
        if (this.isFinished) {
            return;
        }

        this.isFinished = true;

        // Apply sanitization to final text
        this.textBuffer = this.options.sanitize(this.textBuffer);

        // The render loop will handle final render and cleanup
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Cancel any pending animation frame
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Call completion callback
        this.options.onComplete(this.textBuffer);
    }

    /**
     * Get the current buffered text
     */
    getCurrentText() {
        return this.textBuffer;
    }

    /**
     * Reset the renderer (useful for reusing the same instance)
     */
    reset() {
        // Cancel existing render loop
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        // Reset state
        this.textBuffer = '';
        this.lastRenderedText = '';
        this.isFinished = false;

        // Reinitialize
        this.initializeContainer();
        this.startRenderLoop();
    }

    /**
     * Destroy the renderer and clean up all resources
     */
    destroy() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        this.textNode = null;
        this.isFinished = true;
    }
}

/**
 * Helper function to create a StreamRenderer with markdown support
 * Requires marked.js or similar markdown parser
 */
function createMarkdownStreamRenderer(container, markdownParser, options = {}) {
    return new StreamRenderer(container, {
        ...options,
        useTextNode: false,
        markdownParser
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StreamRenderer, createMarkdownStreamRenderer };
}
