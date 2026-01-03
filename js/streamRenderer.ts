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

export interface StreamRendererOptions {
    /**
     * Callback when streaming is complete
     */
    onComplete?: (finalText: string) => void;

    /**
     * Callback for each frame update (useful for progress tracking)
     */
    onUpdate?: (currentText: string) => void;

    /**
     * Custom sanitization function to clean text before rendering
     * Default removes trailing hyphens/horizontal rules
     */
    sanitize?: (text: string) => string;

    /**
     * Whether to use a text node (faster) or allow HTML content
     * Default: true (text node, no HTML parsing)
     */
    useTextNode?: boolean;

    /**
     * Custom markdown parser (e.g., marked.parse)
     * Only used if useTextNode is false
     */
    markdownParser?: (text: string) => string;
}

export class StreamRenderer {
    private container: HTMLElement;
    private textBuffer: string = '';
    private lastRenderedText: string = '';
    private rafId: number | null = null;
    private isFinished: boolean = false;
    private options: Required<StreamRendererOptions>;
    private textNode: Text | null = null;

    constructor(container: HTMLElement, options: StreamRendererOptions = {}) {
        this.container = container;

        // Set default options
        this.options = {
            onComplete: options.onComplete || (() => { }),
            onUpdate: options.onUpdate || (() => { }),
            sanitize: options.sanitize || this.defaultSanitize,
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
    private initializeContainer(): void {
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
    private defaultSanitize(text: string): string {
        // Remove trailing horizontal rules (3 or more hyphens/equals)
        return text.replace(/[\r\n]+[-=]{3,}[\r\n]*$/g, '').trim();
    }

    /**
     * Start the requestAnimationFrame render loop
     */
    private startRenderLoop(): void {
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
    private renderToDOM(): void {
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
    public appendChunk(chunk: string): void {
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
    public finish(): void {
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
    private cleanup(): void {
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
    public getCurrentText(): string {
        return this.textBuffer;
    }

    /**
     * Reset the renderer (useful for reusing the same instance)
     */
    public reset(): void {
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
    public destroy(): void {
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
export function createMarkdownStreamRenderer(
    container: HTMLElement,
    markdownParser: (text: string) => string,
    options: Omit<StreamRendererOptions, 'useTextNode' | 'markdownParser'> = {}
): StreamRenderer {
    return new StreamRenderer(container, {
        ...options,
        useTextNode: false,
        markdownParser
    });
}
