const screen1 = document.getElementById('screen-1');
const screen2 = document.getElementById('screen-2');
const screen3 = document.getElementById('screen-3');

const btnNextToModes = document.getElementById('btnNextToModes');
const btnStart = document.getElementById('btnStart');
const btnRestart = document.getElementById('btnRestart');
const btnBackToMenu = document.getElementById('btnBackToMenu');
const btnExit = document.getElementById('btnExit');

const boardElement = document.getElementById('chessboard');
const gameModeIndicator = document.getElementById('gameModeIndicator');
const aiColorSelection = document.getElementById('aiColorSelection');
const timerSelection = document.getElementById('timerSelection');
const radioModes = document.getElementsByName('gameMode');
const radioColors = document.getElementsByName('playerColor');
const radioTimes = document.getElementsByName('gameTime');

const timerWhiteElement = document.getElementById('timerWhite');
const timerBlackElement = document.getElementById('timerBlack');
const moveHistoryList = document.getElementById('moveHistoryList');
const notificationContainer = document.getElementById('notification-container');
const promotionModal = document.getElementById('promotionModal');

const capturedByWhiteList = document.querySelector('#capturedByWhite .captured-pieces-list');
const capturedByBlackList = document.querySelector('#capturedByBlack .captured-pieces-list');

// --- GAME VARIABLES ---
const initialLayout = [
    ['r','n','b','q','k','b','n','r'], 
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'], 
    ['R','N','B','Q','K','B','N','R']
];

let boardLayout = JSON.parse(JSON.stringify(initialLayout));
let isWhiteTurn = true; 
let gameOver = false;
let selectedRow = null;
let selectedCol = null;
let moveCount = 1;

let lastMove = { fromR: null, fromC: null, toR: null, toC: null };
let capturedPieces = { white: [], black: [] };

let chosenMinutes = 10; 
let whiteTimeLeft = 600; 
let blackTimeLeft = 600;
let countdownInterval = null; 

let currentMode = 'multiplayer'; 
let playerColor = 'White'; 

// Terfi bekleyen piyonun koordinatlarını saklayan geçici obje
let promotionPending = null;

function showToast(message, type = 'danger') {
    if (!notificationContainer) return;
    const toast = document.createElement('div');
    toast.classList.add('toast-notification');
    if (type === 'info') toast.classList.add('info');
    toast.innerText = message;
    notificationContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function playSound(type) {
    let audioFile = '';
    if (type === 'move') audioFile = 'ChessMasterss/move.mp3';
    if (type === 'capture') audioFile = 'ChessMasterss/capture.mp3';
    if (type === 'check') audioFile = 'ChessMasterss/check.mp3';
    
    if (audioFile) {
        const audio = new Audio(audioFile);
        audio.play().catch(e => console.log("Audio play prevented."));
    }
}

function getExactSrc(piece) {
    const prefix = 'ChessMasterss/';
    switch(piece) {
        case 'P': return prefix + 'P.png'; case 'R': return prefix + 'R .png'; case 'N': return prefix + 'N.png';  
        case 'B': return prefix + 'B.png'; case 'Q': return prefix + 'Q.png';   case 'K': return prefix + 'K .png';  
        case 'p': return prefix + 'p .png'; case 'r': return prefix + 'r.png';   case 'n': return prefix + 'n .png';  
        case 'b': return prefix + 'b .png'; case 'q': return prefix + 'q .png';  case 'k': return prefix + 'k.png';   
        default: return '';
    }
}

// --- MENU NAVIGATION ---
if (btnNextToModes) {
    btnNextToModes.addEventListener('click', () => {
        screen1.classList.add('hidden');
        screen2.classList.remove('hidden');
    });
}

radioModes.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentMode = e.target.value;
        btnStart.classList.remove('hidden');
        timerSelection.classList.remove('hidden');
        if (currentMode === 'ai') aiColorSelection.classList.remove('hidden'); 
        else aiColorSelection.classList.add('hidden');
    });
});

if (btnStart) {
    btnStart.addEventListener('click', () => {
        if (currentMode === 'ai') {
            radioColors.forEach(r => { if(r.checked) playerColor = r.value; });
            gameModeIndicator.innerText = `Mode: Player (${playerColor}) vs AI`;
        } else {
            gameModeIndicator.innerText = "Mode: Local Multiplayer";
            playerColor = 'White'; 
        }
        radioTimes.forEach(r => { if(r.checked) chosenMinutes = r.value; });
        screen2.classList.add('hidden');
        screen3.classList.remove('hidden');
        resetGameEngine();
    });
}

if (btnBackToMenu) {
    btnBackToMenu.addEventListener('click', () => {
        if (confirm("Are you sure you want to exit the current game?")) {
            clearInterval(countdownInterval);
            screen3.classList.add('hidden');
            screen2.classList.remove('hidden');
        }
    });
}

function resetGameEngine() {
    boardLayout = JSON.parse(JSON.stringify(initialLayout));
    isWhiteTurn = true; gameOver = false; selectedRow = null; selectedCol = null; moveCount = 1;
    lastMove = { fromR: null, fromC: null, toR: null, toC: null };
    capturedPieces = { white: [], black: [] };
    promotionPending = null;
    if (promotionModal) promotionModal.classList.add('hidden');
    
    if(moveHistoryList) moveHistoryList.innerHTML = ''; 
    updateCapturedPanels();

    clearInterval(countdownInterval);
    if (chosenMinutes === 'unlimited') {
        timerWhiteElement.innerText = "White: No Time";
        timerBlackElement.innerText = "Black: No Time";
    } else {
        const seconds = parseInt(chosenMinutes) * 60;
        whiteTimeLeft = seconds; blackTimeLeft = seconds;
        updateTimerDisplay(); startTimerLogic(); 
    }
    createBoard();
    showToast("Match Started! Good luck.", "info"); 

    if (currentMode === 'ai' && playerColor === 'Black' && isWhiteTurn) {
        setTimeout(() => makeAIMove(), 600);
    }
}

function startTimerLogic() {
    if (chosenMinutes === 'unlimited') return;
    countdownInterval = setInterval(() => {
        if (gameOver || promotionPending) return; // Terfi seçerken süreyi duraklat
        if (isWhiteTurn) {
            whiteTimeLeft--;
            if (whiteTimeLeft <= 0) { whiteTimeLeft = 0; handleTimeOut('White'); }
        } else {
            blackTimeLeft--;
            if (blackTimeLeft <= 0) { blackTimeLeft = 0; handleTimeOut('Black'); }
        }
        updateTimerDisplay();
    }, 1000);
}

function handleTimeOut(losingColor) {
    gameOver = true; clearInterval(countdownInterval); createBoard();
    showToast(`TIME OUT! Winner: ${losingColor === 'White' ? 'Black' : 'White'}`);
}

// ... Saat ve panel fonksiyonları aynı şekilde korunur ...
function updateTimerDisplay() {
    if (chosenMinutes === 'unlimited') return;
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    timerWhiteElement.innerText = `White: ${formatTime(whiteTimeLeft)}`;
    timerBlackElement.innerText = `Black: ${formatTime(blackTimeLeft)}`;
    if (isWhiteTurn) {
        timerWhiteElement.classList.add('active-turn'); timerBlackElement.classList.remove('active-turn');
    } else {
        timerBlackElement.classList.add('active-turn'); timerWhiteElement.classList.remove('active-turn');
    }
}

function updateCapturedPanels() {
    if (!capturedByWhiteList || !capturedByBlackList) return;
    capturedByWhiteList.innerHTML = ''; capturedByBlackList.innerHTML = '';
    capturedPieces.white.forEach(piece => {
        const img = document.createElement('img'); img.src = getExactSrc(piece); capturedByWhiteList.appendChild(img);
    });
    capturedPieces.black.forEach(piece => {
        const img = document.createElement('img'); img.src = getExactSrc(piece); capturedByBlackList.appendChild(img);
    });
}

function addMoveToHistory(piece, fromR, fromC, toR, toC, isCapture) {
    if (!moveHistoryList) return;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const pieceName = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
    const actionSymbol = isCapture ? 'x' : '-';
    const destination = files[toC] + rows[toR];
    const moveString = `${pieceName}(${files[fromC]}${rows[fromR]})${actionSymbol}${destination}`;
    
    if (piece === piece.toUpperCase()) { 
        const item = document.createElement('div');
        item.classList.add('history-item'); item.id = `history-row-${moveCount}`;
        item.innerText = `${moveCount}. ${moveString}`; moveHistoryList.appendChild(item);
    } else { 
        const item = document.getElementById(`history-row-${moveCount}`);
        if (item) item.innerText += `  |  ${moveString}`;
        moveCount++;
    }
    moveHistoryList.scrollTop = moveHistoryList.scrollHeight; 
}

function createBoard() {
    if (!boardElement) return; boardElement.innerHTML = ''; 
    if (currentMode === 'ai' && playerColor === 'Black') boardElement.style.transform = 'rotate(180deg)';
    else boardElement.style.transform = 'none';

    const whiteKingInCheck = isKingInCheck('White', boardLayout);
    const blackKingInCheck = isKingInCheck('Black', boardLayout);

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.classList.add('square', isLight ? 'light' : 'dark');
            square.style.position = 'relative'; square.dataset.row = row; square.dataset.col = col;

            if (currentMode === 'ai' && playerColor === 'Black') square.style.transform = 'rotate(180deg)';
            else square.style.transform = 'none';

            if ((row === lastMove.fromR && col === lastMove.fromC) || (row === lastMove.toR && col === lastMove.toC)) square.classList.add('last-move');
            if (selectedRow === row && selectedCol === col) square.classList.add('selected');

            if (selectedRow !== null && selectedCol !== null) {
                if (isValidMove(selectedRow, selectedCol, row, col, boardLayout)) {
                    const turnColor = isWhiteTurn ? 'White' : 'Black';
                    let tempBoard = JSON.parse(JSON.stringify(boardLayout));
                    tempBoard[row][col] = tempBoard[selectedRow][selectedCol]; tempBoard[selectedRow][selectedCol] = '';
                    if (!isKingInCheck(turnColor, tempBoard)) square.classList.add('possible-move');
                }
            }

            const piece = boardLayout[row][col];
            if (piece === 'K' && whiteKingInCheck) square.style.backgroundColor = '#ff4d4d';
            if (piece === 'k' && blackKingInCheck) square.style.backgroundColor = '#ff4d4d';

            square.addEventListener('dragover', (e) => e.preventDefault());
            square.addEventListener('drop', (e) => {
                e.preventDefault(); if (gameOver || isAISafeGuard() || promotionPending) return;
                executeMove(selectedRow, selectedCol, parseInt(square.dataset.row), parseInt(square.dataset.col));
            });
            square.addEventListener('click', () => {
                if (gameOver || isAISafeGuard() || promotionPending) return; handleSquareClick(row, col);
            });

            if (piece !== '') {
                const img = document.createElement('img'); img.src = getExactSrc(piece); 
                const isPieceWhite = piece === piece.toUpperCase();
                const currentTurnColor = isWhiteTurn ? 'White' : 'Black';
                let isAllowed = (isWhiteTurn && isPieceWhite) || (!isWhiteTurn && !isPieceWhite);
                if (currentMode === 'ai' && currentTurnColor !== playerColor) isAllowed = false; 

                if (isAllowed) {
                    img.draggable = true;
                    img.addEventListener('dragstart', () => {
                        selectedRow = row; selectedCol = col; setTimeout(() => createBoard(), 10);
                    });
                } else img.draggable = false;
                square.appendChild(img);
            }
            boardElement.appendChild(square);
        }
    }
}

function isAISafeGuard() {
    const currentTurnColor = isWhiteTurn ? 'White' : 'Black';
    return currentMode === 'ai' && currentTurnColor !== playerColor;
}

function handleSquareClick(row, col) {
    const piece = boardLayout[row][col];
    if (selectedRow === null && selectedCol === null) {
        if (piece !== '') {
            const isPieceWhite = piece === piece.toUpperCase();
            if ((isWhiteTurn && isPieceWhite) || (!isWhiteTurn && !isPieceWhite)) {
                selectedRow = row; selectedCol = col; createBoard();
            }
        }
    } else {
        if (selectedRow === row && selectedCol === col) {
            selectedRow = null; selectedCol = null; createBoard();
        } else executeMove(selectedRow, selectedCol, row, col);
    }
}

function executeMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow === null || fromCol === null) return;
    const turnColor = isWhiteTurn ? 'White' : 'Black';
    const movingPiece = boardLayout[fromRow][fromCol];
    const targetPiece = boardLayout[toRow][toCol];

    if (isValidMove(fromRow, fromCol, toRow, toCol, boardLayout)) {
        let tempBoard = JSON.parse(JSON.stringify(boardLayout));
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol]; tempBoard[fromRow][fromCol] = '';

        if (isKingInCheck(turnColor, tempBoard)) {
            showToast("Illegal Move! You must protect your King.", "info");
            selectedRow = null; selectedCol = null; createBoard(); return;
        }

        let isCaptureOccurred = false;
        if (targetPiece !== '') {
            isCaptureOccurred = true;
            if (isWhiteTurn) capturedPieces.white.push(targetPiece);
            else capturedPieces.black.push(targetPiece);
            updateCapturedPanels();
        }

        addMoveToHistory(movingPiece, fromRow, fromCol, toRow, toCol, isCaptureOccurred);

        lastMove = { fromR: fromRow, fromC: fromCol, toR: toRow, toC: toCol };
        boardLayout[toRow][toCol] = boardLayout[fromRow][fromCol];
        boardLayout[fromRow][fromCol] = '';

        // [GÜNCELLENDİ] GÖRSEL MODAL AÇAN PİYON TERFİ SİSTEMİ
        if ((movingPiece === 'P' && toRow === 0) || (movingPiece === 'p' && toRow === 7)) {
            promotionPending = { row: toRow, col: toCol, isWhite: (movingPiece === 'P') };
            openPromotionModal(movingPiece === 'P');
            return; // Sonraki aşamaları buton tıklaması yönetecek
        }

        completeMoveSequence();
    } else {
        if (fromRow !== toRow || fromCol !== toCol) showToast("Illegal Move!", "info");
        selectedRow = null; selectedCol = null; createBoard();
    }
}

// Modalı Görsel Olarak Açan ve Buton Resimlerini Atayan Fonksiyon
function openPromotionModal(isWhitePawn) {
    if (!promotionModal) return;
    
    // Modaldaki buton resimlerini o rengin şeffaf taş görselleriyle dinamik doldur
    document.getElementById('promo-Q').src = getExactSrc(isWhitePawn ? 'Q' : 'q');
    document.getElementById('promo-R').src = getExactSrc(isWhitePawn ? 'R' : 'r');
    document.getElementById('promo-B').src = getExactSrc(isWhitePawn ? 'B' : 'b');
    document.getElementById('promo-N').src = getExactSrc(isWhitePawn ? 'N' : 'n');

    promotionModal.classList.remove('hidden');
}

// Modal Butonlarına Tıklama Olayını Dinle (Sadece 1 kere bağlanır)
document.querySelectorAll('.promotion-options button').forEach(button => {
    button.addEventListener('click', (e) => {
        if (!promotionPending) return;

        let selectedPiece = button.getAttribute('data-piece'); // 'Q', 'R', 'B', 'N'
        if (!promotionPending.isWhite) selectedPiece = selectedPiece.toLowerCase();

        // Taş dönüşümünü uygula
        boardLayout[promotionPending.row][promotionPending.col] = selectedPiece;
        
        promotionModal.classList.add('hidden');
        promotionPending = null; // Kilidi kaldır

        completeMoveSequence();
    });
});

// Hamle Sonrası Sıra Değişimi ve Kontrolleri Tamamlayan Ortak Fonksiyon
function completeMoveSequence() {
    isWhiteTurn = !isWhiteTurn;
    selectedRow = null; selectedCol = null;
    updateTimerDisplay(); createBoard();

    const nextColor = isWhiteTurn ? 'White' : 'Black';
    if (isKingInCheck(nextColor, boardLayout)) {
        playSound('check');
        if (isCheckmate(nextColor)) {
            gameOver = true; clearInterval(countdownInterval); createBoard();
            showToast(`CHECKMATE! Game Over. Winner: ${isWhiteTurn ? 'Black' : 'White'}`);
            return;
        } else {
            showToast(`CHECK! ${nextColor} King is under attack.`);
        }
    } else {
        // Eğer hamlede bir taş yenildiyse ses çal
        const wasCapture = boardLayout[lastMove.toR][lastMove.toC] === ''; // Basit denetim
        playSound(capturedPieces.white.length + capturedPieces.black.length > 0 ? 'capture' : 'move');
    }

    if (currentMode === 'ai' && !gameOver) setTimeout(() => makeAIMove(), 600);
}

function makeAIMove() {
    if (gameOver || promotionPending) return;
    const aiColor = isWhiteTurn ? 'White' : 'Black';
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900, 'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900 };
    let allLegalMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardLayout[r][c];
            if (piece !== '') {
                const isPieceWhite = piece === piece.toUpperCase();
                if ((aiColor === 'White' && isPieceWhite) || (aiColor === 'Black' && !isPieceWhite)) {
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(r, c, tr, tc, boardLayout)) {
                                let tempBoard = JSON.parse(JSON.stringify(boardLayout));
                                tempBoard[tr][tc] = tempBoard[r][c]; tempBoard[r][c] = '';
                                if (!isKingInCheck(aiColor, tempBoard)) {
                                    let score = 0; const targetPiece = boardLayout[tr][tc];
                                    if (targetPiece !== '') score += pieceValues[targetPiece] * 10; 
                                    const enemyColor = aiColor === 'White' ? 'Black' : 'White';
                                    if (isKingInCheck(enemyColor, tempBoard)) score += 15;
                                    score += Math.random() * 2;
                                    allLegalMoves.push({ fromR: r, fromC: c, toR: tr, toC: tc, score: score });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (allLegalMoves.length === 0) {
        gameOver = true; clearInterval(countdownInterval); showToast("Game Over! AI has no legal moves."); return;
    }

    allLegalMoves.sort((a, b) => b.score - a.score);
    const bestMove = allLegalMoves[0]; 
    const aiMovingPiece = boardLayout[bestMove.fromR][bestMove.fromC];
    const aiTargetPiece = boardLayout[bestMove.toR][bestMove.toC];

    let isCaptureOccurred = false;
    if (aiTargetPiece !== '') {
        isCaptureOccurred = true;
        if (isWhiteTurn) capturedPieces.white.push(aiTargetPiece);
        else capturedPieces.black.push(aiTargetPiece);
        updateCapturedPanels();
    }

    addMoveToHistory(aiMovingPiece, bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC, isCaptureOccurred);

    lastMove = { fromR: bestMove.fromR, fromC: bestMove.fromC, toR: bestMove.toR, toC: bestMove.toC };
    boardLayout[bestMove.toR][bestMove.toC] = boardLayout[bestMove.fromR][bestMove.fromC];
    boardLayout[bestMove.fromR][bestMove.fromC] = '';

    // AI için Piyon Terfisi (AI doğrudan her zaman kraliçeyi seçer)
    if (aiMovingPiece === 'P' && bestMove.toR === 0) boardLayout[bestMove.toR][bestMove.toC] = 'Q';
    if (aiMovingPiece === 'p' && bestMove.toR === 7) boardLayout[bestMove.toR][bestMove.toC] = 'q';

    isWhiteTurn = !isWhiteTurn; 
    updateTimerDisplay(); createBoard();

    if (isKingInCheck(playerColor, boardLayout)) {
        playSound('check');
        if (isCheckmate(playerColor)) {
            gameOver = true; clearInterval(countdownInterval); createBoard();
            showToast("CHECKMATE! AI has won the match.");
        } else showToast("CHECK! Your King is under attack."); 
    } else {
        playSound(isCaptureOccurred ? 'capture' : 'move');
    }
}

// --- STANDARD PIECE RULES ---
function isValidMove(fromRow, fromCol, toRow, toCol, currentBoard) {
    if (fromRow === toRow && fromCol === toCol) return false;
    const movingPiece = currentBoard[fromRow][fromCol]; const targetPiece = currentBoard[toRow][toCol];
    if (movingPiece === '') return false;
    if (targetPiece !== '') {
        const isSourceWhite = movingPiece === movingPiece.toUpperCase();
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if (isSourceWhite === isTargetWhite) return false;
    }
    const rowDiff = toRow - fromRow; const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff); const absColDiff = Math.abs(colDiff);

    if (movingPiece === 'P') {
        if (rowDiff === -1 && colDiff === 0 && targetPiece === '') return true;
        if (fromRow === 6 && rowDiff === -2 && colDiff === 0 && currentBoard[5][fromCol] === '' && targetPiece === '') return true;
        if (rowDiff === -1 && absColDiff === 1 && targetPiece !== '') return true; return false;
    }
    if (movingPiece === 'p') {
        if (rowDiff === 1 && colDiff === 0 && targetPiece === '') return true;
        if (fromRow === 1 && rowDiff === 2 && colDiff === 0 && currentBoard[2][fromCol] === '' && targetPiece === '') return true;
        if (rowDiff === 1 && absColDiff === 1 && targetPiece !== '') return true; return false;
    }
    if (movingPiece.toLowerCase() === 'r') {
        if (fromRow !== toRow && fromCol !== toCol) return false; return isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);
    }
    if (movingPiece.toLowerCase() === 'b') {
        if (absRowDiff !== absColDiff) return false; return isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);
    }
    if (movingPiece.toLowerCase() === 'q') {
        if (fromRow !== toRow && fromCol !== toCol && absRowDiff !== absColDiff) return false; return isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);
    }
    if (movingPiece.toLowerCase() === 'k') {
        if (absRowDiff <= 1 && absColDiff <= 1) return true; return false;
    }
    if (movingPiece.toLowerCase() === 'n') {
        if ((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2)) return true; return false;
    }
    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol, currentBoard) {
    const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
    const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
    let checkRow = fromRow + rowStep; let checkCol = fromCol + colStep;
    while (checkRow !== toRow || checkCol !== toCol) {
        if (currentBoard[checkRow][checkCol] !== '') return false;
        checkRow += rowStep; checkCol += colStep;
    }
    return true;
}

function isKingInCheck(color, currentBoard) {
    let kingRow = -1, kingCol = -1; const kingChar = color === 'White' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (currentBoard[r][c] === kingChar) { kingRow = r; kingCol = c; break; }
        }
    }
    if (kingRow === -1) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = currentBoard[r][c];
            if (piece !== '') {
                const isPieceWhite = piece === piece.toUpperCase();
                if ((color === 'White' && !isPieceWhite) || (color === 'Black' && isPieceWhite)) {
                    if (isValidMove(r, c, kingRow, kingCol, currentBoard)) return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(color) {
    for (let fromRow = 0; fromRow < 8; fromRow++) {
        for (let fromCol = 0; fromCol < 8; fromCol++) {
            const piece = boardLayout[fromRow][fromCol];
            if (piece !== '') {
                const isPieceWhite = piece === piece.toUpperCase();
                if ((color === 'White' && isPieceWhite) || (color === 'Black' && !isPieceWhite)) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (isValidMove(fromRow, fromCol, toRow, toCol, boardLayout)) {
                                let tempBoard = JSON.parse(JSON.stringify(boardLayout));
                                tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol]; tempBoard[fromRow][fromCol] = '';
                                if (!isKingInCheck(color, tempBoard)) return false; 
                            }
                        }
                    }
                }
            }
        }
    }
    return true; 
}

if (btnRestart) btnRestart.addEventListener('click', () => resetGameEngine());
if (btnExit) {
    btnExit.addEventListener('click', () => {
        if (confirm("Do you want to return to the launcher platform?")) {
            clearInterval(countdownInterval); window.close();
        }
    });
}
