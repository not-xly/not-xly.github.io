// === CARGA DE DATOS ===
let shardsData = {};
let prices = {};
let craftingRules = [];

// === CARGAR SHARDS.JSON ===
async function loadShards() {
    try {
        const res = await fetch('shards.json');
        shardsData = await res.json();
        displayShards();
    } catch (err) {
        document.getElementById('shardsGrid').innerHTML = '<p>Error cargando Shards</p>';
        console.error(err);
    }
}

// === CARGAR CRAFTS.JSON ===
async function loadCrafts() {
    try {
        const res = await fetch('crafts.json');
        craftingRules = await res.json();
        displayCrafts();
    } catch (err) {
        document.getElementById('craftingList').innerText = 'Error cargando crafteos.';
        console.error(err);
    }
}

// === MOSTRAR SHARDS COMO TARJETAS ===
function displayShards() {
    const grid = document.getElementById('shardsGrid');
    grid.innerHTML = '';

    Object.values(shardsData).forEach(shard => {
        const card = document.createElement('div');
        card.className = 'shard-card';

        card.innerHTML = `
            <div class="shard-name">${shard.name}</div>
            <div class="shard-rarity">${shard.rarity}</div>
            <div class="shard-effect-name">${shard.effectName}</div>
            <div class="shard-family">${shard.family}</div>
            <div class="shard-description">${shard.description}</div>
        `;

        grid.appendChild(card);
    });
}

// === MOSTRAR CRAFTEOS ===
function displayCrafts() {
    const list = document.getElementById('craftingList');
    let text = '';

    craftingRules.forEach(rule => {
        const inputNames = rule.input.map(id => {
            const s = Object.values(shardsData).find(s => s.id === id);
            return s ? s.name : id;
        }).join(' + ');

        const outputShard = Object.values(shardsData).find(s => s.id === rule.output);
        const outputName = outputShard ? outputShard.name : rule.output;

        text += `${inputNames} → ${outputName}\n`;
    });

    list.innerText = text || 'No hay crafteos disponibles.';
}

// === OBTENER PRECIOS DE COFLNET ===
async function fetchPrice(itemId) {
    try {
        const res = await fetch(`https://api.coflnet.com/skyblock/auctions/data/${itemId}`);
        const data = await res.json();
        return {
            instaBuy: data.min || 0,
            instaSell: data.max || 0,
            buyOrder: data.buyOrder || 0,
            sellOrder: data.sellOrder || 0
        };
    } catch (err) {
        return { instaBuy: 0, instaSell: 0, buyOrder: 0, sellOrder: 0 };
    }
}

// === ACTUALIZAR TODOS LOS PRECIOS ===
async function updateAllPrices() {
    const priceBtn = document.querySelector('#calculator .actions button');
    priceBtn.disabled = true;
    priceBtn.innerText = 'Cargando...';

    prices = {};

    const ids = Object.values(shardsData).map(s => s.id);
    const pricePromises = ids.map(async id => {
        prices[id] = await fetchPrice(id);
    });

    await Promise.all(pricePromises);

    calculateProfit();
    priceBtn.disabled = false;
    priceBtn.innerText = 'Actualizar Precios';
}

// === CALCULAR RENTABILIDAD ===
function calculateProfit() {
    const tbody = document.getElementById('profitTable').querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="5">Calculando...</td></tr>';

    const results = [];

    craftingRules.forEach(rule => {
        const inputCost = rule.input.reduce((sum, inputId) => {
            return sum + (prices[inputId]?.instaBuy || 0);
        }, 0);

        const outputValue = prices[rule.output]?.instaSell || 0;
        const profit = outputValue - inputCost;
        const roi = inputCost > 0 ? (profit / inputCost) * 100 : 0;

        if (inputCost > 0) {
            const inputShard = Object.values(shardsData).find(s => s.id === rule.input[0]);
            const outputShard = Object.values(shardsData).find(s => s.id === rule.output);

            results.push({
                craft: `${inputShard?.name || 'Unknown'} → ${outputShard?.name || 'Unknown'}`,
                cost: Math.round(inputCost),
                revenue: Math.round(outputValue),
                profit: Math.round(profit),
                roi: roi.toFixed(1) + '%'
            });
        }
    });

    // Ordenar por ganancia (descendente)
    results.sort((a, b) => b.profit - a.profit);

    // Mostrar Top 10
    tbody.innerHTML = results.slice(0, 10).map(r => {
        const profitClass = r.profit >= 0 ? 'profit-positive' : 'profit-negative';
        return `
            <tr>
                <td>${r.craft}</td>
                <td>${r.cost.toLocaleString()}</td>
                <td>${r.revenue.toLocaleString()}</td>
                <td class="${profitClass}">${r.profit.toLocaleString()}</td>
                <td>${r.roi}</td>
            </tr>
        `;
    }).join('');

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No hay datos</td></tr>';
    }
}

// === PESTAÑAS ===
function showSection(id) {
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[onclick="showSection('${id}')"]`).classList.add('active');
}

// === CARGA INICIAL ===
window.onload = () => {
    loadShards();
    loadCrafts();
};
