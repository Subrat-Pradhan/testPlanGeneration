/**
 * Utility functions for the AI Test Plan Generator
 */

/**
 * Calculates the number of working days (Mon-Fri) between two dates.
 * @param {string} start - Start date string (YYYY-MM-DD)
 * @param {string} end - End date string (YYYY-MM-DD)
 * @returns {number} Number of working days
 */
function calculateWorkingDays(start, end) {
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // 0 is Sunday, 6 is Saturday
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * Extracts text content from a File object (PDF or Text).
 * @param {File} file - The file to unpack
 * @returns {Promise<string>} The extracted text content
 */
async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    // Extract text from PDF
                    if (typeof pdfjsLib === 'undefined') {
                        reject(new Error('PDF.js library not loaded'));
                        return;
                    }
                    
                    const arrayBuffer = e.target.result;
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }

                    resolve(fullText);
                } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                    // Extract text from TXT
                    resolve(e.target.result);
                } else {
                    reject(new Error('Unsupported file type'));
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
}

/**
 * Validates an API key against provider specific formats.
 * @param {string} key - The API key to validate
 * @param {object} provider - The provider object containing validation rules
 * @returns {boolean} True if valid, false otherwise
 */
function validateApiKey(key, provider) {
    if (!key || key.length === 0) {
        return false;
    }
    return provider.validate(key);
}

/**
 * Extracts all CSS rules from the document's stylesheets.
 * Handles CORS issues gracefully.
 * @returns {string} Concatenated CSS rules
 */
function extractCSSRules() {
    let cssText = "";
    for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
            const rules = sheet.cssRules || sheet.rules;
            if (rules) {
                for (let j = 0; j < rules.length; j++) {
                    cssText += rules[j].cssText + "\n";
                }
            }
        } catch (e) {
            // CORS issue with external stylesheets - try to import them
            if (sheet.href) {
                cssText += `@import url("${sheet.href}");\n`;
            }
        }
    }
    return cssText;
}

// Export functions for usage in other modules (if using modules)
// For browser globals, they are already attached to window by default definition
