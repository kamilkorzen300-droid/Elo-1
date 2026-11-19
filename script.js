
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// =========================
// GTA VI - OPEN CITY
// =========================

const container = document.getElementById("game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x92c9e8);
scene.fog = new THREE.Fog(0x92c9e8, 90, 280);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x58634d, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(70, 100, 40);
sun.castShadow = true;
scene.add(sun);

const clock = new THREE.Clock();

// =========================
// GAME STATE
// =========================

const game = {
  cash: 500,
  bank: 0,
  wanted: 0,
  inCar: false,
  currentCar: null,
  houseOwned: false,
  insideHouse: false,
  weapon: "Blaster",
  weapons: ["Blaster"],
  keys: {},
  joystick: { x: 0, y: 0 },
  sprint: false,
  jump: false,
  velocityY: 0,
  nearest: null,
  toastTimer: null,
  mission: 0,
  missionDone: false,
  missionProgress: 0,
  cameraYaw: 0,
  cameraPitch: 0.24,
  cameraDragging: false,
  lastPointer: { x: 0, y: 0 },
  actionCooldown: 0
};

// =========================
// UI HELPERS
// =========================

const $ = id => document.getElementById(id);

function updateUI() {
  $("cash").textContent = game.cash;
  $("wanted").textContent = "★".repeat(game.wanted) + "☆".repeat(5 - game.wanted);
  $("weapon").textContent = game.weapon;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(game.toastTimer);
  game.toastTimer = setTimeout(() => el.style.display = "none", 2400);
}

function setStatus(message) {
  $("status").textContent = message;
}

function setMission(title, desc, progress = 0) {
  $("missionTitle").textContent = title;
  $("missionDesc").textContent = desc;
  $("progressBar").style.width = `${progress}%`;
}

function openMenu(title, html) {
  $("menuTitle").textContent = title;
  $("menuContent").innerHTML = html;
  $("menuOverlay").style.display = "flex";
}

function closeMenu() {
  $("menuOverlay").style.display = "none";
}

$("closeMenu").addEventListener("click", closeMenu);
$("menuOverlay").addEventListener("click", e => {
  if (e.target === $("menuOverlay")) closeMenu();
});

// =========================
// WORLD
// =========================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshStandardMaterial({ color: 0x63a05b })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function box(x, y, z, w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// roads
function road(x, z, w, d) {
  box(x, 0.02, z, w, 0.08, d, 0x35383c);
}

road(0, 0, 300, 18);
road(0, 50, 300, 14);
road(0, -50, 300, 14);
road(0, 100, 300, 14);
road(0, -100, 300, 14);
road(50, 0, 14, 300);
road(-50, 0, 14, 300);
road(100, 0, 14, 300);
road(-100, 0, 14, 300);

// road markings
for (let x = -140; x <= 140; x += 12) {
  box(x, 0.09, 0, 4, 0.03, 0.25, 0xffdd77);
  box(x, 0.09, 50, 4, 0.03, 0.25, 0xffdd77);
  box(x, 0.09, -50, 4, 0.03, 0.25, 0xffdd77);
}

// =========================
// BUILDINGS
// =========================

const buildings = [];

function building(x, z, w, d, h, color, name = "Budynek") {
  const body = box(x, 0, z, w, h, d, color);

  // windows
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ed8ed,
    emissive: 0x244b5d,
    emissiveIntensity: 0.25
  });

  for (let y = 4; y < h - 2; y += 5) {
    for (let wx = -w / 2 + 2; wx < w / 2 - 1; wx += 4) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.12), windowMaterial);
      win.position.set(x + wx, y, z + d / 2 + 0.08);
      scene.add(win);

      const win2 = win.clone();
      win2.position.z = z - d / 2 - 0.08;
      scene.add(win2);
    }
  }

  buildings.push({ x, z, w, d, h, name, body });
  return body;
}

// city blocks
for (let x = -130; x <= 130; x += 35) {
  for (let z = -130; z <= 130; z += 35) {
    if (Math.abs(x) < 22 || Math.abs(z) < 22) continue;
    if (Math.abs(x - 50) < 20 && Math.abs(z) < 30) continue;

    const height = 10 + Math.random() * 30;
    const palette = [0xc6c0b2, 0x9eabb6, 0xd4c3a2, 0x7e929c, 0xc2d0ce];
    const color = palette[Math.floor(Math.random() * palette.length)];

    building(x, z, 18 + Math.random() * 8, 18 + Math.random() * 8, height, color);
  }
}

// landmarks
building(35, 30, 24, 24, 35, 0xd6c49e, "BANK");
building(-35, 30, 20, 20, 18, 0xb6c9b9, "SHOP");
building(35, -35, 24, 24, 12, 0x9cbbce, "HOUSE");
building(-35, -35, 24, 24, 16, 0xd4d0c8, "GARAGE");

// =========================
// PLAYER
// =========================

const player = new THREE.Group();
scene.add(player);

const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.3, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x2867c9 })
);
body.position.y = 1.35;
body.castShadow = true;
player.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xe7bd94 })
);
head.position.y = 2.25;
head.castShadow = true;
player.add(head);

const leg1 = box(0, 0, 0, 0.28, 0.7, 0.3, 0x202530);
const leg2 = box(0, 0, 0, 0.28, 0.7, 0.3, 0x202530);
player.remove(body);
player.remove(head);
player.add(body);
player.add(head);
scene.remove(leg1);
scene.remove(leg2);

player.position.set(0, 0, 8);
let playerFacing = 0;

// =========================
// CARS
// =========================

const cars = [];

function makeCar(x, z, color, label = "AUTO") {
  const car = new THREE.Group();

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.75, 4.2),
    new THREE.MeshStandardMaterial({ color })
  );
  chassis.position.y = 0.8;
  chassis.castShadow = true;
  car.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.8, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x9ec6df, transparent: true, opacity: 0.8 })
  );
  cabin.position.set(0, 1.45, -0.1);
  car.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x161616 });

  const wheels = [];
  for (const wx of [-1.05, 1.05]) {
    for (const wz of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.45, wz);
      car.add(wheel);
      wheels.push(wheel);
    }
  }

  car.position.set(x, 0, z);
  scene.add(car);

  const info = {
    group: car, x, z, speed: 0, angle: 0,
    label, wheels, color, owned: false
  };
  cars.push(info);
  return info;
}

const car1 = makeCar(4, 8, 0xd63838, "SPORT");
makeCar(-12, 8, 0x2875d2, "SUV");
makeCar(18, -4, 0xe6c23d, "TAXI");
makeCar(-20, -8, 0xeeeeee, "SEDAN");
makeCar(70, 22, 0x46b56a, "SPORT");

// =========================
// NPCS
// =========================

const npcs = [];

function makeNPC(x, z, color) {
  const npc = new THREE.Group();

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.2, 0.45),
    new THREE.MeshStandardMaterial({ color })
  );
  torso.position.y = 1.2;
  npc.add(torso);

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xe6b98e })
  );
  face.position.y = 2;
  npc.add(face);

  npc.position.set(x, 0, z);
  scene.add(npc);
  npcs.push({ group: npc, x, z, phase: Math.random() * 6, color });
  return npc;
}

for (let i = 0; i < 18; i++) {
  makeNPC(
    -85 + Math.random() * 170,
    -85 + Math.random() * 170,
    [0x45a1d9, 0xe0a145, 0x8e63c9, 0x45bb87, 0xd56b68][i % 5]
  );
}

// =========================
// INTERACTION POINTS
// =========================

const interactables = [];

function marker(x, z, color, label, type) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.18, 8, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, 0.15, z);
  scene.add(ring);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.6, 4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 })
  );
  beam.position.set(x, 2, z);
  scene.add(beam);

  interactables.push({ x, z, label, type, ring, beam });
}

marker(35, 30, 0x35df8b, "BANK", "bank");
marker(-35, 30, 0xffb72b, "SHOP", "shop");
marker(35, -35, 0x45bfff, "HOUSE", "house");
marker(-35, -35, 0xc28aff, "GARAGE", "garage");
marker(0, 65, 0xffe44d, "MISSION", "mission");
marker(70, 30, 0xff7744, "ARCADE", "arcade");

// =========================
// BANK
// =========================

function bankMenu() {
  openMenu("BANK", `
    <p>Gotówka: <b>$${game.cash}</b></p>
    <p>Konto: <b>$${game.bank}</b></p>
    <button class="action" id="deposit">Wpłać $100</button>
    <button class="action" id="withdraw">Wypłać $100</button>
    <button class="action" id="bankMission">Misja specjalna banku</button>
  `);

  $("deposit").onclick = () => {
    if (game.cash < 100) return toast("Nie masz 100$ gotówki.");
    game.cash -= 100;
    game.bank += 100;
    updateUI();
    bankMenu();
  };

  $("withdraw").onclick = () => {
    if (game.bank < 100) return toast("Na koncie jest za mało pieniędzy.");
    game.bank -= 100;
    game.cash += 100;
    updateUI();
    bankMenu();
  };

  $("bankMission").onclick = () => {
    closeMenu();
    startMission(2);
  };
}

// =========================
// SHOP
// =========================

function shopMenu() {
  openMenu("SKLEP", `
    <p>Gotówka: <b>$${game.cash}</b></p>
    <button class="action" id="buySnack">Kup przekąskę $25</button>
    <button class="action" id="buyBlaster">Kup blaster arcade $250</button>
    <button class="action" id="buyRifle">Kup laser sportowy $500</button>
    <button class="action" id="buyArmor">Kup osłonę $300</button>
  `);

  $("buySnack").onclick = () => {
    if (game.cash < 25) return toast("Brakuje pieniędzy!");
    game.cash -= 25;
    toast("Kupiono przekąskę!");
    updateUI();
    shopMenu();
  };

  $("buyBlaster").onclick = () => buyItem("Blaster", 250);
  $("buyRifle").onclick = () => buyItem("Laser", 500);
  $("buyArmor").onclick = () => buyItem("Osłona", 300);
}

function buyItem(item, price) {
  if (game.cash < price) return toast("Brakuje pieniędzy!");
  game.cash -= price;
  if (!game.weapons.includes(item)) game.weapons.push(item);
  game.weapon = item;
  updateUI();
  toast(`Kupiono: ${item}`);
  shopMenu();
}

// =========================
// HOUSE
// =========================

function houseMenu() {
  if (game.houseOwned) {
    openMenu("TWÓJ DOM", `
      <p>Twój dom. Możesz tu odpocząć i zapisać stan gry.</p>
      <button class="action" id="enterHome">Wejdź do domu</button>
      <button class="action" id="saveGame">Zapisz grę</button>
    `);

    $("enterHome").onclick = () => {
      closeMenu();
      game.insideHouse = true;
      player.position.set(35, 0, -35);
      toast("Jesteś w domu.");
    };

    $("saveGame").onclick = saveGame;
  } else {
    openMenu("DOM NA SPRZEDAŻ", `
      <p>Mały dom na przedmieściach.</p>
      <p>Cena: <b>$1500</b></p>
      <p>Bonus: miejsce do odpoczynku i zapis gry.</p>
      <button class="action" id="buyHouse">Kup dom</button>
    `);

    $("buyHouse").onclick = () => {
      if (game.cash < 1500) return toast("Potrzebujesz $1500.");
      game.cash -= 1500;
      game.houseOwned = true;
      updateUI();
      toast("Kupiono dom!");
      houseMenu();
    };
  }
}

// =========================
// GARAGE
// =========================

function garageMenu() {
  openMenu("GARAŻ", `
    <p>Własne pojazdy: ${cars.filter(c => c.owned).length}</p>
    <p>Możesz zaparkować aktualny pojazd jako swój.</p>
    <button class="action" id="saveCar">Dodaj obecne auto do garażu</button>
    <button class="action" id="garageMission">Misja kierowcy</button>
  `);

  $("saveCar").onclick = () => {
    if (!game.currentCar) return toast("Najpierw wsiądź do auta.");
    game.currentCar.owned = true;
    toast("Auto zapisane w garażu!");
    garageMenu();
  };

  $("garageMission").onclick = () => {
    closeMenu();
    startMission(3);
  };
}

// =========================
// ARCADE MINI GAME
// =========================

function arcadeMenu() {
  openMenu("ARCADE", `
    <p>Wirtualna strefa wyzwań.</p>
    <p>Wybierz wyzwanie i zdobądź nagrodę.</p>
    <button class="action" id="arcade1">Test refleksu – $100 nagrody</button>
    <button class="action" id="arcade2">Zbieranie punktów – $200 nagrody</button>
  `);

  $("arcade1").onclick = () => arcadeChallenge(100);
  $("arcade2").onclick = () => arcadeChallenge(200);
}

function arcadeChallenge(reward) {
  closeMenu();
  toast("Wyzwanie rozpoczęte! Wciśnij AKCJA 5 razy.");
  game.arcadeTarget = 5;
  game.arcadeHits = 0;
  game.arcadeReward = reward;
}

// =========================
// MISSIONS
// =========================

const missionData = [
  {
    title: "Pierwsze kroki",
    desc: "Znajdź żółty znacznik przy głównej ulicy.",
    reward: 100,
    target: [0, 65]
  },
  {
    title: "Miejska dostawa",
    desc: "Wsiądź do samochodu i dotrzyj do zielonego znacznika.",
    reward: 250,
    target: [-70, -60]
  },
  {
    title: "Bankowa wyprawa",
    desc: "Odwiedź bank i ukończ fikcyjne wyzwanie w grze.",
    reward: 400,
    target: [35, 30]
  },
  {
    title: "Kierowca",
    desc: "Przyjedź do garażu swoim samochodem.",
    reward: 300,
    target: [-35, -35]
  }
];

function startMission(index) {
  game.mission = index;
  game.missionDone = false;
  game.missionProgress = 0;
  setMission(
    missionData[index].title,
    missionData[index].desc,
    0
  );
  toast("Misja rozpoczęta!");
}

function completeMission() {
  if (game.missionDone) return;
  game.missionDone = true;
  const m = missionData[game.mission];
  game.cash += m.reward;
  updateUI();
  setMission(m.title, "Misja ukończona! Nagroda: $" + m.reward, 100);
  toast(`MISJA UKOŃCZONA +$${m.reward}`);
}

function checkMission() {
  if (game.missionDone) return;
  const m = missionData[game.mission];
  if (!m) return;

  const target = new THREE.Vector3(m.target[0], 0, m.target[1]);
  if (player.position.distanceTo(target) < 6) {
    if (game.mission === 1 && !game.inCar) {
      setStatus("Wsiądź do samochodu, aby ukończyć dostawę.");
      return;
    }
    completeMission();
  }
}

// =========================
// SIMPLE SAVE
// =========================

function saveGame() {
  const data = {
    cash: game.cash,
    bank: game.bank,
    houseOwned: game.houseOwned,
    weapons: game.weapons,
    weapon: game.weapon
  };
  try {
    localStorage.setItem("openCitySave", JSON.stringify(data));
    toast("Zapisano grę!");
  } catch {
    toast("Nie udało się zapisać gry.");
  }
}

function loadGame() {
  try {
    const data = JSON.parse(localStorage.getItem("openCitySave") || "null");
    if (!data) return;
    game.cash = data.cash ?? 500;
    game.bank = data.bank ?? 0;
    game.houseOwned = data.houseOwned ?? false;
    game.weapons = data.weapons ?? ["Blaster"];
    game.weapon = data.weapon ?? "Blaster";
    updateUI();
  } catch {
    console.warn("Save unavailable");
  }
}
loadGame();

// =========================
// INTERACTION
// =========================

function distanceXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function findNearest() {
  let best = null;
  let bestDistance = 6;

  for (const point of interactables) {
    const d = distanceXZ(player.position, point);
    if (d < bestDistance) {
      bestDistance = d;
      best = { type: point.type, label: point.label, point, distance: d };
    }
  }

  if (!game.inCar) {
    for (const car of cars) {
      const d = distanceXZ(player.position, car.group.position);
      if (d < bestDistance) {
        bestDistance = d;
        best = { type: "car", label: car.label, car, distance: d };
      }
    }
  }

  for (const npc of npcs) {
    const d = distanceXZ(player.position, npc.group.position);
    if (d < bestDistance) {
      bestDistance = d;
      best = { type: "npc", label: "Mieszkaniec", npc, distance: d };
    }
  }

  if (game.insideHouse) {
    best = { type: "exitHouse", label: "Wyjdź z domu", distance: 0 };
  }

  game.nearest = best;
  $("interactBtn").style.display = best ? "block" : "none";
  if (best) {
    $("interactBtn").textContent = getActionLabel(best);
  }
}

function getActionLabel(obj) {
  const labels = {
    bank: "🏦 BANK",
    shop: "🛒 SKLEP",
    house: "🏠 DOM",
    garage: "🚘 GARAŻ",
    mission: "📋 MISJA",
    arcade: "🎮 ARCADE",
    car: "🚗 WSIĄDŹ / WYJDŹ",
    npc: "💬 POROZMAWIAJ",
    exitHouse: "🚪 WYJDŹ"
  };
  return labels[obj.type] || "INTERAKCJA";
}

function interact() {
  const n = game.nearest;
  if (!n) return;

  if (n.type === "bank") bankMenu();
  if (n.type === "shop") shopMenu();
  if (n.type === "house") houseMenu();
  if (n.type === "garage") garageMenu();
  if (n.type === "mission") startMission(0);
  if (n.type === "arcade") arcadeMenu();
  if (n.type === "npc") talkNPC(n.npc);
  if (n.type === "car") toggleCar(n.car);
  if (n.type === "exitHouse") exitHouse();
}

function talkNPC(npc) {
  closeMenu();
  toast("Mieszkaniec: Cześć! Sprawdź misje w mieście.");
  setStatus("Rozmawiasz z mieszkańcem");
}

// =========================
// GAME ACTIVITIES (FICTIONAL)
// =========================

function gameAction() {
  if (game.arcadeTarget > 0) {
    game.arcadeHits++;
    toast(`${game.arcadeHits}/${game.arcadeTarget}`);
    if (game.arcadeHits >= game.arcadeTarget) {
      game.cash += game.arcadeReward;
      game.arcadeTarget = 0;
      updateUI();
      toast(`Wyzwanie ukończone! +$${game.arcadeReward}`);
    }
    return;
  }

  // fictional in-game street event
  if (game.nearest && game.nearest.type === "npc") {
    toast("To mieszkaniec miasta. Wybierz rozmowę, aby rozpocząć zadanie.");
    return;
  }

  toast("Nie ma teraz aktywnej akcji.");
}

// =========================
// CARS
// =========================

function toggleCar(car) {
  if (!game.inCar) {
    game.inCar = true;
    game.currentCar = car;
    player.visible = false;
    car.speed = 0;
    car.angle = car.group.rotation.y;
    toast("Wsiadłeś do auta. WASD – jazda.");
  } else {
    exitCar();
  }
}

function exitCar() {
  if (!game.currentCar) return;
  const car = game.currentCar;
  game.inCar = false;
  player.visible = true;
  player.position.set(
    car.group.position.x + 3,
    0,
    car.group.position.z + 1
  );
  car.speed = 0;
  game.currentCar = null;
  toast("Wysiadłeś z samochodu.");
}

function exitHouse() {
  game.insideHouse = false;
  player.position.set(35, 0, -25);
  toast("Wyszedłeś z domu.");
}

// =========================
// PLAYER MOVEMENT
// =========================

function playerMove(dt) {
  if (game.inCar || game.insideHouse) return;

  let forward = 0;
  let side = 0;

  if (game.keys["w"] || game.keys["arrowup"]) forward += 1;
  if (game.keys["s"] || game.keys["arrowdown"]) forward -= 1;
  if (game.keys["a"] || game.keys["arrowleft"]) side -= 1;
  if (game.keys["d"] || game.keys["arrowright"]) side += 1;

  forward += -game.joystick.y;
  side += game.joystick.x;

  const len = Math.hypot(forward, side);
  if (len > 1) {
    forward /= len;
    side /= len;
  }

  const speed = game.sprint ? 12 : 6;
  const move = new THREE.Vector3(side, 0, -forward);
  move.applyAxisAngle(new THREE.Vector3(0, 1, 0), game.cameraYaw);

  player.position.addScaledVector(move, speed * dt);

  if (move.length() > 0.01) {
    playerFacing = Math.atan2(move.x, move.z);
    player.rotation.y = playerFacing;
  }

  if (game.jump && player.position.y === 0) {
    game.velocityY = 7;
  }
  game.jump = false;

  if (player.position.y > 0 || game.velocityY > 0) {
    player.position.y += game.velocityY * dt;
    game.velocityY -= 18 * dt;
    if (player.position.y < 0) {
      player.position.y = 0;
      game.velocityY = 0;
    }
  }

  player.position.x = THREE.MathUtils.clamp(player.position.x, -145, 145);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -145, 145);
}

// =========================
// VEHICLE MOVEMENT
// =========================

function carMove(dt) {
  if (!game.inCar || !game.currentCar) return;

  const car = game.currentCar;
  const forward = (game.keys["w"] || game.keys["arrowup"] ? 1 : 0)
               - (game.keys["s"] || game.keys["arrowdown"] ? 1 : 0);
  const steer = (game.keys["d"] || game.keys["arrowright"] ? 1 : 0)
             - (game.keys["a"] || game.keys["arrowleft"] ? 1 : 0);

  const mobileForward = -game.joystick.y;
  const mobileSteer = game.joystick.x;

  const throttle = forward + mobileForward;
  const turn = steer + mobileSteer;

  if (throttle !== 0) car.speed += throttle * 18 * dt;
  else car.speed *= Math.pow(0.94, dt * 60);

  if (game.keys[" "] || game.braking) car.speed *= Math.pow(0.82, dt * 60);

  car.speed = THREE.MathUtils.clamp(car.speed, -14, 35);

  car.angle -= turn * Math.sign(car.speed || 1) * dt * (0.9 + Math.abs(car.speed) / 25);

  car.group.rotation.y = car.angle;
  const direction = new THREE.Vector3(Math.sin(car.angle), 0, Math.cos(car.angle));
  car.group.position.addScaledVector(direction, car.speed * dt);

  car.group.position.x = THREE.MathUtils.clamp(car.group.position.x, -145, 145);
  car.group.position.z = THREE.MathUtils.clamp(car.group.position.z, -145, 145);

  $("speed").textContent = Math.round(Math.abs(car.speed) * 3);
}

// =========================
// CAMERA
// =========================

function cameraMove(dt) {
  const target = game.inCar && game.currentCar
    ? game.currentCar.group.position.clone().add(new THREE.Vector3(0, 1.5, 0))
    : player.position.clone().add(new THREE.Vector3(0, 1.7, 0));

  const distance = game.inCar ? 9 : 7;
  const offset = new THREE.Vector3(
    Math.sin(game.cameraYaw) * distance,
    2.5 + game.cameraPitch * 5,
    Math.cos(game.cameraYaw) * distance
  );

  const desired = target.clone().add(offset);
  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.lookAt(target);
}

// =========================
// CAMERA TOUCH / MOUSE
// =========================

renderer.domElement.addEventListener("pointerdown", e => {
  game.cameraDragging = true;
  game.lastPointer.x = e.clientX;
  game.lastPointer.y = e.clientY;
});

window.addEventListener("pointerup", () => game.cameraDragging = false);

window.addEventListener("pointermove", e => {
  if (!game.cameraDragging) return;
  if (e.pointerType === "mouse" && e.buttons === 0) return;

  const dx = e.clientX - game.lastPointer.x;
  const dy = e.clientY - game.lastPointer.y;

  game.cameraYaw -= dx * 0.005;
  game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch - dy * 0.003, -0.25, 0.8);

  game.lastPointer.x = e.clientX;
  game.lastPointer.y = e.clientY;
});

// =========================
// KEYBOARD
// =========================

window.addEventListener("keydown", e => {
  game.keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "e") interact();
  if (e.key === " ") game.jump = true;
  if (e.key === "Shift") game.sprint = true;
  if (e.key === "Escape") {
    if ($("menuOverlay").style.display === "flex") closeMenu();
    else openPauseMenu();
  }

  if (e.key === "1") selectWeapon(0);
  if (e.key === "2") selectWeapon(1);
  if (e.key === "3") selectWeapon(2);
});

window.addEventListener("keyup", e => {
  game.keys[e.key.toLowerCase()] = false;
  if (e.key === "Shift") game.sprint = false;
});

// =========================
// WEAPONS (ARCADE LOADOUT)
// =========================

function selectWeapon(index) {
  const weapon = game.weapons[index];
  if (!weapon) {
    toast("Nie masz tego wyposażenia. Kup je w sklepie.");
    return;
  }
  game.weapon = weapon;
  updateUI();
  toast("Wyposażenie: " + weapon);
}

// =========================
// PAUSE MENU
// =========================

function openPauseMenu() {
  openMenu("MENU GRY", `
    <p>Gotówka: $${game.cash}</p>
    <p>Konto bankowe: $${game.bank}</p>
    <button class="action" id="resume">Wróć do gry</button>
    <button class="action" id="save">Zapisz postęp</button>
    <button class="action" id="reset">Nowa gra</button>
  `);
  $("resume").onclick = closeMenu;
  $("save").onclick = saveGame;
  $("reset").onclick = () => {
    if (!confirm("Zresetować grę?")) return;
    localStorage.removeItem("openCitySave");
    location.reload();
  };
}

// =========================
// MOBILE JOYSTICK
// =========================

const joystick = $("joystick");
const knob = $("knob");
let joystickActive = false;

function moveJoystick(e) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  let dx = e.clientX - centerX;
  let dy = e.clientY - centerY;
  const max = 42;
  const len = Math.hypot(dx, dy);
  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  game.joystick.x = dx / max;
  game.joystick.y = dy / max;
}

joystick.addEventListener("pointerdown", e => {
  joystickActive = true;
  joystick.setPointerCapture(e.pointerId);
  moveJoystick(e);
});
joystick.addEventListener("pointermove", e => {
  if (joystickActive) moveJoystick(e);
});
joystick.addEventListener("pointerup", () => {
  joystickActive = false;
  game.joystick.x = 0;
  game.joystick.y = 0;
  knob.style.transform = "translate(0,0)";
});
joystick.addEventListener("pointercancel", () => {
  joystickActive = false;
  game.joystick.x = 0;
  game.joystick.y = 0;
  knob.style.transform = "translate(0,0)";
});

$("jumpBtn").addEventListener("pointerdown", () => game.jump = true);
$("sprintBtn").addEventListener("pointerdown", () => game.sprint = true);
$("sprintBtn").addEventListener("pointerup", () => game.sprint = false);
$("sprintBtn").addEventListener("pointerleave", () => game.sprint = false);
$("carBtn").addEventListener("pointerdown", interact);
$("actionBtn").addEventListener("pointerdown", gameAction);
$("brakeBtn").addEventListener("pointerdown", () => game.braking = true);
$("brakeBtn").addEventListener("pointerup", () => game.braking = false);
$("brakeBtn").addEventListener("pointerleave", () => game.braking = false);

$("interactBtn").addEventListener("click", interact);

// =========================
// TREES / DECORATIONS
// =========================

function tree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x795334 })
  );
  trunk.position.set(x, 1.5, z);
  scene.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x278b43 })
  );
  crown.position.set(x, 4, z);
  crown.castShadow = true;
  scene.add(crown);
}

for (let i = 0; i < 35; i++) {
  const x = -140 + Math.random() * 280;
  const z = -140 + Math.random() * 280;
  if (Math.abs(x) < 16 || Math.abs(z) < 16) continue;
  tree(x, z);
}

// =========================
// MAIN LOOP
// =========================

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);

  // Animate NPCs
  for (const npc of npcs) {
    npc.phase += dt;
    npc.group.position.x = npc.x + Math.sin(npc.phase) * 1.5;
    npc.group.position.z = npc.z + Math.cos(npc.phase) * 1.5;
  }

  // animate markers
  for (const p of interactables) {
    p.ring.rotation.z += dt * 0.6;
    p.beam.material.opacity = 0.12 + Math.sin(clock.elapsedTime * 2) * 0.04;
  }

  playerMove(dt);
  carMove(dt);
  cameraMove(dt);
  findNearest();
  checkMission();

  if (game.inCar) {
    $("speedbox").style.display = "block";
  } else {
    $("speedbox").style.display = "none";
  }

  renderer.render(scene, camera);
}

animate();

// =========================
// RESIZE
// =========================

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
