// ==========================================================================
// 1. BASE DE DADES (LOCALSTORAGE) I CONFIGURACIÓ DE L'APLICACIÓ
// ==========================================================================
let CONFIG_CLUB = JSON.parse(localStorage.getItem('fc_config_multi')) || { nomClub: "INSTITUT LES CORTS" };

let LLISTA_EQUIPS = JSON.parse(localStorage.getItem('fc_equips_multi')) || [
    { id: "1eso-a", nom: "1r ESO - Grup A" }, 
    { id: "1eso-b", nom: "1r ESO - Grup B" }
];

let USUARIS_CREDENTIALS = JSON.parse(localStorage.getItem('fc_usuaris_multi')) || [
    { email: "coordinador@club.com", pass: "1234", rol: "coordinador", equip_id: null },
    { email: "entrenadorA@club.com", pass: "1234", rol: "entrenador", equip_id: "1eso-a" },
    { email: "entrenadorB@club.com", pass: "1234", rol: "entrenador", equip_id: "1eso-b" }
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

// ==========================================================================
// 1.B CONFIGURACIÓ DE GOOGLE FIREBASE INTERNA
// ==========================================================================
const firebaseConfig = { apiKey: "AQUI_VA_LA_TEVA_API_KEY", authDomain: "EL_TEU_PROJECTE.firebaseapp.com", projectId: "EL_TEU_PROJECTE", storageBucket: "EL_TEU_PROJECTE.appspot.com" };
let db = null; let storage = null;
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "AQUI_VA_LA_TEVA_API_KEY") {
    try { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); storage = firebase.storage(); } catch (e) {}
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
    if(document.getElementById(`seccion-${p}`)) document.getElementById(`seccion-${s===p?s:p}`).classList.remove('seccion-oculta');
    if(document.getElementById(`btn-${p}`)) document.getElementById(`btn-${p}`).className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white transition cursor-pointer";
    
    if (p === 'estadisticas') calcularIAnalisarEstadistiquesGlobals();
    if (p === 'configuracion') aplicarConfiguracioInterficie();
}

// ==========================================
// 4. BIBLIOTECA DE TASQUES / EXERCICIS
// ==========================================
async function crearEjercicioFirebase() {
    const n = document.getElementById('task-nombre').value.trim(); 
    const e = document.getElementById('task-explicacion').value.trim(); 
    if (!n || !e) { alert("El nom i la descripció són obligatoris."); return; }
    
    const novaTasca = { id: "ex-" + Date.now(), nombre: n, tipo: document.getElementById('task-tipo').value, imagen: "", explicacion: e, creador: USUARI_ACTIU.email };
    DB_EXERCICIS.push(novaTasca);
    localStorage.setItem('fc_exercicis_multi', JSON.stringify(DB_EXERCICIS));
    
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
            <button onclick="DB_EXERCICIS=DB_EXERCICIS.filter(x=>x.id!=='${e.id}'); localStorage.setItem('fc_exercicis_multi', JSON.stringify(DB_EXERCICIS)); renderitzarBibliotecaExercicis();" class="text-slate-600 hover:text-rose-400 text-left pt-3 text-[10px] cursor-pointer mt-2 transition"><i class="fas fa-trash-alt mr-1"></i>Eliminar tasca</button>
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
                    explicacion: plantillaEx.explicacion, // Còpia local editable
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
        tasquesClonades: arrTasquesSessio, // Nova estructura independent
        asistencia: {} 
    });
    
    localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS));
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
                <button onclick="DB_ENTRENAMENTS=DB_ENTRENAMENTS.filter(x=>x.id!=='${e.id}'); localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS)); renderitzarEntrenaments();" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('');
}

function obrirGestioAsistenciaSessio(idEntrenament) {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idEntrenament); if (!entreno) return;
    idSessioActivaAssistència = idEntrenament; cambiarPestana('detalles-entrenamiento');
    document.getElementById('det-entreno-titol').innerText = `Sessió #${entreno.numeroSessio}`;
    document.getElementById('det-entreno-meta').innerText = `Objectiu: ${entreno.objetivo} | Data: ${entreno.fecha}`;

    // Compatibilitat enrere per si hi ha sessions velles:
    let llistaAExhibir = [];
    if(entreno.tasquesClonades && entreno.tasquesClonades.length > 0) {
        llistaAExhibir = entreno.tasquesClonades;
    } else if(entreno.tasquesIds) {
        llistaAExhibir = entreno.tasquesIds.map((id, idx) => {
            const ex = DB_EXERCICIS.find(x => x.id === id);
            return ex ? { idTascaUnica: "old-"+idx, nombre: ex.nombre, tipo: ex.tipo, explicacion: ex.explicacion, durada: 15 } : null;
        }).filter(x => x !== null);
    }

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
                    <label class="text-[10px] text-slate-500 block">Explicació i Variants d'aquesta sessió:</label>
                    <textarea id="txt-clon-det-ex-${ex.idTascaUnica}" oninput="actualitzarTextTascaSessioEnCalent('${ex.idTascaUnica}', this.value)" class="w-full bg-slate-900 border border-slate-800 text-slate-300 rounded p-2 text-xs focus:border-indigo-500 focus:outline-none leading-relaxed" rows="4">${ex.explicacion}</textarea>
                </div>
            </div>`;
    }).join('');

    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const tbody = document.getElementById('tabla-asistencia-sesion-interna');
    if (alumnes.length === 0) { tbody.innerHTML = `<tr><td class="p-4 text-center text-xs text-slate-500 italic">No hi ha alumnes actius.</td></tr>`; return; }
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
        if(t) t.explicacion = nouText;
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
    localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS)); alert("Sessió i variants desades amb èxit!");
    cambiarPestana('entrenamientos'); renderitzarEntrenaments();
}

// ==========================================
// 6. GESTIÓ DE L'ALUMNAT (PLANTILLA)
// ==========================================
function renderitzarPlantilla() {
    const tbody = document.getElementById('tabla-jugadores'); const f = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    document.getElementById('total-jugadores').innerText = f.length;
    if(f.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-slate-500 italic bg-slate-900/40">Grup buit. Prems 'Afegir Alumne'.</td></tr>`; return; }
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
    localStorage.setItem('fc_jugadors_multi', JSON.stringify(DB_JUGADORS)); tancarModalJugador(); renderitzarPlantilla(); 
}

function obrirFitxaJugador(id) {
    const p = DB_JUGADORS.find(x => x.id === id); if(!p) return;
    document.getElementById('modal-fitxa-jugador').classList.remove('seccion-oculta');
    document.getElementById('fitxa-nom').innerText = p.nombre; document.getElementById('fitxa-dorsal').innerText = "Codi: #" + (p.dorsal || "0");
    document.getElementById('fitxa-p1').innerText = p.posicion || 'Sense dades'; document.getElementById('fitxa-lateral').innerText = p.lateral;
    document.getElementById('fitxa-text-pare').innerHTML = `<b>Tutor 1:</b> ${p.telPare || 'Sense telèfon'}`; document.getElementById('fitxa-text-mare').innerHTML = `<b>Tutor 2:</b> ${p.telMare || 'Sense telèfon'}`;
    document.getElementById('fitxa-accions-pare').innerHTML = p.telPare ? `<a href="tel:${p.telPare}" class="bg-slate-800 p-1 rounded text-[10px]"><i class="fas fa-phone"></i></a><a href="https://wa.me/${p.telPare.replace(/\s+/g, '')}" target="_blank" class="bg-emerald-600 px-2 py-1 rounded text-white font-bold text-[10px] flex items-center gap-0.5"><i class="fab fa-whatsapp"></i> WA</a>` : '';
    document.getElementById('fitxa-accions-mare').innerHTML = p.telMare ? `<a href="tel:${p.telMare}" class="bg-slate-800 p-1 rounded text-[10px]"><i class="fas fa-phone"></i></a><a href="https://wa.me/${p.telMare.replace(/\s+/g, '')}" target="_blank" class="bg-emerald-600 px-2 py-1 rounded text-white font-bold text-[10px] flex items-center gap-0.5"><i class="fab fa-whatsapp"></i> WA</a>` : '';
    document.getElementById('btn-fitxa-eliminar').onclick = () => { if(confirm("Eliminar alumne?")) { DB_JUGADORS = DB_JUGADORS.filter(x => x.id !== id); localStorage.setItem('fc_jugadors_multi', JSON.stringify(DB_JUGADORS)); renderitzarPlantilla(); tancarFitxaJugador(); } };
    document.getElementById('btn-fitxa-editar').onclick = () => { tancarFitxaJugador(); obrirModalJugador('editar', p.id); };
}

function obrirModalJugador(mode, id='') {
    document.getElementById('player-id-edicio').value = ""; document.getElementById('player-nom').value = ""; document.getElementById('player-dorsal').value = ""; document.getElementById('player-p1').value = ""; document.getElementById('player-tel-pare').value = ""; document.getElementById('player-tel-mare').value = ""; document.getElementById('player-lateral').value = "Dretà";
    if (mode === 'editar' && id) {
        const j = DB_JUGADORS.find(x => x.id === id);
        if (j) { document.getElementById('player-id-edicio').value = j.id; document.getElementById('player-nom').value = j.nombre; document.getElementById('player-dorsal').value = j.dorsal || ""; document.getElementById('player-p1').value = j.posicion || ""; document.getElementById('player-tel-pare').value = j.telPare || ""; document.getElementById('player-tel-mare').value = j.telMare || ""; document.getElementById('player-lateral').value = j.lateral || "Dretà"; }
    }
    document.getElementById('modal-jugador').classList.remove('seccion-oculta');
}
function tancarModalJugador() { document.getElementById('modal-jugador').classList.add('seccion-oculta'); }
function tancarFitxaJugador() { document.getElementById('modal-fitxa-jugador').classList.add('seccion-oculta'); }

// ==========================================
// 7. ACTES DE PARTIT I HISTORIAL
// ==========================================
function crearPartidoRapido() {
    const r = document.getElementById('partido-rival').value.trim(); if(!r) return;
    DB_PARTITS.push({ id: "par-" + Date.now(), equip_id: EQUIP_ACTIU_ID, rival: r, campo: document.getElementById('partido-campo').value, fecha: document.getElementById('partido-fecha').value, hora: document.getElementById('partido-hora').value, valoracio: "", golsRival: 0, convocats: [], posicionsCamp: {}, subs: [], sistema: "1-2-3-1" });
    localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS)); document.getElementById('partido-rival').value = ""; renderitzarPartits();
}

// ... (la resta de funcions es mantenen intactes al teu fitxer)
