let questions = [];
let currentQuiz = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let isReviewMode = false;

// File upload handling
document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('startQuiz').addEventListener('click', startQuiz);
document.getElementById('prevBtn').addEventListener('click', () => navigateQuestion(-1));
document.getElementById('nextBtn').addEventListener('click', () => navigateQuestion(1));
document.getElementById('finishBtn').addEventListener('click', finishQuiz);
document.getElementById('reviewBtn').addEventListener('click', reviewAnswers);
document.getElementById('detailReviewBtn').addEventListener('click', showDetailReview);
document.getElementById('restartBtn').addEventListener('click', restartApp);
document.getElementById('backToResultsBtn').addEventListener('click', backToResults);
document.getElementById('restartFromDetailBtn').addEventListener('click', restartApp);

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (validateQuestionFormat(data)) {
                questions = data;
                updateFileInfo(file.name, questions.length);
                document.getElementById('startQuiz').disabled = false;
                document.getElementById('numQuestions').max = questions.length;
            } else {
                alert('❌ Format file không đúng! File JSON cần có cấu trúc:\n[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]');
            }
        } catch (error) {
            alert('❌ Lỗi đọc file JSON: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function validateQuestionFormat(data) {
    if (!Array.isArray(data) || data.length === 0) return false;
    
    return data.every(q => {
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2) return false;
        
        // Validate single choice questions
        if (q.type === 'single' || !q.type) {
            return typeof q.correct === 'number' && q.correct >= 0 && q.correct < q.options.length;
        }
        
        // Validate multiple choice questions
        if (q.type === 'multiple') {
            return Array.isArray(q.correct) && 
                    q.correct.length > 0 && 
                    q.correct.every(c => typeof c === 'number' && c >= 0 && c < q.options.length);
        }
        
        return false;
    });
}
        

function updateFileInfo(fileName, count) {
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('questionCount').textContent = count;
    document.getElementById('fileInfo').classList.remove('hidden');
}

function startQuiz() {
    const numQuestions = Math.min(parseInt(document.getElementById('numQuestions').value), questions.length);
    const randomOrder = document.getElementById('randomOrder').value === 'true';
    
    // Prepare quiz questions
    currentQuiz = [...questions];
    if (randomOrder) {
        currentQuiz = shuffleArray(currentQuiz);
    }
    currentQuiz = currentQuiz.slice(0, numQuestions);
    
    // Reset state
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuiz.length).fill(null);
    // For multiple choice questions, initialize with empty arrays
    userAnswers = userAnswers.map((_, index) => {
        return currentQuiz[index].type === 'multiple' ? [] : null;
    });
    isReviewMode = false;
    
    // Show quiz section
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('quizSection').classList.remove('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    
    displayQuestion();
    updateProgress();
    updateNavigation();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function displayQuestion() {
    const question = currentQuiz[currentQuestionIndex];
    const container = document.getElementById('questionContainer');
    const isMultiple = question.type === 'multiple';
    
    let instructionText = '';
    if (isMultiple) {
        const correctCount = Array.isArray(question.correct) ? question.correct.length : 0;
        instructionText = `<div style="color: #666; font-style: italic; margin-bottom: 15px;">
            📌 Câu hỏi chọn nhiều đáp án (chọn ${correctCount} đáp án)
        </div>`;
    }
    
    container.innerHTML = `
        <div class="question-card">
            <div class="question-header">
                <div class="question-number">Câu ${currentQuestionIndex + 1}</div>
                <div style="background: ${isMultiple ? '#e74c3c' : '#3498db'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                    ${isMultiple ? 'CHỌN NHIỀU' : 'CHỌN 1'}
                </div>
            </div>
            ${instructionText}
            <div class="question-text">${question.question}</div>
            <div class="options">
                ${question.options.map((option, index) => `
                    <div class="option" data-index="${index}" onclick="selectOption(${index})">
                        <span style="font-weight: bold; min-width: 20px;">${String.fromCharCode(65 + index)}.</span>
                        <span>${option}</span>
                        ${isMultiple ? '<span class="checkbox">☐</span>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Restore selected answers
    const userAnswer = userAnswers[currentQuestionIndex];
    if (isMultiple && Array.isArray(userAnswer)) {
        userAnswer.forEach(answerIndex => {
            const selectedOption = container.querySelector(`[data-index="${answerIndex}"]`);
            if (selectedOption) {
                selectedOption.classList.add('selected');
                const checkbox = selectedOption.querySelector('.checkbox');
                if (checkbox) checkbox.textContent = '☑';
            }
        });
    } else if (!isMultiple && userAnswer !== null) {
        const selectedOption = container.querySelector(`[data-index="${userAnswer}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
    
    // Show correct answers in review mode
    if (isReviewMode) {
        showCorrectAnswer();
    }
    
    // Update question info
    document.getElementById('questionInfo').textContent = `Câu ${currentQuestionIndex + 1}/${currentQuiz.length}`;
}

function selectOption(index) {
    if (isReviewMode) return;
    
    const question = currentQuiz[currentQuestionIndex];
    const isMultiple = question.type === 'multiple';
    const option = document.querySelector(`[data-index="${index}"]`);
    
    if (isMultiple) {
        // Handle multiple choice
        if (!Array.isArray(userAnswers[currentQuestionIndex])) {
            userAnswers[currentQuestionIndex] = [];
        }
        
        const currentAnswers = userAnswers[currentQuestionIndex];
        const answerIndex = currentAnswers.indexOf(index);
        
        if (answerIndex > -1) {
            // Remove selection
            currentAnswers.splice(answerIndex, 1);
            option.classList.remove('selected');
            const checkbox = option.querySelector('.checkbox');
            if (checkbox) checkbox.textContent = '☐';
        } else {
            // Add selection
            currentAnswers.push(index);
            option.classList.add('selected');
            const checkbox = option.querySelector('.checkbox');
            if (checkbox) checkbox.textContent = '☑';
        }
    } else {
        // Handle single choice
        // Remove previous selection
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        
        // Add new selection
        option.classList.add('selected');
        
        // Save answer
        userAnswers[currentQuestionIndex] = index;
    }
    
    updateProgress();
}

function showCorrectAnswer() {
    const question = currentQuiz[currentQuestionIndex];
    const options = document.querySelectorAll('.option');
    const userAnswer = userAnswers[currentQuestionIndex];
    const isMultiple = question.type === 'multiple';
    
    options.forEach((option, index) => {
        option.onclick = null; // Disable clicking
        
        if (isMultiple) {
            const correctAnswers = Array.isArray(question.correct) ? question.correct : [];
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
            
            if (correctAnswers.includes(index)) {
                option.classList.add('correct');
            } else if (userAnswers.includes(index) && !correctAnswers.includes(index)) {
                option.classList.add('incorrect');
            }
        } else {
            if (index === question.correct) {
                option.classList.add('correct');
            } else if (index === userAnswer && userAnswer !== question.correct) {
                option.classList.add('incorrect');
            }
        }
    });
}

function navigateQuestion(direction) {
    const newIndex = currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < currentQuiz.length) {
        currentQuestionIndex = newIndex;
        displayQuestion();
        updateProgress();
        updateNavigation();
    }
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / currentQuiz.length) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function updateNavigation() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').classList.toggle('hidden', currentQuestionIndex === currentQuiz.length - 1);
    document.getElementById('finishBtn').classList.toggle('hidden', currentQuestionIndex !== currentQuiz.length - 1);
}

function finishQuiz() {
    let unansweredCount = 0;
    userAnswers.forEach((answer, index) => {
        const question = currentQuiz[index];
        if (question.type === 'multiple') {
            if (!Array.isArray(answer) || answer.length === 0) unansweredCount++;
        } else {
            if (answer === null) unansweredCount++;
        }
    });
    
    if (unansweredCount > 0 && !confirm(`⚠️ Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có muốn hoàn thành bài kiểm tra không?`)) {
        return;
    }
    
    showResults();
}

function showResults() {
    let correctCount = 0;
    
    currentQuiz.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        
        if (question.type === 'multiple') {
            const correctAnswers = Array.isArray(question.correct) ? question.correct : [];
            const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [];
            
            // Check if user selected exactly the correct answers
            if (correctAnswers.length === userAnswersArray.length &&
                correctAnswers.every(ans => userAnswersArray.includes(ans)) &&
                userAnswersArray.every(ans => correctAnswers.includes(ans))) {
                correctCount++;
            }
        } else {
            if (userAnswer === question.correct) {
                correctCount++;
            }
        }
    });
    
    const percentage = Math.round((correctCount / currentQuiz.length) * 100);
    
    document.getElementById('finalScore').textContent = `${correctCount}/${currentQuiz.length}`;
    document.getElementById('scorePercentage').textContent = `${percentage}% đúng`;
    
    // Store results for detail review
    window.quizResults = {
        correctCount,
        totalQuestions: currentQuiz.length,
        percentage
    };
    
    document.getElementById('quizSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('detailReviewSection').classList.add('hidden');
}

function reviewAnswers() {
    isReviewMode = true;
    currentQuestionIndex = 0;
    
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('quizSection').classList.remove('hidden');
    document.getElementById('detailReviewSection').classList.add('hidden');
    
    displayQuestion();
    updateProgress();
    updateNavigation();
}

function showDetailReview() {
    const container = document.getElementById('allQuestionsContainer');
    const results = window.quizResults;
    
    // Update summary
    document.getElementById('reviewScore').textContent = `${results.correctCount}/${results.totalQuestions}`;
    document.getElementById('reviewPercentage').textContent = `${results.percentage}%`;
    
    // Generate all questions
    let allQuestionsHTML = '';
    
    currentQuiz.forEach((question, questionIndex) => {
        const userAnswer = userAnswers[questionIndex];
        const isMultiple = question.type === 'multiple';
        let isCorrect = false;
        
        // Determine if answer is correct
        if (isMultiple) {
            const correctAnswers = Array.isArray(question.correct) ? question.correct : [];
            const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [];
            isCorrect = correctAnswers.length === userAnswersArray.length &&
                        correctAnswers.every(ans => userAnswersArray.includes(ans)) &&
                        userAnswersArray.every(ans => correctAnswers.includes(ans));
        } else {
            isCorrect = userAnswer === question.correct;
        }
        
        const statusIcon = isCorrect ? '✅' : '❌';
        const statusColor = isCorrect ? '#28a745' : '#dc3545';
        
        allQuestionsHTML += `
            <div class="question-card" style="border-left-color: ${statusColor};">
                <div class="question-header">
                    <div class="question-number">Câu ${questionIndex + 1}</div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div style="background: ${isMultiple ? '#e74c3c' : '#3498db'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                            ${isMultiple ? 'CHỌN NHIỀU' : 'CHỌN 1'}
                        </div>
                        <div style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold;">
                            ${statusIcon} ${isCorrect ? 'ĐÚNG' : 'SAI'}
                        </div>
                    </div>
                </div>
                
                ${question.category ? `<div style="color: #666; font-size: 14px; margin-bottom: 10px; font-style: italic;">📂 ${question.category}</div>` : ''}
                
                <div class="question-text">${question.question}</div>
                
                <div class="options">
                    ${question.options.map((option, optionIndex) => {
                        let optionClass = '';
                        let optionIcon = '';
                        
                        if (isMultiple) {
                            const correctAnswers = Array.isArray(question.correct) ? question.correct : [];
                            const userAnswersArray = Array.isArray(userAnswer) ? userAnswer : [];
                            
                            if (correctAnswers.includes(optionIndex)) {
                                optionClass = 'correct';
                                optionIcon = '✓';
                            } else if (userAnswersArray.includes(optionIndex) && !correctAnswers.includes(optionIndex)) {
                                optionClass = 'incorrect';
                                optionIcon = '✗';
                            } else if (userAnswersArray.includes(optionIndex)) {
                                optionClass = 'selected';
                                optionIcon = '☑';
                            }
                        } else {
                            if (optionIndex === question.correct) {
                                optionClass = 'correct';
                                optionIcon = '✓';
                            } else if (optionIndex === userAnswer && userAnswer !== question.correct) {
                                optionClass = 'incorrect';
                                optionIcon = '✗';
                            } else if (optionIndex === userAnswer) {
                                optionClass = 'selected';
                            }
                        }
                        
                        return `
                            <div class="option ${optionClass}" style="cursor: default;">
                                <span style="font-weight: bold; min-width: 20px;">${String.fromCharCode(65 + optionIndex)}.</span>
                                <span>${option}</span>
                                <span style="margin-left: auto; font-weight: bold;">${optionIcon}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                ${!isCorrect ? `
                    <div style="margin-top: 15px; padding: 12px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 8px; color: #856404;">
                        <strong>💡 Giải thích:</strong>
                        ${isMultiple ? `
                            <br>Đáp án đúng: ${question.correct.map(i => String.fromCharCode(65 + i)).join(', ')}
                            <br>Bạn đã chọn: ${Array.isArray(userAnswer) && userAnswer.length > 0 ? userAnswer.map(i => String.fromCharCode(65 + i)).join(', ') : 'Không có'}
                        ` : `
                            <br>Đáp án đúng: ${String.fromCharCode(65 + question.correct)}
                            <br>Bạn đã chọn: ${userAnswer !== null ? String.fromCharCode(65 + userAnswer) : 'Không có'}
                        `}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = allQuestionsHTML;
    
    // Show detail review section
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('quizSection').classList.add('hidden');
    document.getElementById('detailReviewSection').classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function backToResults() {
    document.getElementById('detailReviewSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
}

function restartApp() {
    // Reset all states
    questions = [];
    currentQuiz = [];
    currentQuestionIndex = 0;
    userAnswers = [];
    isReviewMode = false;
    
    // Reset form
    document.getElementById('fileInput').value = '';
    document.getElementById('numQuestions').value = '10';
    document.getElementById('randomOrder').value = 'true';
    document.getElementById('startQuiz').disabled = true;
    
    // Show upload section
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('quizSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('fileInfo').classList.add('hidden');
}

// Add CSS for checkbox styling
const additionalCSS = `
    .checkbox {
        margin-left: auto;
        font-size: 18px;
        font-weight: bold;
    }
    
    .option {
        position: relative;
    }
    
    .option.selected .checkbox {
        color: white;
    }
`;

const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);