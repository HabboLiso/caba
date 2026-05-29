const STORAGE_KEY = "questify_mobile_first_app";

const categories = {
  study: { name: "Estudo", icon: "📚" },
  fitness: { name: "Treino", icon: "💪" },
  home: { name: "Casa", icon: "🧹" },
  health: { name: "Saúde", icon: "💧" },
  creative: { name: "Criativo", icon: "🎸" },
  life: { name: "Vida", icon: "🌟" }
};

const difficulties = {
  easy: { name: "Fácil", xp: 25, coins: 8 },
  medium: { name: "Média", xp: 45, coins: 14 },
  hard: { name: "Difícil", xp: 75, coins: 24 },
  legendary: { name: "Lendária", xp: 130, coins: 42 }
};

const skins = [
  {
    id: "default",
    name: "Mago Inicial",
    emoji: "🧙",
    className: "",
    price: 0,
    desc: "A primeira forma do seu herói."
  },
  {
    id: "forest",
    name: "Guardião Verde",
    emoji: "🧝",
    className: "forest",
    price: 90,
    desc: "Para quem cultiva bons hábitos."
  },
  {
    id: "ember",
    name: "Cavaleiro de Brasa",
    emoji: "🦸",
    className: "ember",
    price: 150,
    desc: "Feito para missões difíceis."
  },
  {
    id: "ocean",
    name: "Mago das Marés",
    emoji: "🧞",
    className: "ocean",
    price: 220,
    desc: "Calmo, focado e poderoso."
  },
  {
    id: "shadow",
    name: "Ninja Anti-Procrastinação",
    emoji: "🥷",
    className: "shadow",
    price: 320,
    desc: "Aparece quando a distração some."
  }
];

const defaultState = {
  xp: 0,
  coins: 35,
  completed: 0,
  streak: 0,
  lastCompletedDate: "",
  guildName: "Guilda Aurora",
  guildXp: 0,
  ownedSkins: ["default"],
  equippedSkin: "default",
  missions: [
    createMission("Beber água", "health", "easy"),
    createMission("Ler 10 páginas", "study", "easy"),
    createMission("Treinar por 20 minutos", "fitness", "medium")
  ],
  bosses: [
    createBoss("Estudar 2 horas para a prova", "study", "hard", [
      "25 min de estudo",
      "5 min de pausa",
      "Revisar resumo",
      "Fazer exercícios"
    ])
  ],
  friends: [
    { name: "Luna", title: "Arqueira dos Hábitos", xp: 690 },
    { name: "Kai", title: "Mago do Pomodoro", xp: 520 },
    { name: "Bia", title: "Paladina da Rotina", xp: 340 }
  ]
};

let state = loadState();

let modalMode = "mission";

let timer = {
  total: 25 * 60,
  left: 25 * 60,
  interval: null,
  running: false
};

let audioContext = null;
let musicNodes = [];
let musicOn = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupModal();
  setupForm();
  setupQuickActions();
  setupGuild();
  setupFocusMode();
  setupAI();

  render();
});

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createMission(name, category, difficulty) {
  return {
    id: createId(),
    name,
    category,
    difficulty,
    createdAt: Date.now()
  };
}

function createBoss(name, category, difficulty, phaseTexts) {
  return {
    id: createId(),
    name,
    category,
    difficulty,
    createdAt: Date.now(),
    phases: phaseTexts.map(text => ({
      id: createId(),
      text,
      done: false
    }))
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    return {
      ...structuredClone(defaultState),
      ...JSON.parse(saved)
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setupTabs() {
  [...$$(".tab"), ...$$(".bottom-link")].forEach(button => {
    button.addEventListener("click", () => {
      openTab(button.dataset.tab);
    });
  });
}

function openTab(tabId) {
  $$(".tab-content").forEach(section => {
    section.classList.toggle("active", section.id === tabId);
  });

  [...$$(".tab"), ...$$(".bottom-link")].forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupModal() {
  $("#openTaskModal").addEventListener("click", () => openTaskModal("mission"));
  $("#createMissionBtn").addEventListener("click", () => openTaskModal("mission"));
  $("#addMissionSmall").addEventListener("click", () => openTaskModal("mission"));
  $("#addBossSmall").addEventListener("click", () => openTaskModal("boss"));

  $("#closeModal").addEventListener("click", closeTaskModal);

  $("#taskModal").addEventListener("click", event => {
    if (event.target.id === "taskModal") {
      closeTaskModal();
    }
  });

  $("#taskType").addEventListener("change", () => {
    updatePhaseVisibility();
  });
}

function openTaskModal(type) {
  modalMode = type;
  $("#taskForm").reset();
  $("#taskType").value = type;
  $("#modalTitle").textContent = type === "boss" ? "Novo Boss Fight" : "Nova missão";
  $("#bossPhases").value = "25 min de foco\n5 min de pausa\nRevisar progresso\nFinalizar parte difícil";
  updatePhaseVisibility();
  $("#taskModal").classList.add("active");
}

function closeTaskModal() {
  $("#taskModal").classList.remove("active");
}

function updatePhaseVisibility() {
  const isBoss = $("#taskType").value === "boss";
  $("#phasesLabel").classList.toggle("hidden", !isBoss);
}

function setupForm() {
  $("#taskForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("#taskName").value.trim();
    const category = $("#taskCategory").value;
    const difficulty = $("#taskDifficulty").value;
    const type = $("#taskType").value;

    if (!name) {
      showToast("Digite o nome da missão.");
      return;
    }

    if (type === "boss") {
      const phases = $("#bossPhases").value
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean);

      if (phases.length === 0) {
        showToast("Adicione pelo menos uma fase para o boss.");
        return;
      }

      state.bosses.unshift(createBoss(name, category, difficulty, phases));
      openTab("bosses");
      showToast("Boss Fight criado!");
    } else {
      state.missions.unshift(createMission(name, category, difficulty));
      openTab("missions");
      showToast("Missão criada!");
    }

    saveState();
    render();
    closeTaskModal();
  });
}

function setupQuickActions() {
  $$(".quick-actions button").forEach(button => {
    button.addEventListener("click", () => {
      const [name, category, difficulty] = button.dataset.quick.split("|");
      state.missions.unshift(createMission(name, category, difficulty));
      saveState();
      render();
      showToast("Missão rápida adicionada!");
    });
  });
}

function setupGuild() {
  $("#saveGuild").addEventListener("click", () => {
    const name = $("#guildInput").value.trim();

    if (!name) {
      showToast("Digite um nome para a guilda.");
      return;
    }

    state.guildName = name;
    $("#guildInput").value = "";
    saveState();
    render();
    showToast("Guilda renomeada!");
  });

  $("#claimGuildReward").addEventListener("click", () => {
    if (state.guildXp < 1200) {
      showToast("A guilda ainda não juntou XP suficiente.");
      return;
    }

    state.guildXp -= 1200;
    state.coins += 100;
    state.xp += 80;

    saveState();
    render();
    showToast("Baú resgatado! +100 cristais e +80 XP.");
  });
}

function setupFocusMode() {
  $("#startFocusTop").addEventListener("click", openFocus);
  $("#exitFocus").addEventListener("click", closeFocus);
  $("#startTimer").addEventListener("click", startTimer);
  $("#pauseTimer").addEventListener("click", pauseTimer);
  $("#toggleMusic").addEventListener("click", toggleMusic);

  $$("[data-time]").forEach(button => {
    button.addEventListener("click", () => {
      setTimer(Number(button.dataset.time));
    });
  });
}

function openFocus(title = "Modo Foco", subtitle = "Bloqueie distrações e finalize sua missão.") {
  $("#focusTitle").textContent = title;
  $("#focusSubtitle").textContent = subtitle;
  $("#focusScreen").classList.add("active");
  updateTimerUI();
}

function closeFocus() {
  pauseTimer();
  stopMusic();
  $("#focusScreen").classList.remove("active");
}

function setTimer(minutes) {
  pauseTimer();
  timer.total = minutes * 60;
  timer.left = timer.total;
  updateTimerUI();
}

function startTimer() {
  if (timer.running) return;

  timer.running = true;
  $("#timerStatus").textContent = "em andamento";

  timer.interval = setInterval(() => {
    timer.left--;

    if (timer.left <= 0) {
      finishTimer();
      return;
    }

    updateTimerUI();
  }, 1000);
}

function pauseTimer() {
  timer.running = false;
  clearInterval(timer.interval);
  timer.interval = null;
  updateTimerUI();
}

function finishTimer() {
  pauseTimer();

  const minutes = Math.round(timer.total / 60);
  const bonusXp = Math.max(5, Math.round(minutes / 2));
  const bonusCoins = Math.max(1, Math.round(minutes / 10));

  state.xp += bonusXp;
  state.coins += bonusCoins;

  saveState();
  render();
  closeFocus();

  showToast(`Sessão concluída! +${bonusXp} XP e +${bonusCoins} cristais.`);
}

function updateTimerUI() {
  const min = Math.floor(timer.left / 60);
  const sec = timer.left % 60;

  $("#timerText").textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  const progress = ((timer.total - timer.left) / timer.total) * 100;
  $("#timerRing").style.setProperty("--progress", `${progress}%`);

  if (!timer.running) {
    $("#timerStatus").textContent = timer.left === timer.total ? "pronto" : "pausado";
  }
}

function toggleMusic() {
  if (musicOn) {
    stopMusic();
  } else {
    startMusic();
  }
}

function startMusic() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;

  if (!AudioCtx) {
    showToast("Seu navegador não suporta áudio.");
    return;
  }

  audioContext = new AudioCtx();

  const gain = audioContext.createGain();
  gain.gain.value = 0.035;
  gain.connect(audioContext.destination);

  [110, 165, 220].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = index === 0 ? "sine" : "triangle";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start();
    musicNodes.push(oscillator);
  });

  musicOn = true;
  $("#toggleMusic").textContent = "Trilha: on";
}

function stopMusic() {
  musicNodes.forEach(node => {
    try {
      node.stop();
    } catch {}
  });

  musicNodes = [];
  musicOn = false;
  $("#toggleMusic").textContent = "Trilha: off";
}

function setupAI() {
  $("#generateQuests").addEventListener("click", () => {
    const goal = $("#aiGoal").value.trim();

    if (!goal) {
      showToast("Digite um objetivo primeiro.");
      return;
    }

    const generated = generateAIQuests(goal);
    renderAIResults(generated);
  });
}

function generateAIQuests(goal) {
  const text = goal.toLowerCase();

  let category = "life";

  if (text.includes("estud") || text.includes("prova") || text.includes("inglês") || text.includes("ingles") || text.includes("ler")) {
    category = "study";
  } else if (text.includes("trein") || text.includes("academia") || text.includes("exerc")) {
    category = "fitness";
  } else if (text.includes("quarto") || text.includes("casa") || text.includes("arrum")) {
    category = "home";
  } else if (text.includes("água") || text.includes("agua") || text.includes("sono") || text.includes("saúde")) {
    category = "health";
  } else if (text.includes("violão") || text.includes("violao") || text.includes("desenho") || text.includes("música")) {
    category = "creative";
  }

  return [
    {
      type: "mission",
      name: `Começar ${goal} por 10 minutos`,
      category,
      difficulty: "easy"
    },
    {
      type: "mission",
      name: `Fazer uma sessão focada de ${goal}`,
      category,
      difficulty: "medium"
    },
    {
      type: "boss",
      name: `Boss: dominar ${goal}`,
      category,
      difficulty: "hard",
      phases: [
        `25 min focado em ${goal}`,
        "5 min de pausa",
        "Revisar o que foi feito",
        "Finalizar a parte mais difícil"
      ]
    }
  ];
}

function renderAIResults(results) {
  const container = $("#aiResults");
  container.innerHTML = "";

  results.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";

    const icon = item.type === "boss" ? "🐉" : categories[item.category].icon;

    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${icon}</div>
        <div>
          <h3>${item.name}</h3>
          <p>${item.type === "boss" ? "Boss Fight criado pelo Mestre IA." : "Missão criada pelo Mestre IA."}</p>
        </div>
      </div>

      <div class="pills">
        <span class="pill">${categories[item.category].name}</span>
        <span class="pill gold">${difficulties[item.difficulty].name}</span>
        <span class="pill ${item.type === "boss" ? "red" : "green"}">${item.type === "boss" ? "Boss" : "Quest"}</span>
      </div>

      <div class="card-actions">
        <button class="complete">Adicionar</button>
      </div>
    `;

    card.querySelector("button").addEventListener("click", () => {
      if (item.type === "boss") {
        state.bosses.unshift(createBoss(item.name, item.category, item.difficulty, item.phases));
        openTab("bosses");
      } else {
        state.missions.unshift(createMission(item.name, item.category, item.difficulty));
        openTab("missions");
      }

      saveState();
      render();
      showToast("Quest adicionada!");
    });

    container.appendChild(card);
  });
}

function render() {
  renderStats();
  renderMissions();
  renderBosses();
  renderGuild();
  renderShop();
}

function renderStats() {
  const level = getLevel();

  $("#totalXp").textContent = state.xp;
  $("#coins").textContent = state.coins;
  $("#streak").textContent = state.streak;
  $("#completedCount").textContent = state.completed;

  $("#heroTitle").textContent = getHeroTitle(level.level);
  $("#levelText").textContent = `Nível ${level.level} • ${level.current}/${level.needed} XP`;
  $("#xpBar").style.width = `${level.percent}%`;

  const skin = skins.find(skin => skin.id === state.equippedSkin) || skins[0];
  const avatar = $("#characterAvatar");

  avatar.textContent = skin.emoji;
  avatar.className = `character ${skin.className}`;

  const pet = getPet();
  $("#petEmoji").textContent = pet.emoji;
  $("#petName").textContent = pet.name;
  $("#petDescription").textContent = pet.desc;
}

function renderMissions() {
  const container = $("#missionList");
  container.innerHTML = "";

  if (state.missions.length === 0) {
    container.innerHTML = `<div class="empty">Nenhuma missão ativa. Crie uma nova quest para ganhar XP.</div>`;
    return;
  }

  state.missions.forEach(mission => {
    const diff = difficulties[mission.difficulty];
    const cat = categories[mission.category];

    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${cat.icon}</div>
        <div>
          <h3>${mission.name}</h3>
          <p>${cat.name} • ${diff.name}</p>
        </div>
      </div>

      <div class="pills">
        <span class="pill green">+${diff.xp} XP</span>
        <span class="pill gold">+${diff.coins} cristais</span>
      </div>

      <div class="card-actions">
        <button class="complete">Completar</button>
        <button class="focus">Focar</button>
        <button class="delete">Remover</button>
      </div>
    `;

    card.querySelector(".complete").addEventListener("click", () => completeMission(mission.id));
    card.querySelector(".delete").addEventListener("click", () => deleteMission(mission.id));
    card.querySelector(".focus").addEventListener("click", () => {
      openFocus(mission.name, "Faça essa missão sem distrações.");
    });

    container.appendChild(card);
  });
}

function renderBosses() {
  const container = $("#bossList");
  container.innerHTML = "";

  if (state.bosses.length === 0) {
    container.innerHTML = `<div class="empty">Nenhum boss ativo. Crie uma tarefa difícil para enfrentar.</div>`;
    return;
  }

  state.bosses.forEach(boss => {
    const diff = difficulties[boss.difficulty];
    const cat = categories[boss.category];

    const done = boss.phases.filter(phase => phase.done).length;
    const progress = Math.round((done / boss.phases.length) * 100);

    const card = document.createElement("article");
    card.className = "card boss-card";

    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">🐉</div>
        <div>
          <h3>${boss.name}</h3>
          <p>${cat.name} • ${diff.name} • HP restante: ${100 - progress}%</p>
        </div>
      </div>

      <div class="xp-track">
        <div class="xp-bar" style="width: ${progress}%"></div>
      </div>

      <div class="pills">
        <span class="pill red">Boss Fight</span>
        <span class="pill green">+${Math.round(diff.xp * 2.2)} XP</span>
        <span class="pill gold">+${Math.round(diff.coins * 2.2)} cristais</span>
      </div>

      <div class="phases"></div>

      <div class="card-actions">
        <button class="delete">Remover boss</button>
      </div>
    `;

    const phasesBox = card.querySelector(".phases");

    boss.phases.forEach(phase => {
      const phaseEl = document.createElement("div");
      phaseEl.className = `phase ${phase.done ? "done" : ""}`;

      phaseEl.innerHTML = `
        <strong>${phase.done ? "✅" : "⬜"} ${phase.text}</strong>
        <button>${phase.done ? "Desfazer" : "Concluir"}</button>
      `;

      phaseEl.querySelector("button").addEventListener("click", () => {
        togglePhase(boss.id, phase.id);
      });

      phasesBox.appendChild(phaseEl);
    });

    card.querySelector(".delete").addEventListener("click", () => {
      state.bosses = state.bosses.filter(item => item.id !== boss.id);
      saveState();
      render();
      showToast("Boss removido.");
    });

    container.appendChild(card);
  });
}

function renderGuild() {
  $("#guildName").textContent = state.guildName;

  const guildProgress = Math.min(100, (state.guildXp / 1200) * 100);
  $("#guildBar").style.width = `${guildProgress}%`;
  $("#guildXp").textContent = `${state.guildXp}/1200 XP`;

  const ranking = [
    {
      name: "Você",
      title: getHeroTitle(getLevel().level),
      xp: state.xp
    },
    ...state.friends
  ].sort((a, b) => b.xp - a.xp);

  const container = $("#ranking");
  container.innerHTML = "";

  ranking.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "rank-row";

    row.innerHTML = `
      <div class="rank-number">${index + 1}</div>
      <div>
        <strong>${player.name}</strong>
        <p>${player.title}</p>
      </div>
      <strong>${player.xp} XP</strong>
    `;

    container.appendChild(row);
  });
}

function renderShop() {
  const container = $("#shopGrid");
  container.innerHTML = "";

  skins.forEach(skin => {
    const owned = state.ownedSkins.includes(skin.id);
    const equipped = state.equippedSkin === skin.id;

    const item = document.createElement("article");
    item.className = "shop-item";

    item.innerHTML = `
      <div class="skin-preview ${skin.className}">${skin.emoji}</div>
      <h3>${skin.name}</h3>
      <p>${skin.desc}</p>

      <div class="pills">
        <span class="pill gold">${skin.price} cristais</span>
        ${owned ? `<span class="pill green">Comprado</span>` : `<span class="pill">Bloqueado</span>`}
      </div>

      <button class="${equipped ? "secondary-btn" : "primary-btn"} small">
        ${equipped ? "Equipado" : owned ? "Equipar" : "Comprar"}
      </button>
    `;

    item.querySelector("button").addEventListener("click", () => {
      buyOrEquipSkin(skin.id);
    });

    container.appendChild(item);
  });
}

function completeMission(id) {
  const mission = state.missions.find(item => item.id === id);
  if (!mission) return;

  const reward = difficulties[mission.difficulty];

  state.xp += reward.xp;
  state.coins += reward.coins;
  state.guildXp += reward.xp;
  state.completed++;

  updateStreak();

  state.missions = state.missions.filter(item => item.id !== id);

  saveState();
  render();

  showToast(`Missão completa! +${reward.xp} XP e +${reward.coins} cristais.`);
}

function deleteMission(id) {
  state.missions = state.missions.filter(item => item.id !== id);
  saveState();
  render();
  showToast("Missão removida.");
}

function togglePhase(bossId, phaseId) {
  const boss = state.bosses.find(item => item.id === bossId);
  if (!boss) return;

  const phase = boss.phases.find(item => item.id === phaseId);
  if (!phase) return;

  phase.done = !phase.done;

  const defeated = boss.phases.every(item => item.done);

  if (defeated) {
    const reward = difficulties[boss.difficulty];

    const xp = Math.round(reward.xp * 2.2);
    const coins = Math.round(reward.coins * 2.2);

    state.xp += xp;
    state.coins += coins;
    state.guildXp += xp;
    state.completed++;

    updateStreak();

    state.bosses = state.bosses.filter(item => item.id !== bossId);

    showToast(`Boss derrotado! +${xp} XP e +${coins} cristais.`);
  } else {
    showToast(phase.done ? "Fase concluída!" : "Fase reaberta.");
  }

  saveState();
  render();
}

function buyOrEquipSkin(id) {
  const skin = skins.find(item => item.id === id);
  if (!skin) return;

  const owned = state.ownedSkins.includes(id);

  if (owned) {
    state.equippedSkin = id;
    saveState();
    render();
    showToast(`${skin.name} equipada!`);
    return;
  }

  if (state.coins < skin.price) {
    showToast("Cristais insuficientes. Complete mais missões.");
    return;
  }

  state.coins -= skin.price;
  state.ownedSkins.push(id);
  state.equippedSkin = id;

  saveState();
  render();
  showToast(`${skin.name} comprada e equipada!`);
}

function updateStreak() {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (state.lastCompletedDate === today) return;

  if (state.lastCompletedDate === yesterday) {
    state.streak++;
  } else {
    state.streak = 1;
  }

  state.lastCompletedDate = today;
}

function getLevel() {
  const level = Math.floor(Math.sqrt(state.xp / 100)) + 1;
  const previous = Math.pow(level - 1, 2) * 100;
  const next = Math.pow(level, 2) * 100;

  return {
    level,
    current: state.xp - previous,
    needed: next - previous,
    percent: ((state.xp - previous) / (next - previous)) * 100
  };
}

function getHeroTitle(level) {
  if (level >= 12) return "Lenda da Produtividade";
  if (level >= 8) return "Campeão do Foco";
  if (level >= 5) return "Caçador de Bosses";
  if (level >= 3) return "Aventureiro Disciplinado";
  return "Herói Iniciante";
}

function getPet() {
  const points = state.completed + state.streak;

  if (points >= 25) {
    return {
      emoji: "🐉",
      name: "Dragão dos Hábitos",
      desc: "Seu mascote virou uma lenda da constância."
    };
  }

  if (points >= 14) {
    return {
      emoji: "🐺",
      name: "Lobo Estelar",
      desc: "Ele está forte por causa da sua disciplina."
    };
  }

  if (points >= 7) {
    return {
      emoji: "🦊",
      name: "Raposa Arcana",
      desc: "Seu mascote já acompanha suas missões."
    };
  }

  if (points >= 3) {
    return {
      emoji: "🐣",
      name: "Filhote Místico",
      desc: "Ele nasceu! Continue completando quests."
    };
  }

  return {
    emoji: "🥚",
    name: "Ovo Místico",
    desc: "Complete missões para fazer seu mascote evoluir."
  };
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}