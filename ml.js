const AI_API_URL = '/api/chat';
const AI_MODEL = 'openai/gpt-oss-120b';
const CHAT_STORAGE_KEY = 'ai_chat_messages';

let chatMessages = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];

chatMessages = chatMessages.filter(m => m.role !== 'system');

function formatMarkdown(text) {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    let html = escaped
        .replace(/### (.+)/g, '<h5>$1</h5>')
        .replace(/## (.+)/g, '<h4>$1</h4>')
        .replace(/# (.+)/g, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    const lines = html.split('\n');
    let result = [], inList = false, listType = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const ulMatch = line.match(/^[-*] (.+)/);
        const olMatch = line.match(/^\d+[.)] (.+)/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                if (inList) result.push('</' + listType + '>');
                result.push('<ul>');
                inList = true;
                listType = 'ul';
            }
            result.push('<li>' + ulMatch[1] + '</li>');
        } else if (olMatch) {
            if (!inList || listType !== 'ol') {
                if (inList) result.push('</' + listType + '>');
                result.push('<ol>');
                inList = true;
                listType = 'ol';
            }
            result.push('<li>' + olMatch[1] + '</li>');
        } else {
            if (inList) { result.push('</' + listType + '>'); inList = false; listType = null; }
            if (line.trim() === '') {
                result.push('');
            } else if (
                !line.startsWith('<h3') && !line.startsWith('<h4') && !line.startsWith('<h5')
            ) {
                result.push('<p>' + line + '</p>');
            } else {
                result.push(line);
            }
        }
    }
    if (inList) result.push('</' + listType + '>');
    return result.join('\n');
}

const BASE_SYSTEM_MESSAGE = {
    role: 'system',
    content: `You are GeniusAI, the intelligent academic assistant integrated into Genius Performance Analysis. You help students understand and improve their academic performance.

All modules shown in the academic data are ALREADY COMPLETED past modules. The student has already taken the exams and received marks for them. Do NOT suggest redoing or improving past modules.

Your capabilities:
- Analyze academic transcripts and identify performance trends across completed semesters
- Predict future academic performance for upcoming semesters
- Recommend study strategies and habits for FUTURE courses
- Suggest career paths based on academic strengths shown in completed work
- Answer questions about study strategies, time management, and academic planning
- Provide motivation and encouragement

Always be supportive, encouraging, and data-driven in your responses. When referencing the student's data, be specific about course names, marks, and grades. Keep responses concise and actionable. Focus recommendations on future learning strategies, not on redoing past work.

CRITICAL RULES:
- Never show calculations, formulas, or step-by-step reasoning.
- Never output thinking process, chain-of-thought, or anything inside <think> tags.
- Give straight answers with the result and direct feedback only.
- No math expressions, no "let me calculate" statements, no showing your work.
- Output ONLY the final answer.`
};

function buildSystemMessage() {
    const modules = JSON.parse(localStorage.getItem('modules') || '[]');
    let context = 'Current Academic Data:\n';
    if (modules.length === 0) {
        context += 'No modules added yet.';
    } else {
        modules.forEach((m, i) => {
            context += `${i + 1}. ${m.name} | Year: ${m.year} | Part: ${m.part} | Semester: ${m.semester} | Mark: ${m.mark} | Grade: ${m.grade}\n`;
        });
        const avg = (modules.reduce((s, m) => s + m.mark, 0) / modules.length).toFixed(1);
        const total = modules.reduce((s, m) => s + m.mark, 0);
        context += `\nOverall Average: ${avg}/100`;
        context += `\nTotal Marks: ${total}`;
        context += `\nTotal Modules: ${modules.length}`;
    }
    return {
        role: 'system',
        content: BASE_SYSTEM_MESSAGE.content + '\n\n' + context
    };
}

async function callAI(messages) {
    const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });
    if (!response.ok) {
        const errData = await response.text();
        throw new Error(`API error (${response.status}): ${errData}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

const VISION_MODEL = 'qwen/qwen3.6-27b';

function extractJSONArray(text) {
    const start = text.indexOf('[');
    if (start === -1) return null;
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === '"' && !inString) { inString = true; continue; }
        if (c === '"' && inString && !escaped) { inString = false; continue; }
        if (inString) continue;
        if (c === '[') depth++;
        if (c === ']') {
            depth--;
            if (depth === 0) {
                try { return JSON.parse(text.substring(start, i + 1)); }
                catch (e) { return null; }
            }
        }
    }
    return null;
}

async function callAIVision(messages) {
    const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: VISION_MODEL,
            messages: messages,
            temperature: 0.1,
            max_tokens: 2048
        })
    });
    if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Vision API error (${response.status}): ${errData}`);
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

function dataURLtoContent(dataURL) {
    const match = dataURL.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error('Invalid image format');
    return {
        type: 'image_url',
        image_url: { url: dataURL }
    };
}

let screenshotBase64 = null;

function handleScreenshot(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PNG, JPEG, or WebP image.');
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        alert('Image too large. Max 20MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        screenshotBase64 = e.target.result;
        const preview = document.getElementById('screenshot-preview');
        const img = document.getElementById('screenshot-img');
        const extractBtn = document.getElementById('extract-btn');
        img.src = screenshotBase64;
        preview.style.display = 'block';
        extractBtn.disabled = false;
        document.querySelector('.screenshot-label').style.display = 'none';
        document.getElementById('extract-status').textContent = '';
    };
    reader.readAsDataURL(file);
}

function removeScreenshot() {
    screenshotBase64 = null;
    document.getElementById('screenshot-preview').style.display = 'none';
    document.getElementById('extract-btn').disabled = true;
    document.querySelector('.screenshot-label').style.display = 'flex';
    document.getElementById('screenshot-input').value = '';
    document.getElementById('extract-status').textContent = '';
}

async function extractFromScreenshot() {
    if (!screenshotBase64) return;
    const extractBtn = document.getElementById('extract-btn');
    const statusEl = document.getElementById('extract-status');
    extractBtn.disabled = true;
    statusEl.innerHTML = 'Analyzing screenshot with AI...';

    try {
        const visionContent = [
            {
                type: 'text',
                text: `This is a screenshot of academic results. Extract ALL module entries visible in the image and return them as a JSON array. Each entry must have these fields:
- "name": the course/module name
- "year": the academic year (as text)
- "part": the part number (as text)
- "semester": the semester number (as a number)
- "mark": the mark/score (as a number, 0-100)
- "grade": the classification/grade exactly as shown (one of: "1", "2.1", "2.2", "P", "F")

Return ONLY a valid JSON array with no other text, no markdown formatting, no code blocks. Example:
[{"name":"Course Name","year":"2024","part":"1","semester":1,"mark":85,"grade":"1"}]

If you cannot read the image clearly, return an empty array [].`
            },
            dataURLtoContent(screenshotBase64)
        ];

        const reply = await callAIVision([
            { role: 'user', content: visionContent }
        ]);

        let modules = extractJSONArray(reply) || [];

        if (!Array.isArray(modules) || modules.length === 0) {
            statusEl.innerHTML = 'Could not extract any modules from the image. Try a clearer screenshot.';
            extractBtn.disabled = false;
            return;
        }

        const existingModules = JSON.parse(localStorage.getItem('modules') || '[]');
        let added = 0;
        for (const m of modules) {
            if (m.name && m.year && m.part && m.semester != null && m.mark != null && m.grade) {
                existingModules.push({
                    name: String(m.name).trim(),
                    year: String(m.year).trim(),
                    part: String(m.part).trim(),
                    semester: Number(m.semester),
                    mark: Number(m.mark),
                    grade: String(m.grade).trim()
                });
                added++;
            }
        }

        localStorage.setItem('modules', JSON.stringify(existingModules));
        statusEl.innerHTML = `Successfully extracted and added ${added} module(s)!`;
        removeScreenshot();
        displayModules();
        updateStatistics();
    } catch (error) {
        statusEl.innerHTML = 'Extraction failed: ' + error.message;
        extractBtn.disabled = false;
    }
}

async function predictNextSemester() {
    const modules = JSON.parse(localStorage.getItem('modules') || '[]');
    const resultEl = document.getElementById('prediction-result');
    if (modules.length === 0) {
        resultEl.textContent = 'No academic data found. Add modules in the Input Details section first.';
        return;
    }
    resultEl.textContent = 'Analyzing your academic performance...';

    let prompt = `The following is a list of ALREADY COMPLETED past modules (exams taken, marks received). The student will take new, different modules next semester. Based on this historical data:

1. Predict the next semester's average mark (0-100) - just give the number
2. List the student's top 3 academic strengths
3. Recommend study strategies for upcoming new modules
4. Give a brief overall assessment

Do NOT show any calculations, formulas, or step-by-step reasoning. Give straight answers only.

Completed Module Data:\n`;
    modules.forEach((m, i) => {
        prompt += `${i + 1}. ${m.name} | Year: ${m.year} | Part: ${m.part} | Semester: ${m.semester} | Mark: ${m.mark} | Grade: ${m.grade}\n`;
    });
    const avg = (modules.reduce((s, m) => s + m.mark, 0) / modules.length).toFixed(1);
    prompt += `\nCurrent Overall Average: ${avg}/100`;

    try {
        const prediction = await callAI([
            { role: 'system', content: 'You are an academic performance analyst. Provide detailed, data-driven predictions and recommendations.' },
            { role: 'user', content: prompt }
        ]);
        resultEl.innerHTML = formatMarkdown(prediction);
    } catch (error) {
        resultEl.textContent = 'Prediction failed: ' + error.message;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    addChatMessage('user', message);
    showChatTyping();

    try {
        const systemMsg = buildSystemMessage();
        const apiMessages = [systemMsg, ...chatMessages.map(m => ({ role: m.role, content: m.content }))];
        const reply = await callAI(apiMessages);
        hideChatTyping();
        addChatMessage('assistant', reply);
    } catch (error) {
        hideChatTyping();
        addChatMessage('assistant', 'Sorry, I encountered an error: ' + error.message);
    }
}

function addChatMessage(role, content) {
    chatMessages.push({ role, content });
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = chatMessages.map(msg => `
        <div class="chat-message ${msg.role}">
            <div class="chat-bubble">${formatMarkdown(msg.content)}</div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function showChatTyping() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-message assistant typing';
    typingEl.id = 'chat-typing';
    typingEl.innerHTML = '<div class="chat-bubble typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(typingEl);
    container.scrollTop = container.scrollHeight;
}

function hideChatTyping() {
    const typing = document.getElementById('chat-typing');
    if (typing) typing.remove();
}

function clearChat() {
    if (!confirm('Clear all chat messages?')) return;
    chatMessages = [];
    localStorage.removeItem(CHAT_STORAGE_KEY);
    renderChatMessages();
}

function insertSuggestedPrompt(prompt) {
    document.getElementById('chat-input').value = prompt;
    sendChatMessage();
}

document.addEventListener('DOMContentLoaded', function () {
    const predictBtn = document.getElementById('train-predict-btn');
    if (predictBtn) {
        predictBtn.addEventListener('click', predictNextSemester);
    }

    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }

    const screenshotInput = document.getElementById('screenshot-input');
    if (screenshotInput) {
        screenshotInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) handleScreenshot(e.target.files[0]);
        });
    }

    const extractBtn = document.getElementById('extract-btn');
    if (extractBtn) {
        extractBtn.addEventListener('click', extractFromScreenshot);
    }

    const removeBtn = document.getElementById('remove-screenshot-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', removeScreenshot);
    }

    const fab = document.getElementById('chat-fab');
    const modal = document.getElementById('chat-modal');
    const modalClose = document.getElementById('chat-modal-close');
    if (fab && modal) {
        fab.addEventListener('click', function () {
            modal.classList.toggle('open');
            if (modal.classList.contains('open')) {
                setTimeout(() => document.getElementById('chat-input').focus(), 300);
            }
        });
    }
    if (modalClose && modal) {
        modalClose.addEventListener('click', function () {
            modal.classList.remove('open');
        });
    }

    renderChatMessages();
});
