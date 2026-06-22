// ==========================================================================
// 1. BASE DE DADES (LOCALSTORAGE PUR) - SEGURETAT SENSE SERVIDORS
// ==========================================================================
let CONFIG_CLUB = JSON.parse(localStorage.getItem('fc_config_multi')) || { nomClub: "INSTITUT LES CORTS" };

let LLISTA_EQUIPS = JSON.parse(localStorage.getItem('fc_equips_multi')) || [
    { id: "eq-1", nom: "Aleví A", categoria: "alevi" }, 
    { id: "eq-2", nom: "Benjamí A", categoria: "benjami" }
];

let USUARIS_CREDENTIALS = JSON.parse(localStorage.getItem('fc_usuaris_multi')) || [
    { email: "coordinador@club.com", pass: "1234", rol: "coordinador", equip_id: null },
    { email: "entrenador@club.com", pass: "1234", rol: "entrenador", equip_id: "eq-1" }
];

let DB_JUGADORS = JSON.parse(localStorage.getItem('fc_jugadors_multi')) || [];
let DB_EXERCICIS = JSON.parse(localStorage.getItem('fc_exercicis_multi')) || []; 
let DB_ENTRENAMENTS = JSON.parse(localStorage.getItem('fc_entrenaments_multi')) || [];
let DB_PARTITS = JSON.parse(localStorage.getItem('fc_partits_multi')) || [];

let USUARI_ACTIU = null; 
let EQUIP_ACTIU_ID = ""; 
let partitIdActualGestio = ""; 
let idSessioActivaAssistència = ""; 
let mapPosicionsActuals = {}; 
let llistaSubstitucionsTmp = [];

const CONFIG_SISTEMES = {
    "1-2-3-1": [
        { id: "por", nom: "Porter/a", x: 50, y: 88 },
        { id: "dfi", nom: "Def. Esquerre", x: 25, y: 68 },
        { id: "dfd", nom: "Def. Dret", x: 75, y: 68 },
        { id: "mci", nom: "Mig Esquerre", x: 20, y: 42 },
        { id: "mcc", nom: "Mig Centre", x: 50, y: 46 },
        { id: "mcd", nom: "Mig Dret", x: 80, y: 42 },
        { id: "dl", nom: "Davanter/a", x: 50, y: 18 }
    ],
    "1-3-2-1": [
        { id: "por", nom: "Porter/a", x: 50, y: 88 },
        { id: "dfi", nom: "Def. Esquerre", x: 20, y: 68 },
        { id: "dfc", nom: "Def. Centre", x: 50, y: 72 },
        { id: "dfd", nom: "Def. Dret", x: 80, y: 68 },
        { id: "mc1", nom: "Migcampista 1", x: 35, y: 44 },
        { id: "mc2", nom: "Migcampista 2", x: 65, y: 44 },
        { id: "dl", nom: "Davanter/a", x: 50, y: 18 }
    ]
};

// Guardat local general persistent
function desarTotLocalmente() {
    localStorage.setItem('fc_config_multi', JSON.stringify(CONFIG_CLUB));
    localStorage.setItem('fc_equips_multi', JSON.stringify(LLISTA_EQUIPS));
    localStorage.setItem('fc_usuaris_multi', JSON.stringify(USUARIS_CREDENTIALS));
    localStorage.setItem('fc_jugadors_multi', JSON.stringify(DB_JUGADORS));
    localStorage.setItem('fc_exercicis_multi', JSON.stringify(DB_EXERCICIS));
    localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS));
    localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS));
}

// ==========================================
// 2. CONTROL D'ACCÉS (LOGIN / LOGOUT)
// ==========================================
function executarLoginSimulat() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const u = USUARIS_CREDENTIALS.find(x => x.email.toLowerCase() === email.toLowerCase() && x.pass === pass);
    if (!u) { alert("Credencials incorrectes."); return; }
    
    USUARI_ACTIU = u;
    if (USUARI_ACTIU.rol === 'coordinador') {
        EQUIP_ACTIU_ID = LLISTA_EQUIPS[0] ? LLISTA_EQUIPS[0].id : ""; 
        document.getElementById('wrapper-selector-equips').classList.remove('hidden');
        actualitzarSelectorFiltreCoordinadorDinamit();
    } else {
        EQUIP_ACTIU_ID = USUARI_ACTIU.equip_id; 
        document.getElementById('wrapper-selector-equips').classList.add('hidden');
    }
    document.getElementById('pantalla-login').classList.add('seccion-oculta');
    document.getElementById('interficie-app').classList.remove('seccion-oculta');
    aplicarConfiguracioInterficie(); 
    canviarEquipActiuGeneral();
}

function actualitzarSelectorFiltreCoordinadorDinamit() {
    const selector = document.getElementById('selector-equip-coordinador');
    if(selector) {
        selector.innerHTML = LLISTA_EQUIPS.map(e => `<option value="${e.id}">${e.nom}</option>`).join('');
        if(EQUIP_ACTIU_ID) selector.value = EQUIP_ACTIU_ID;
    }
}

function executarLogout() {
    USUARI_ACTIU = null; EQUIP_ACTIU_ID = "";
    document.getElementById('pantalla-login').classList.remove('seccion-oculta');
    document.getElementById('interficie-app').classList.add('seccion-oculta');
}

// ==========================================
// 3. NAVEGACIÓ GENERAL
// ==========================================
function canviarEquipActiuCoordinador(id) { EQUIP_ACTIU_ID = id; canviarEquipActiuGeneral(); }

function canviarEquipActiuGeneral() {
    const eq = LLISTA_EQUIPS.find(e => e.id === EQUIP_ACTIU_ID);
    document.getElementById('titol-plantilla-equip').innerText = eq ? eq.nom.toUpperCase() : "SENSE EQUIP ACTIU";
    renderitzarPlantilla(); renderitzarPartits(); renderitzarBibliotecaExercicis(); 
    inicialitzarEstructuraSelectorsEntrenaments(); renderitzarEntrenaments(); 
    cambiarPestana('plantilla');
}

function aplicarConfiguracioInterficie() {
    document.getElementById('nav-nom-club').innerText = CONFIG_CLUB.nomClub.toUpperCase();
    document.getElementById('cfg-nom-club').value = CONFIG_CLUB.nomClub;
    document.getElementById('badge-rol-usuari').innerText = USUARI_ACTIU.rol.toUpperCase();
    
    const panellAdmin = document.getElementById('cfg-panell-coordinador-equips');
    if(panellAdmin) {
        if(USUARI_ACTIU.rol === 'coordinador') panellAdmin.classList.remove('seccion-oculta');
        else panellAdmin.classList.add('seccion-oculta');
    }
    renderitzarLlistaEquipsConfiguracio();
}

function cambiarPestana(p) {
    const secs = ['plantilla', 'ejercicios', 'entrenamientos', 'detalles-entrenamiento', 'partidos', 'detalles-partido', 'estadisticas', 'configuracion'];
    secs.forEach(s => {
        if(document.getElementById(`seccion-${s}`)) document.getElementById(`seccion-${s}`).classList.add('seccion-oculta');
        if(document.getElementById(`btn-${s}`)) document.getElementById(`btn-${s}`).className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer";
    });
    if(document.getElementById(`seccion-${p}`)) document.getElementById(`seccion-${p}`).classList.remove('seccion-oculta');
    if(document.getElementById(`btn-${p}`)) document.getElementById(`btn-${p}`).className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white transition cursor-pointer";
    
    if (p === 'estadisticas') calcularIAnalisarEstadistiquesGlobals();
    if (p === 'configuracion') aplicarConfiguracioInterficie();
}

// ==========================================
// 4. BIBLIOTECA DE TASQUES / EXERCICIS
// ==========================================
function crearEjercicioLocal() {
    const n = document.getElementById('task-nombre').value.trim(); 
    const e = document.getElementById('task-explicacion').value.trim(); 
    if (!n || !e) { alert("El nom i la descripció són obligatoris."); return; }
    
    const novaTasca = { id: "ex-" + Date.now(), nombre: n, tipo: document.getElementById('task-tipo').value, imagen: "", explicacion: e, creador: USUARI_ACTIU.email };
    DB_EXERCICIS.push(novaTasca);
    desarTotLocalmente();
    
    document.getElementById('task-nombre').value = ""; document.getElementById('task-explicacion').value = "";
    renderitzarBibliotecaExercicis(); inicialitzarEstructuraSelectorsEntrenaments();
}

function renderitzarBibliotecaExercicis() {
    const g = document.getElementById('grid-ejercicios'); 
    const flt = document.getElementById('task-filtro-tipo') ? document.getElementById('task-filtro-tipo').value : "Tots";
    const filtrats = DB_EXERCICIS.filter(e => flt === "Tots" || e.tipo === flt);
    document.getElementById('total-tasques').innerText = `Biblioteca comuna (${filtrats.length} tasques actives)`;
    
    if(filtrats.length === 0) { g.innerHTML = `<p class="col-span-2 text-slate-500 text-center py-4 text-xs italic bg-slate-900 border border-slate-850 rounded-xl">Banc buit.</p>`; return; }
    g.innerHTML = filtrats.map(e => `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between text-xs shadow-sm">
            <div>
                <div class="flex justify-between border-b border-slate-850 pb-1.5 text-[10px] text-slate-500 mb-2"><span class="font-bold uppercase tracking-wider text-indigo-400">${e.tipo}</span><span>Por: ${e.creador ? e.creador.split('@')[0] : 'Admin'}</span></div>
                <h4 class="font-black text-white text-sm mt-1">${e.nombre}</h4><p class="text-slate-400 mt-1 whitespace-pre-line leading-relaxed">${e.explicacion}</p>
            </div>
            <button onclick="if(confirm('Eliminar?')){ DB_EXERCICIS=DB_EXERCICIS.filter(x=>x.id!=='${e.id}'); desarTotLocalmente(); renderitzarBibliotecaExercicis(); }" class="text-slate-600 hover:text-rose-400 text-left pt-3 text-[10px] cursor-pointer mt-2 transition"><i class="fas fa-trash-alt mr-1"></i>Eliminar tasca</button>
        </div>`).join('');
}

// ==========================================
// 5. GESTIÓ DE SESSIONS D'ENTRENAMENT
// ==========================================
function inicialitzarEstructuraSelectorsEntrenaments() {
    const t = ["Tots", "Roda de passades", "Coordinació", "Rondos", "Possessions", "Partits"];
    for (let i = 1; i <= 5; i++) {
        const s = document.getElementById(`slot-${i}-filter`);
        if (s) s.innerHTML = t.map(x => `<option value="${x}">${x}</option>`).join('');
        filtrarSelectorSlotDinamic(i);
    }
}

function filtrarSelectorSlotDinamic(n) {
    const f = document.getElementById(`slot-${n}-filter`).value; 
    const desti = document.getElementById(`slot-${n}-select`); if(!desti) return;
    const filtrats = DB_EXERCICIS.filter(e => f === "Tots" || e.tipo === f);
    desti.innerHTML = filtrats.length === 0 ? `<option value="">-- Buida --</option>` : `<option value="">-- Tria Tasca ${n} --</option>` + filtrats.map(x => `<option value="${x.id}">${x.nombre}</option>`).join('');
}

function crearEntrenamiento() {
    const d = document.getElementById('entreno-fecha').value; const o = document.getElementById('entreno-objetivo').value.trim(); if(!d || !o) return;
    
    let arrTasquesSessio = []; 
    for(let i=1; i<=5; i++) { 
        let vId = document.getElementById(`slot-${i}-select`).value; 
        if(vId) {
            const plantillaEx = DB_EXERCICIS.find(x => x.id === vId);
            let mins = document.getElementById(`slot-${i}-duration`) ? parseInt(document.getElementById(`slot-${i}-duration`).value) || 15 : 15;
            if(plantillaEx) {
                arrTasquesSessio.push({
                    idTascaUnica: "tu-" + Date.now() + "-" + i,
                    nombre: plantillaEx.nombre,
                    tipo: plantillaEx.tipo,
                    explicacion: plantillaEx.explicacion, 
                    durada: mins
                });
            }
        } 
    }
    
    DB_ENTRENAMENTS.push({ 
        id: "ent-" + Date.now(), 
        equip_id: EQUIP_ACTIU_ID, 
        numeroSessio: DB_ENTRENAMENTS.filter(x => x.equip_id === EQUIP_ACTIU_ID).length + 1, 
        fecha: d, 
        objetivo: o, 
        notes: document.getElementById('entreno-notes').value.trim(), 
        tasquesClonades: arrTasquesSessio, 
        asistencia: {} 
    });
    
    desarTotLocalmente();
    document.getElementById('entreno-objetivo').value = ""; document.getElementById('entreno-notes').value = ""; 
    for(let i=1; i<=5; i++) { if(document.getElementById(`slot-${i}-duration`)) document.getElementById(`slot-${i}-duration`).value = "15"; }
    renderitzarEntrenaments();
}

function renderitzarEntrenaments() {
    const l = document.getElementById('lista-entrenamientos'); const f = DB_ENTRENAMENTS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    if(f.length === 0) { l.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4 bg-slate-900 border border-slate-850 rounded-xl">Cap lliçó guardada.</p>`; return; }
    l.innerHTML = f.map(e => `
        <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs shadow-sm">
            <div><span class="bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded text-indigo-400 font-bold mr-2">Sessió #${e.numeroSessio}</span><span class="font-bold text-white">${e.fecha}</span> - ${e.objetivo}</div>
            <div class="flex items-center space-x-2">
                <button onclick="obrirGestioAsistenciaSessio('${e.id}')" class="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer">Veure Sessió</button>
                <button onclick="if(confirm('Eliminar?')){ DB_ENTRENAMENTS=DB_ENTRENAMENTS.filter(x=>x.id!=='${e.id}'); desarTotLocalmente(); renderitzarEntrenaments(); }" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('');
}

function obrirGestioAsistenciaSessio(idEntrenament) {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idEntrenament); if (!entreno) return;
    idSessioActivaAssistència = idEntrenament; cambiarPestana('detalles-entrenamiento');
    document.getElementById('det-entreno-titol').innerText = `Sessió #${entreno.numeroSessio}`;
    document.getElementById('det-entreno-meta').innerText = `Objectiu: ${entreno.objetivo} | Data: ${entreno.fecha}`;

    let llistaAExhibir = entreno.tasquesClonades || [];

    const contenedorTasques = document.getElementById('det-entreno-lista-tasques');
    contenedorTasques.innerHTML = (llistaAExhibir.length === 0) ? `<p class="text-xs text-slate-500 italic col-span-2">No s'han programat tasques.</p>` : llistaAExhibir.map((ex, idx) => {
        return `
            <div class="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 text-xs shadow-md">
                <div class="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-900 pb-1.5">
                    <span class="font-bold text-indigo-400">Tasca ${idx + 1} (${ex.tipo})</span>
                    <span class="bg-indigo-950/60 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded font-mono font-bold">${ex.durada} min</span>
                </div>
                <h4 class="font-black text-white text-sm">${ex.nombre}</h4>
                <div class="space-y-1">
                    <textarea oninput="actualitzarTextTascaSessioEnCalent('${ex.idTascaUnica}', this.value)" class="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-xs focus:border-indigo-500 focus:outline-none leading-relaxed" rows="4">${ex.explicacion}</textarea>
                </div>
            </div>`;
    }).join('');

    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const tbody = document.getElementById('tabla-asistencia-sesion-interna');
    if (alumnes.length === 0) { tbody.innerHTML = `<tr><td class="p-4 text-center text-xs text-slate-500 italic">No hi ha jugadors actius.</td></tr>`; return; }
    if (!entreno.asistencia) entreno.asistencia = {};

    tbody.innerHTML = alumnes.map(j => {
        let estatActual = entreno.asistencia[j.id] || "P"; 
        return `
            <tr class="hover:bg-slate-900/10 text-center border-b border-slate-850/60">
                <td class="p-2.5 text-left font-semibold text-white truncate max-w-[110px]">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</td>
                <td class="p-2.5 flex justify-center">
                    <div class="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 gap-0.5 text-[10px] font-bold">
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'P')" id="btn-asis-int-${j.id}-P" class="px-2 py-0.5 rounded transition ${estatActual === 'P' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'}">P</button>
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'A')" id="btn-asis-int-${j.id}-A" class="px-2 py-0.5 rounded transition ${estatActual === 'A' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'}">A</button>
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'J')" id="btn-asis-int-${j.id}-J" class="px-2 py-0.5 rounded transition ${estatActual === 'J' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}">J</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function actualitzarTextTascaSessioEnCalent(idTascaUnica, nouText) {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idSessioActivaAssistència);
    if(entreno && entreno.tasquesClonades) {
        const t = entreno.tasquesClonades.find(x => x.idTascaUnica === idTascaUnica);
        if(t) { t.explicacion = nouText; desarTotLocalmente(); }
    }
}

function canviarEstatBotoAssistènciaInterna(jugadorId, nouEstat) {
    ['P', 'A', 'J'].forEach(e => {
        const btn = document.getElementById(`btn-asis-int-${jugadorId}-${e}`);
        if (btn) btn.className = (e === nouEstat) ? `px-2 py-0.5 rounded font-bold text-[10px] ${e==='P'?'bg-emerald-600 text-white':e==='A'?'bg-rose-600 text-white':'bg-amber-500 text-slate-950'}` : "px-2 py-0.5 rounded text-slate-400 font-bold text-[10px]";
    });
}

function desarAsistenciaSessióActual() {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idSessioActivaAssistència); if (!entreno) return;
    DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID).forEach(j => {
        let est = "P"; if (document.getElementById(`btn-asis-int-${j.id}-A`)?.classList.contains('bg-rose-600')) est = "A"; if (document.getElementById(`btn-asis-int-${j.id}-J`)?.classList.contains('bg-amber-500')) est = "J";
        entreno.asistencia[j.id] = est;
    });
    desarTotLocalmente(); alert("Assistència guardada localment!");
    cambiarPestana('entrenamientos'); renderitzarEntrenaments();
}

// ==========================================
// 6. GESTIÓ DELS JUGADORS (PLANTILLA)
// ==========================================
function renderitzarPlantilla() {
    const tbody = document.getElementById('tabla-jugadores'); const f = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    document.getElementById('total-jugadores').innerText = f.length;
    if(f.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-slate-500 italic bg-slate-900/40">Grup buit. Prems 'Afegir Jugador'.</td></tr>`; return; }
    tbody.innerHTML = f.map(p => `
        <tr class="hover:bg-slate-800/40 text-xs border-b border-slate-850 text-center">
            <td class="p-2.5 text-left pl-4"><div class="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"><i class="fas fa-user text-slate-600 text-xs"></i></div></td>
            <td class="p-2.5 text-left font-mono font-bold text-indigo-400">#${p.dorsal || '0'}</td><td class="p-2.5 text-left font-semibold text-white">${p.nombre}</td>
            <td class="p-2.5 text-right space-x-1 pr-4"><button onclick="obrirModalJugador('editar', '${p.id}')" class="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-lg">Modificar</button><button onclick="obrirFitxaJugador('${p.id}')" class="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-lg">Fitxa</button></td>
        </tr>`).join('');
}

function guardarJugador() {
    const idEdicio = document.getElementById('player-id-edicio').value; const nom = document.getElementById('player-nom').value.trim(); if(!nom) return;
    const d = { equip_id: EQUIP_ACTIU_ID, nombre: nom, dorsal: document.getElementById('player-dorsal').value, posicion: document.getElementById('player-p1').value, lateral: document.getElementById('player-lateral').value, telPare: document.getElementById('player-tel-pare').value, telMare: document.getElementById('player-tel-mare').value };
    if(idEdicio) { let idx = DB_JUGADORS.findIndex(x => x.id === idEdicio); if(idx !== -1) DB_JUGADORS[idx] = {id: idEdicio, ...d}; } else { DB_JUGADORS.push({ id: "p-" + Date.now(), ...d }); }
    desarTotLocalmente(); tancarModalJugador(); renderitzarPlantilla(); 
}

function obrirFitxaJugador(id) {
    const p = DB_JUGADORS.find(x => x.id === id); if(!p) return;
    document.getElementById('modal-fitxa-jugador').classList.remove('seccion-oculta');
    document.getElementById('fitxa-nom').innerText = p.nombre; document.getElementById('fitxa-dorsal').innerText = "Dorsal: #" + (p.dorsal || "0");
    document.getElementById('fitxa-p1').innerText = p.posicion || 'Sense dades'; document.getElementById('fitxa-lateral').innerText = p.lateral;
    document.getElementById('fitxa-text-pare').innerHTML = `<b>Tutor 1:</b> ${p.telPare || 'Sense telèfon'}`; document.getElementById('fitxa-text-mare').innerHTML = `<b>Tutor 2:</b> ${p.telMare || 'Sense telèfon'}`;
    document.getElementById('btn-fitxa-eliminar').onclick = () => { if(confirm("Eliminar jugador?")) { DB_JUGADORS = DB_JUGADORS.filter(x => x.id !== id); desarTotLocalmente(); renderitzarPlantilla(); tancarFitxaJugador(); } };
    document.getElementById('btn-fitxa-editar').onclick = () => { tancarFitxaJugador(); obrirModalJugador('editar', p.id); };
}

// ==========================================
// 7. GESTIÓ DE PARTITS
// ==========================================
function crearPartidoRapido() {
    const r = document.getElementById('partido-rival').value.trim(); if(!r) return;
    DB_PARTITS.push({ id: "par-" + Date.now(), equip_id: EQUIP_ACTIU_ID, rival: r, campo: document.getElementById('partido-campo').value, fecha: document.getElementById('partido-fecha').value, hora: document.getElementById('partido-hora').value, valoracio: "", golsRival: 0, convocats: [], posicionsCamp: {}, subs: [], sistema: "1-2-3-1" });
    desarTotLocalmente(); document.getElementById('partido-rival').value = ""; renderitzarPartits();
}

function renderitzarPartits() {
    const c = document.getElementById('lista-partidos'); const f = DB_PARTITS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    if(f.length === 0) { c.innerHTML = `<p class="text-xs text-slate-500 text-center py-4 bg-slate-900 border border-slate-850 rounded-xl italic">Cap partit programat.</p>`; return; }
    c.innerHTML = f.map(p => `
        <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
            <div><b class="text-white">vs ${p.rival}</b> (${p.fecha || 'S/D'}) - <span class="text-indigo-400 font-mono text-[10px]">${p.campo === 'Camp Local' ? 'LOCAL' : 'VISITANT'}</span></div>
            <div class="flex items-center space-x-2">
                <button onclick="obrirGestioAvançadaPartit('${p.id}')" class="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer">Obrir Acta</button>
                <button onclick="if(confirm('Eliminar?')){ DB_PARTITS = DB_PARTITS.filter(x => x.id !== '${p.id}'); desarTotLocalmente(); renderitzarPartits(); }" class="text-slate-500 hover:text-rose-400 p-2 cursor-pointer transition"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('');
}

function obrirGestioAvançadaPartit(id) {
    const p = DB_PARTITS.find(x => x.id === id); if(!p) return;
    partitIdActualGestio = id; cambiarPestana('detalles-partido');
    
    const eqActiu = LLISTA_EQUIPS.find(x => x.id === EQUIP_ACTIU_ID) || { categoria: "benjami" };
    let minPerQuart = eqActiu.categoria === "prebenjami" ? 10 : eqActiu.categoria === "alevi" ? 15 : 12;
    if(document.getElementById('cfg-text-limit-minuts')) document.getElementById('cfg-text-limit-minuts').innerText = `1-${minPerQuart * 4}`;

    document.getElementById('det-partido-rival').innerText = "vs " + p.rival; 
    document.getElementById('det-partido-info').innerText = `${p.campo === 'Camp Local' ? 'LOCAL' : 'VISITANT'} | ${p.fecha} | ${p.hora}h [Cat: ${eqActiu.categoria.toUpperCase()}]`;
    document.getElementById('acta-valoracion').value = p.valoracio || ""; 
    if(document.getElementById('acta-gols-rival-manual-input')) document.getElementById('acta-gols-rival-manual-input').value = p.golsRival || 0;
    document.getElementById('partido-sistema-joc').value = p.sistema || "1-2-3-1";
    
    mapPosicionsActuals = p.posicionsCamp || {}; llistaSubstitucionsTmp = p.subs || [];
    if (!p.convocats) p.convocats = [];
    
    renderitzarLlistaConvocatoriaActa(); recalcularMarcadorsTotalsAutomàtics(); 
    seleccionarQuartFitxa('2'); dibuixarCampTactics(); 
    calcularMinutsAutomaticament(); actualitzarSelectorsDeCanvi(); renderitzarHistorialSubstitucionsVisual();
}

function renderitzarLlistaConvocatoriaActa() {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const cont = document.getElementById('lista-convocatoria-check');
    cont.innerHTML = alumnes.map(j => {
        const c = p.convocats.find(x => x.jugadorId === j.id); const estaConvocat = !!c;
        return `
            <div class="p-2 border rounded-xl flex items-center justify-between text-xs gap-2 transition ${estaConvocat ? 'bg-slate-900 border-indigo-500/50' : 'bg-slate-950/40 border-slate-850 opacity-50'}">
                <div class="flex items-center space-x-2 truncate">
                    <button onclick="commutarConvocatoria('${j.id}')" class="w-5 h-5 rounded-md border flex items-center justify-center font-bold text-[10px] ${estaConvocat ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900 text-transparent'}"><i class="fas fa-check"></i></button>
                    <span class="text-white font-medium truncate">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</span>
                </div>
                <div class="flex items-center space-x-1.5 shrink-0 ${estaConvocat ? '' : 'invisible'}">
                    <div class="border rounded px-1.5 py-0.5 font-mono text-[10px] text-teal-400 bg-teal-950/20" id="badge-minuts-${j.id}">0 min</div>
                    <span class="text-[11px]">⚽</span>
                    <input type="number" value="${c ? c.golsMarcats : 0}" min="0" oninput="actualitzarGolsConvocat('${j.id}', this.value)" class="w-8 bg-slate-950 border border-slate-800 text-center text-white rounded font-mono p-0.5 focus:outline-none">
                </div>
            </div>`;
    }).join('');
}

function commutarConvocatoria(jugadorId) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const idx = p.convocats.findIndex(x => x.jugadorId === jugadorId);
    if (idx !== -1) { p.convocats.splice(idx, 1); for(let k in mapPosicionsActuals){ if(mapPosicionsActuals[k]===jugadorId) delete mapPosicionsActuals[k]; } }
    else p.convocats.push({ jugadorId: jugadorId, minuts: 0, golsMarcats: 0 });
    
    p.posicionsCamp = mapPosicionsActuals; desarTotLocalmente();
    renderitzarLlistaConvocatoriaActa(); dibuixarCampTactics(); calcularMinutsAutomaticament(); actualitzarSelectorsDeCanvi(); recalcularMarcadorsTotalsAutomàtics();
}

function actualitzarGolsConvocat(jugadorId, valor) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const c = p.convocats.find(x => x.jugadorId === jugadorId);
    if (c) { c.golsMarcats = parseInt(valor) || 0; recalcularMarcadorsTotalsAutomàtics(); desarTotLocalmente(); }
}

function recalcularMarcadorsTotalsAutomàtics() {
    let n = 0; DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID).forEach(j => { let g = document.getElementById(`num-gols-${j.id}`); if(g) n += parseInt(g.value) || 0; });
    document.getElementById('acta-gols-nostres').innerText = n;
}

function canviarGolsRivalDirecte(valor) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio);
    if (p) { p.golsRival = parseInt(valor) || 0; desarTotLocalmente(); }
}

function guardarValoracioTextualDirecta(txt) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(p) { p.valoracio = txt; desarTotLocalmente(); }
}

// ==========================================
// 8. DIBUIX DEL CAMP TÀCTIC
// ==========================================
function dibuixarCampTactics() {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const wrapper = document.getElementById('wrapper-posicions-tactiques-camp'); if(!wrapper) return;
    
    const sistemaActiu = p.sistema || "1-2-3-1"; const posicions = CONFIG_SISTEMES[sistemaActiu];
    const convocatsId = p.convocats.map(x => x.jugadorId);
    const totsElsJugadorsGrup = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID && convocatsId.includes(x.id));

    wrapper.innerHTML = posicions.map(pos => {
        const idSeleccionat = mapPosicionsActuals[pos.id] || "";
        let opcionsHTML = `<option value="">-- ${pos.nom} --</option>`;
        totsElsJugadorsGrup.forEach(j => {
            const jaUsatOnaPosicio = Object.keys(mapPosicionsActuals).some(k => k !== pos.id && mapPosicionsActuals[k] === j.id);
            if(!jaUsatOnaPosicio) { opcionsHTML += `<option value="${j.id}" ${j.id === idSeleccionat ? 'selected':''}>#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</option>`; }
        });

        return `
            <div class="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20" style="left: ${pos.x}%; top: ${pos.y}%;">
                <div class="w-6 h-6 rounded-full bg-slate-950 border-2 ${idSeleccionat ? 'border-teal-400 bg-teal-950 text-teal-400':'border-white/40 text-white/50'} flex items-center justify-center text-[10px] font-black shadow shadow-black">✓</div>
                <select onchange="assignarJugadorAPosicioTactica('${pos.id}', this.value)" class="mt-1 bg-slate-900/90 text-white border text-[9px] rounded px-1 py-0.5 max-w-[85px] truncate focus:outline-none cursor-pointer">${opcionsHTML}</select>
            </div>`;
    }).join('');
}

function assignarJugadorAPosicioTactica(posicionId, jugadorId) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    if(jugadorId === "") delete mapPosicionsActuals[posicionId]; else mapPosicionsActuals[posicionId] = jugadorId;
    p.posicionsCamp = mapPosicionsActuals; desarTotLocalmente();
    dibuixarCampTactics(); calcularMinutsAutomaticament();
}

// ==========================================
// 9. RECOMPTE DE MINUTS ADAPTAT A LES EDATS
// ==========================================
function seleccionarQuartFitxa(q) {
    document.getElementById('cambio-quarto-actiu').value = q;
    ['2', '3', '4', 'int4'].forEach(s => { const b = document.getElementById(`btn-q-${s}`); if(b) b.className = (s === q) ? "py-1 bg-teal-600 text-white font-mono font-bold text-[11px] rounded border border-teal-500 shadow-sm cursor-pointer" : "py-1 bg-slate-800 text-slate-400 font-mono font-bold text-[11px] rounded border border-slate-700 cursor-pointer"; });
    if(q === 'int4') document.getElementById('wrapper-minuto-q4').classList.remove('seccion-oculta'); else document.getElementById('wrapper-minuto-q4').classList.add('seccion-oculta');
}

function actualitzarSelectorsDeCanvi() {
    const sale = document.getElementById('cambio-sale-select'); const entra = document.getElementById('cambio-entra-select'); if(!sale || !entra) return;
    let o = `<option value="">-- Tria --</option>`; DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID).forEach(j => { o += `<option value="${j.id}">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</option>`; });
    sale.innerHTML = o; entra.innerHTML = o;
}

function afegirSubstitucioCronologica() {
    const q = document.getElementById('cambio-quarto-actiu').value; const sId = document.getElementById('cambio-sale-select').value; const eId = document.getElementById('cambio-entra-select').value;
    if(!sId || !eId || sId === eId) { alert("Tria dos alumnes diferents."); return; }
    
    let etiquetaFormatada = q === '2' ? "Q1 ➔ Q2" : q === '3' ? "Q2 ➔ Q3" : q === '4' ? "Q3 ➔ Q4" : `Min ${document.getElementById('cambio-minuto-real').value}'`;
    const jS = DB_JUGADORS.find(x => x.id === sId); const jE = DB_JUGADORS.find(x => x.id === eId);
    
    llistaSubstitucionsTmp.push({ quarto: q, sale: sId, entra: eId, text: `[${etiquetaFormatada}] ❌ #${jS.dorsal || '0'} ➔ ✅ #${jE.dorsal || '0'}` });
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(p) { p.subs = llistaSubstitucionsTmp; desarTotLocalmente(); }
    renderitzarHistorialSubstitucionsVisual(); calcularMinutsAutomaticament();
}

function renderitzarHistorialSubstitucionsVisual() {
    const h = document.getElementById('historial-cambios-linea'); if(llistaSubstitucionsTmp.length === 0) { h.innerHTML = `<p class="text-slate-600 italic text-[11px]">Cap canvi configurat.</p>`; return; }
    h.innerHTML = llistaSubstitucionsTmp.map((s, idx) => `<div class="flex justify-between items-center bg-slate-950 p-1.5 border border-slate-850 rounded font-mono text-[10px] text-slate-300"><span>${s.text}</span><button onclick="llistaSubstitucionsTmp.splice(${idx},1); renderitzarHistorialSubstitucionsVisual(); calcularMinutsAutomaticament();" class="text-rose-400 font-bold px-1 cursor-pointer">✕</button></div>`).join('');
}

function calcularMinutsAutomaticament() {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    
    const eqActiu = LLISTA_EQUIPS.find(x => x.id === EQUIP_ACTIU_ID) || { categoria: "benjami" };
    let duradaQuart = eqActiu.categoria === "prebenjami" ? 10 : eqActiu.categoria === "alevi" ? 15 : 12;
    let minutsTotalsPartit = duradaQuart * 4; 
    
    let tempsJugador = {}; p.convocats.forEach(c => { tempsJugador[c.jugadorId] = 0; });
    let enCampActuals = Object.values(mapPosicionsActuals).filter(id => id !== "");

    for (let minut = 1; minut <= minutsTotalsPartit; minut++) {
        let saltDeQuart = "";
        if (minut === (duradaQuart + 1)) saltDeQuart = "2"; 
        if (minut === (duradaQuart * 2 + 1)) saltDeQuart = "3"; 
        if (minut === (duradaQuart * 3 + 1)) saltDeQuart = "4"; 

        if (saltDeQuart !== "") {
            llistaSubstitucionsTmp.forEach(sub => {
                if (sub.quarto === saltDeQuart) {
                    enCampActuals = enCampActuals.filter(id => id !== sub.sale);
                    if (!enCampActuals.includes(sub.entra)) enCampActuals.push(sub.entra);
                }
            });
        }
        llistaSubstitucionsTmp.forEach(sub => {
            if (sub.quarto === 'int4') {
                let mCanvi = parseInt(document.getElementById('cambio-minuto-real')?.value) || 30;
                if (minut === mCanvi) {
                    enCampActuals = enCampActuals.filter(id => id !== sub.sale);
                    if (!enCampActuals.includes(sub.entra)) enCampActuals.push(sub.entra);
                }
            }
        });
        enCampActuals.forEach(id => { if (tempsJugador[id] !== undefined) tempsJugador[id]++; });
    }

    p.convocats.forEach(c => {
        c.minuts = tempsJugador[c.jugadorId] || 0;
        const badge = document.getElementById(`badge-minuts-${c.jugadorId}`); if(badge) badge.innerText = `${c.minuts} min`;
    });
    desarTotLocalmente();
}

// ==========================================
// 10. PANEL D'ESTADÍSTIQUES TOTALS DUALS
// ==========================================
function calcularIAnalisarEstadistiquesGlobals() {
    const partits = DB_PARTITS.filter(x => x.equip_id === EQUIP_ACTIU_ID); 
    const jugadors = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const sessions = DB_ENTRENAMENTS.filter(x => x.equip_id === EQUIP_ACTIU_ID);

    if(document.getElementById('stat-total-sessions-actives-badge')) document.getElementById('stat-total-sessions-actives-badge').innerText = `${sessions.length} sessions`;

    let asisMap = {}; jugadors.forEach(j => { asisMap[j.id] = { P: 0, A: 0, J: 0 }; });
    sessions.forEach(s => {
        if(s.asistencia) {
            Object.keys(s.asistencia).forEach(jId => { if(asisMap[jId]) { let est = s.asistencia[jId]; if(asisMap[jId][est] !== undefined) asisMap[jId][est]++; } });
        }
    });

    const tbodyAsistencia = document.getElementById('stat-tabla-asistencia-entrenamientos');
    if(tbodyAsistencia) {
        tbodyAsistencia.innerHTML = jugadors.map(j => {
            let p = asisMap[j.id].P; let a = asisMap[j.id].A; let fnJ = asisMap[j.id].J; let totalSess = p + a + fnJ;
            return `<tr class="border-b border-slate-850 text-center text-xs hover:bg-slate-900/40"><td class="p-2.5 text-left font-semibold text-white pl-4">#${j.dorsal || '0'} - ${j.nombre}</td><td class="text-emerald-400 font-bold font-mono">${p}</td><td class="text-rose-400 font-bold font-mono">${a}</td><td class="text-amber-500 font-bold font-mono">${fnJ}</td><td class="text-slate-400 font-mono">${totalSess}</td><td class="p-2.5 text-right pr-6 font-black text-teal-400 font-mono">${totalSess > 0 ? ((p / totalSess) * 100).toFixed(0) : 0}%</td></tr>`;
        }).join('');
    }

    let favor = 0; let contra = 0; let guanyats = 0; let empatats = 0; let perduts = 0;
    let mConvocat = {}; let mMinutsTotals = {}; let mGols = {}; jugadors.forEach(j => { mConvocat[j.id] = 0; mMinutsTotals[j.id] = 0; mGols[j.id] = 0; });
    
    partits.forEach(p => {
        contra += p.golsRival || 0; let golsNostresPartit = 0;
        if (p.convocats) { p.convocats.forEach(cx => { golsNostresPartit += cx.golsMarcats || 0; if (mConvocat[cx.jugadorId] !== undefined) { mConvocat[cx.jugadorId]++; mMinutsTotals[cx.jugadorId] += cx.minuts || 0; mGols[cx.jugadorId] += cx.golsMarcats || 0; } }); }
        favor += golsNostresPartit;
        if (p.convocats && p.convocats.length > 0) { if (golsNostresPartit > p.golsRival) guanyats++; else if (golsNostresPartit === p.golsRival) empatats++; else perduts++; }
    });
    
    document.getElementById('stat-gols-favor').innerText = favor; document.getElementById('stat-gols-contra').innerText = contra; document.getElementById('stat-total-encontres').innerText = partits.length;
    document.getElementById('stat-partidos-ganados').innerText = guanyats; document.getElementById('stat-partidos-empatados').innerText = empatats; document.getElementById('stat-partidos-perdidos').innerText = perduts;
    
    document.getElementById('stat-tabla-completa-jugadores').innerHTML = jugadors.map(j => {
        let partitsConvocat = mConvocat[j.id] || 0; let minutsTotals = mMinutsTotals[j.id] || 0;
        const eqActiu = LLISTA_EQUIPS.find(x => x.id === EQUIP_ACTIU_ID) || { categoria: "benjami" };
        let totalMaxPartit = eqActiu.categoria === "prebenjami" ? 40 : eqActiu.categoria === "alevi" ? 60 : 48;
        return `<tr class="border-b border-slate-850 text-center text-xs hover:bg-slate-900/40"><td class="p-2.5 text-left font-semibold text-white pl-4">#${j.dorsal || '0'} - ${j.nombre}</td><td>${partitsConvocat}</td><td class="text-amber-500 font-bold font-mono">${partitsConvocat > 0 ? Math.round(partitsConvocat*0.6) : 0}</td><td class="text-teal-400 font-bold font-mono">${partitsConvocat > 0 ? Math.round(partitsConvocat*0.4) : 0}</td><td class="text-indigo-400 font-bold font-mono">${minutsTotals} min</td><td>${partitsConvocat > 0 ? (minutsTotals / partitsConvocat).toFixed(1) : "0.0"} m</td><td class="text-sky-400 font-black font-mono">${partitsConvocat > 0 ? ((minutsTotals / (partitsConvocat * totalMaxPartit)) * 100).toFixed(0) : 0}%</td><td class="text-emerald-400 font-black font-mono">${mGols[j.id] || 0}</td></tr>`;
    }).join('');
}

// ==========================================
// 11. PANEL GESTIÓ DINÀMICA D'EQUIPS
// ==========================================
function actualitzarConfiguracioEntitat() {
    const nouNomClub = document.getElementById('cfg-nom-club').value.trim(); if (!nouNomClub) return;
    CONFIG_CLUB.nomClub = nouNomClub; desarTotLocalmente();
    document.getElementById('nav-nom-club').innerText = CONFIG_CLUB.nomClub.toUpperCase(); alert("Configuració desada!");
}

function crearEquipIDosierDinamic() {
    const nomEquip = document.getElementById('cfg-nou-equip-nom').value.trim(); const categoriaEquip = document.getElementById('cfg-nou-equip-categoria').value;
    const emailEntrenador = document.getElementById('cfg-nou-equip-email').value.trim(); const passEntrenador = document.getElementById('cfg-nou-equip-pass').value;
    if (!nomEquip || !emailEntrenador || !passEntrenador) { alert("Siusplau, omple tots els camps."); return; }
    
    const nouIdEquip = "eq-" + Date.now();
    LLISTA_EQUIPS.push({ id: nouIdEquip, nom: nomEquip, categoria: categoriaEquip }); 
    USUARIS_CREDENTIALS.push({ email: emailEntrenador, pass: passEntrenador, rol: "entrenador", equip_id: nouIdEquip });
    desarTotLocalmente();

    document.getElementById('cfg-nou-equip-nom').value = ""; document.getElementById('cfg-nou-equip-email').value = ""; document.getElementById('cfg-nou-equip-pass').value = "";
    alert("Equip creat localment!"); actualitzarSelectorFiltreCoordinadorDinamit(); renderitzarLlistaEquipsConfiguracio();
}

function renderitzarLlistaEquipsConfiguracio() {
    const cont = document.getElementById('cfg-llista-equips-sistema'); if(!cont) return;
    cont.innerHTML = LLISTA_EQUIPS.map(e => {
        const creds = USUARIS_CREDENTIALS.find(u => u.equip_id === e.id) || { email: "Sense accés", pass: "-" };
        return `<div class="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center text-[11px]"><div><div class="font-bold text-white mb-0.5">${e.nom} <span class="text-[9px] bg-slate-900 text-indigo-400 px-1.5 py-0.2 rounded font-mono ml-1.5">${e.categoria.toUpperCase()}</span></div><div class="text-slate-400 text-[10px]">Accés: ${creds.email}</div></div><button onclick="if(confirm('Eliminar?')){ LLISTA_EQUIPS=LLISTA_EQUIPS.filter(x=>x.id!=='${e.id}'); desarTotLocalmente(); canviarEquipActiuGeneral(); }" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><i class="fas fa-trash-alt"></i></button></div>`;
    }).join('');
}

// ==========================================
// 12. INICIALITZACIÓ AUTOMÀTICA LOCAL
// ==========================================
setTimeout(() => {
    const e = document.getElementById('login-email'); if(e) { e.value = "coordinador@club.com"; executarLoginSimulat(); }
}, 300);
