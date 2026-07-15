document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('inputText');
    const output = document.getElementById('outputPreview');
    const modeSelect = document.getElementById('modeSelect');
    const formatBtn = document.getElementById('formatBtn');
    const copyBtn = document.getElementById('copyBtn');

    // Handle Enter/Cmd+Enter Key
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
            // If it's just Enter (no shift), format. 
            // If it's Shift+Enter, let the default newline happen.
            if (!e.shiftKey) {
                e.preventDefault();
                processFormatting();
            }
        }
    });

    formatBtn.addEventListener('click', processFormatting);

    copyBtn.addEventListener('click', () => {
        const text = output.innerText;
        if (!text || text === "...") return;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = '✓ Copied to Clipboard';
            copyBtn.style.background = "#28a745";
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.style.background = "#000";
            }, 2000);
        });
    });

    function processFormatting() {
        const rawText = input.value.trim();
        if (!rawText) return;

        // 1. Split by double-newlines to identify distinct paragraphs
        const paragraphs = rawText.split(/\n\s*\n/);
        
        const formattedBlocks = paragraphs.map(p => {
            // 2. For each paragraph, we clean up internal single newlines 
            // but keep the words in order.
            const words = p.replace(/\n/g, ' ').split(/\s+/).filter(w => w.length > 0);
            return applyCreativePattern(words, modeSelect.value);
        });

        // 3. Join blocks with double newlines for that "clean" social look
        output.innerText = formattedBlocks.join('\n\n');
    }

    function applyCreativePattern(words, mode) {
        let lines = [];
        let currentLine = [];
        let currentLength = 0;
        let lineIndex = 0;

        // Pattern logic: Defined character targets per line
        // We exaggerated these so the visual effect is obvious.
        const getTarget = (idx) => {
            switch(mode) {
                case 'wave': 
                    // Alternates wide and very narrow
                    return idx % 2 === 0 ? 45 : 20; 
                case 'diamond': 
                    // Narrow -> Wide -> Narrow
                    const dPattern = [20, 30, 45, 30];
                    return dPattern[idx % dPattern.length];
                case 'hourglass': 
                    // Wide -> Narrow -> Wide
                    const hPattern = [45, 30, 20, 30];
                    return hPattern[idx % hPattern.length];
                case 'classic':
                default: 
                    // The sweet spot for mobile readability
                    return 35; 
            }
        };

        let i = 0;
        while (i < words.length) {
            let target = getTarget(lineIndex);
            let word = words[i];

            // If adding this word exceeds the current line's target length
            if (currentLine.length > 0 && (currentLength + 1 + word.length) > target) {
                // Finish this line
                lines.push(currentLine.join(' '));
                // Start new line
                currentLine = [word];
                currentLength = word.length;
                lineIndex++;
            } else {
                // Add word to current line
                currentLine.push(word);
                currentLength += (currentLine.length === 1 ? 0 : 1) + word.length;
            }
            i++;
        }

        // Catch the last remaining words
        if (currentLine.length > 0) {
            lines.push(currentLine.join(' '));
        }

        return lines.join('\n');
    }
});