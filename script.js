// --- LÓGICA DO TWITTER CLONE ---

const tweetForm = document.getElementById('tweetForm');
const tweetContent = document.getElementById('tweetContent');
const charCounter = document.getElementById('charCounter');
const timeline = document.getElementById('timeline');

// 1. Contador de Caracteres (Igual ao limite do Twitter)
tweetContent.addEventListener('input', () => {
    const remaining = 280 - tweetContent.value.length;
    charCounter.textContent = remaining;
    
    if (remaining <= 20) {
        charCounter.style.color = '#e0245e'; // Fica vermelho se faltar pouco
    } else {
        charCounter.style.color = '#889
