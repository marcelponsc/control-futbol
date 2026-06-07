// ==========================================================================
// 1. BASE DE DADES (LOCALSTORAGE) I CONFIGURACIÓ DE L'APLICACIÓ
// ==========================================================================
let CONFIG_CLUB = JSON.parse(localStorage.getItem('fc_config_multi')) || { nomClub: "INSTITUT LES CORTS" };

// Llista d'equips dinàmica (si no n'hi ha, en fiquem dos de mostra per defecte)
let LLISTA_EQUIPS = JSON.parse(localStorage.getItem('fc_equips_multi')) || [
    { id: "1eso-a", nom: "1r ESO - Grup A" }, 
    { id: "1eso-b", nom: "1r ESO - Grup B" }
];

// Credencials dinàmiques d'usuaris (si no n'hi ha, creem la base inicial)
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

// ==========================================================================
// 1.B CONFIGURACIÓ DE GOOGLE FIREBASE INTERNA (Ancoratge per al futur)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AQUI_VA_LA_TEVA_API_KEY",
    authDomain: "EL_TEU_PROJECTE.firebaseapp.com",
    projectId: "EL_TEU_PROJECTE",
    storageBucket: "EL_TEU_PROJECTE.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234:web:abcd"
};
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
    if (!u) { alert("Credencials incorrectes o l'equip no existeix."); return; }
    
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
    USUARI_ACTIU = null; 
    EQUIP_ACTIU_ID = "";
    document.getElementById('pantalla-login').classList.remove('seccion-oculta');
    document.getElementById('interficie-app').classList.add('seccion-oculta');
}

// ==========================================
// 3. NAVEGACIÓ I CANVI D'EQUIP GENERAL
// ==========================================
function canviarEquipActiuCoordinador(id) { 
    EQUIP_ACTIU_ID = id; 
    canviarEquipActiuGeneral(); 
}

function canviarEquipActiuGeneral() {
    const eq = LLISTA_EQUIPS.find(e => e.id === EQUIP_ACTIU_ID);
    document.getElementById('titol-plantilla-equip').innerText = eq ? eq.nom.toUpperCase() : "SENSE EQUIP ACTIU";
    renderitzarPlantilla(); 
    renderitzarPartits(); 
    renderitzarBibliotecaExercicis(); 
    inicialitzarEstructuraSelectorsEntrenaments(); 
    renderitzarEntrenaments(); 
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

// ==========================================================================
// 5. GESTIÓ DE LA BIBLIOTECA D'EXERCICIS
// ==========================================================================
async function crearEjercicioFirebase() {
    const n = document.getElementById('task-nombre').value.trim(); 
    const e = document.getElementById('task-explicacion').value.trim(); 
    const botoPujar = document.getElementById('btn-pujar-tasca');
    
    if (!n || !e) { alert("El nom i la descripció són obligatoris."); return; }
    
    const novaTasca = { 
        id: "ex-" + Date.now(), 
        nombre: n, 
        tipo: document.getElementById('task-tipo').value, 
        imagen: "", 
        explicacion: e, 
        creador: USUARI_ACTIU.email 
    };

    DB_EXERCICIS.push(novaTasca);
    localStorage.setItem('fc_exercicis_multi', JSON.stringify(DB_EXERCICIS));
    
    document.getElementById('task-nombre').value = ""; 
    document.getElementById('task-explicacion').value = "";
    
    renderitzarBibliotecaExercicis(); 
    inicialitzarEstructuraSelectorsEntrenaments();
}

function renderitzarBibliotecaExercicis() {
    const g = document.getElementById('grid-ejercicios'); 
    const flt = document.getElementById('task-filtro-tipo') ? document.getElementById('task-filtro-tipo').value : "Tots";
    const filtrats = DB_EXERCICIS.filter(e => flt === "Tots" || e.tipo === flt);
    document.getElementById('total-tasques').innerText = `Biblioteca comuna (${filtrats.length} tasques actives)`;
    
    if(filtrats.length === 0) { 
        g.innerHTML = `<p class="col-span-2 text-slate-500 text-center py-4 text-xs italic bg-slate-900 border border-slate-850 rounded-xl">Banc buit.</p>`; 
        return; 
    }
    g.innerHTML = filtrats.map(e => `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between text-xs shadow-sm">
            <div>
                <div class="flex justify-between border-b border-slate-850 pb-1.5 text-[10px] text-slate-500 mb-2">
                    <span class="font-bold uppercase tracking-wider text-indigo-400">${e.tipo}</span>
                    <span>Per: ${e.creador ? e.creador.split('@')[0] : 'Admin'}</span>
                </div>
                <h4 class="font-black text-white text-sm mt-1">${e.nombre}</h4>
                <p class="text-slate-400 mt-1 whitespace-pre-line leading-relaxed">${e.explicacion}</p>
            </div>
            <button onclick="DB_EXERCICIS=DB_EXERCICIS.filter(x=>x.id!=='${e.id}'); localStorage.setItem('fc_exercicis_multi', JSON.stringify(DB_EXERCICIS)); renderitzarBibliotecaExercicis();" class="text-slate-600 hover:text-rose-400 text-left pt-3 text-[10px] cursor-pointer mt-2 transition"><i class="fas fa-trash-alt mr-1"></i>Eliminar tasca</button>
        </div>`).join('');
}

// ==========================================
// 6. GESTIÓ DE SESSIONS I ASSISTÈNCIA
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
    const desti = document.getElementById(`slot-${n}-select`); 
    if(!desti) return;
    
    const filtrats = DB_EXERCICIS.filter(e => f === "Tots" || e.tipo === f);
    desti.innerHTML = filtrats.length === 0 ? `<option value="">-- Buida --</option>` : `<option value="">-- Tria Tasca ${n} --</option>` + filtrats.map(x => `<option value="${x.id}">${x.nombre}</option>`).join('');
}

function crearEntrenamiento() {
    const d = document.getElementById('entreno-fecha').value; 
    const o = document.getElementById('entreno-objetivo').value.trim(); 
    if(!d || !o) return;
    
    let arr = []; 
    for(let i=1; i<=5; i++) { 
        let v = document.getElementById(`slot-${i}-select`).value; 
        if(v) arr.push(v); 
    }
    
    DB_ENTRENAMENTS.push({ 
        id: "ent-" + Date.now(), 
        equip_id: EQUIP_ACTIU_ID, 
        numeroSessio: DB_ENTRENAMENTS.filter(x => x.equip_id === EQUIP_ACTIU_ID).length + 1, 
        fecha: d, 
        objetivo: o, 
        notes: document.getElementById('entreno-notes').value.trim(), 
        tasquesIds: arr,
        asistencia: {} 
    });
    localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS));
    document.getElementById('entreno-objetivo').value = ""; 
    document.getElementById('entreno-notes').value = ""; 
    renderitzarEntrenaments();
}

function renderitzarEntrenaments() {
    const l = document.getElementById('lista-entrenamientos'); 
    const f = DB_ENTRENAMENTS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    
    if(f.length === 0) { 
        l.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4 bg-slate-900 border border-slate-850 rounded-xl">Cap lliçó guardada.</p>`; 
        return; 
    }
    l.innerHTML = f.map(e => `
        <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs shadow-sm">
            <div>
                <span class="bg-indigo-950 border border-indigo-900 px-2 py-0.5 rounded text-indigo-400 font-bold mr-2">Sessió #${e.numeroSessio}</span>
                <span class="font-bold text-white">${e.fecha}</span> - ${e.objetivo}
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="obrirGestioAsistenciaSessio('${e.id}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">Veure Sessió i Llista</button>
                <button onclick="DB_ENTRENAMENTS=DB_ENTRENAMENTS.filter(x=>x.id!=='${e.id}'); localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS)); renderitzarEntrenaments();" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`).join('');
}

function obrirGestioAsistenciaSessio(idEntrenament) {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idEntrenament);
    if (!entreno) { alert("No s'ha trobat la sessió."); return; }

    idSessioActivaAssistència = idEntrenament;
    cambiarPestana('detalles-entrenamiento');

    document.getElementById('det-entreno-titol').innerText = `Sessió #${entreno.numeroSessio}`;
    document.getElementById('det-entreno-meta').innerText = `Objectiu: ${entreno.objetivo} | Data: ${entreno.fecha}`;

    const contenedorTasques = document.getElementById('det-entreno-lista-tasques');
    if (!entreno.tasquesIds || entreno.tasquesIds.length === 0) {
        contenedorTasques.innerHTML = `<p class="text-xs text-slate-500 italic col-span-2">No s'han programat tasques.</p>`;
    } else {
        contenedorTasques.innerHTML = entreno.tasquesIds.map((id, idx) => {
            const ex = DB_EXERCICIS.find(x => x.id === id);
            if (!ex) return "";
            return `
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1 text-xs shadow-md">
                    <div class="flex justify-between text-[10px] text-slate-500 border-b border-slate-900 pb-0.5">
                        <span class="font-bold text-indigo-400">Tasca ${idx + 1}</span><span class="bg-slate-900 px-1.5 py-0.5 rounded font-medium">${ex.tipo}</span>
                    </div>
                    <h4 class="font-black text-white text-sm mt-1">${ex.nombre}</h4>
                    <p class="text-slate-400 whitespace-pre-line leading-relaxed">${ex.explicacion}</p>
                </div>`;
        }).join('');
    }

    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const tbody = document.getElementById('tabla-asistencia-sesion-interna');
    if (alumnes.length === 0) {
        tbody.innerHTML = `<tr><td class="p-4 text-center text-xs text-slate-500 italic">No hi ha alumnes actius.</td></tr>`;
        return;
    }

    if (!entreno.asistencia) entreno.asistencia = {};

    tbody.innerHTML = alumnes.map(j => {
        let estatActual = entreno.asistencia[j.id] || "P"; 
        return `
            <tr class="hover:bg-slate-900/10 text-center border-b border-slate-850/60">
                <td class="p-2.5 text-left font-semibold text-white truncate max-w-[110px]">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</td>
                <td class="p-2.5 flex justify-center">
                    <div class="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 gap-0.5 text-[10px] font-bold">
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'P')" id="btn-asis-int-${j.id}-P" class="px-2 py-0.5 rounded transition cursor-pointer ${estatActual === 'P' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'}">P</button>
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'A')" id="btn-asis-int-${j.id}-A" class="px-2 py-0.5 rounded transition cursor-pointer ${estatActual === 'A' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'}">A</button>
                        <button onclick="canviarEstatBotoAssistènciaInterna('${j.id}', 'J')" id="btn-asis-int-${j.id}-J" class="px-2 py-0.5 rounded transition cursor-pointer ${estatActual === 'J' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'}">J</button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function canviarEstatBotoAssistènciaInterna(jugadorId, nouEstat) {
    ['P', 'A', 'J'].forEach(e => {
        const btn = document.getElementById(`btn-asis-int-${jugadorId}-${e}`);
        if (btn) {
            if (e === nouEstat) {
                if (e === 'P') btn.className = "px-2 py-0.5 rounded bg-emerald-600 text-white shadow font-bold text-[10px]";
                if (e === 'A') btn.className = "px-2 py-0.5 rounded bg-rose-600 text-white shadow font-bold text-[10px]";
                if (e === 'J') btn.className = "px-2 py-0.5 rounded bg-amber-500 text-slate-950 shadow font-bold text-[10px]";
            } else {
                btn.className = "px-2 py-0.5 rounded text-slate-400 font-bold text-[10px]";
            }
        }
    });
}

function desarAsistenciaSessióActual() {
    const entreno = DB_ENTRENAMENTS.find(x => x.id === idSessioActivaAssistència);
    if (!entreno) return;

    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    alumnes.forEach(j => {
        let estatTrobat = "P";
        const btnA = document.getElementById(`btn-asis-int-${j.id}-A`);
        const btnJ = document.getElementById(`btn-asis-int-${j.id}-J`);
        if (btnA && btnA.classList.contains('bg-rose-600')) estatTrobat = "A";
        if (btnJ && btnJ.classList.contains('bg-amber-500')) estatTrobat = "J";
        entreno.asistencia[j.id] = estatTrobat;
    });

    localStorage.setItem('fc_entrenaments_multi', JSON.stringify(DB_ENTRENAMENTS));
    alert("Assistència guardada correctament!");
    cambiarPestana('entrenamientos');
    renderitzarEntrenaments();
}

// ==========================================
// 7. GESTIÓ DE LA PLANTILLA (ALUMNAT)
// ==========================================
function renderitzarPlantilla() {
    const tbody = document.getElementById('tabla-jugadores'); 
    const f = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    document.getElementById('total-jugadores').innerText = f.length;
    
    if(f.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-xs text-slate-500 italic bg-slate-900/40">Grup buit. Prems 'Afegir Alumne'.</td></tr>`; 
        return; 
    }
    tbody.innerHTML = f.map(p => `
        <tr class="hover:bg-slate-800/40 text-xs border-b border-slate-850 text-center">
            <td class="p-2.5 text-left pl-4"><div class="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center"><i class="fas fa-user text-slate-600 text-xs"></i></div></td>
            <td class="p-2.5 text-left font-mono font-bold text-indigo-400">#${p.dorsal || '0'}</td>
            <td class="p-2.5 text-left font-semibold text-white">${p.nombre}</td>
            <td class="p-2.5 text-right space-x-1 pr-4">
                <button onclick="obrirModalJugador('editar', '${p.id}')" class="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-lg cursor-pointer">Modificar</button>
                <button onclick="obrirFitxaJugador('${p.id}')" class="bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-lg cursor-pointer">Fitxa</button>
            </td>
        </tr>`).join('');
}

function guardarJugador() {
    const idEdicio = document.getElementById('player-id-edicio').value; 
    const nom = document.getElementById('player-nom').value.trim(); 
    if(!nom) return;
    
    const d = { 
        equip_id: EQUIP_ACTIU_ID, 
        nombre: nom, 
        dorsal: document.getElementById('player-dorsal').value, 
        posicion: document.getElementById('player-p1').value, 
        lateral: document.getElementById('player-lateral').value, 
        telPare: document.getElementById('player-tel-pare').value, 
        telMare: document.getElementById('player-tel-mare').value 
    };
    
    if(idEdicio) { 
        let idx = DB_JUGADORS.findIndex(x => x.id === idEdicio); 
        if(idx !== -1) DB_JUGADORS[idx] = {id: idEdicio, ...d}; 
    } else { 
        DB_JUGADORS.push({ id: "p-" + Date.now(), ...d }); 
    }
    localStorage.setItem('fc_jugadors_multi', JSON.stringify(DB_JUGADORS)); 
    tancarModalJugador(); 
    renderitzarPlantilla(); 
}

function obrirFitxaJugador(id) {
    const p = DB_JUGADORS.find(x => x.id === id); if(!p) return;
    document.getElementById('modal-fitxa-jugador').classList.remove('seccion-oculta');
    document.getElementById('fitxa-nom').innerText = p.nombre; 
    document.getElementById('fitxa-dorsal').innerText = "Codi: #" + (p.dorsal || "0");
    document.getElementById('fitxa-p1').innerText = p.posicion || 'Sense dades'; 
    document.getElementById('fitxa-lateral').innerText = p.lateral;
    document.getElementById('fitxa-text-pare').innerHTML = `<b>Tutor 1:</b> ${p.telPare || 'Sense telèfon'}`;
    document.getElementById('fitxa-text-mare').innerHTML = `<b>Tutor 2:</b> ${p.telMare || 'Sense telèfon'}`;
    
    document.getElementById('fitxa-accions-pare').innerHTML = p.telPare ? `<a href="tel:${p.telPare}" class="bg-slate-800 p-1 rounded text-white text-[10px]"><i class="fas fa-phone"></i></a><a href="https://wa.me/${p.telPare.replace(/\s+/g, '')}" target="_blank" class="bg-emerald-600 px-2 py-1 rounded text-white font-bold text-[10px] flex items-center gap-0.5"><i class="fab fa-whatsapp"></i> WA</a>` : '';
    document.getElementById('fitxa-accions-mare').innerHTML = p.telMare ? `<a href="tel:${p.telMare}" class="bg-slate-800 p-1 rounded text-white text-[10px]"><i class="fas fa-phone"></i></a><a href="https://wa.me/${p.telMare.replace(/\s+/g, '')}" target="_blank" class="bg-emerald-600 px-2 py-1 rounded text-white font-bold text-[10px] flex items-center gap-0.5"><i class="fab fa-whatsapp"></i> WA</a>` : '';

    document.getElementById('btn-fitxa-eliminar').onclick = () => { 
        if(confirm("Eliminar alumne?")) { 
            DB_JUGADORS = DB_JUGADORS.filter(x => x.id !== id); 
            localStorage.setItem('fc_jugadors_multi', JSON.stringify(DB_JUGADORS)); 
            renderitzarPlantilla(); tancarFitxaJugador(); 
        } 
    };
    document.getElementById('btn-fitxa-editar').onclick = () => { tancarFitxaJugador(); obrirModalJugador('editar', p.id); };
}

function obrirModalJugador(mode, id='') {
    document.getElementById('player-id-edicio').value = "";
    document.getElementById('player-nom').value = ""; document.getElementById('player-dorsal').value = "";
    document.getElementById('player-p1').value = ""; document.getElementById('player-tel-pare').value = "";
    document.getElementById('player-tel-mare').value = ""; document.getElementById('player-lateral').value = "Dretà";
    
    if (mode === 'editar' && id) {
        const j = DB_JUGADORS.find(x => x.id === id);
        if (j) {
            document.getElementById('player-id-edicio').value = j.id; 
            document.getElementById('player-nom').value = j.nombre;
            document.getElementById('player-dorsal').value = j.dorsal || ""; 
            document.getElementById('player-p1').value = j.posicion || "";
            document.getElementById('player-tel-pare').value = j.telPare || ""; 
            document.getElementById('player-tel-mare').value = j.telMare || "";
            document.getElementById('player-lateral').value = j.lateral || "Dretà";
        }
    }
    document.getElementById('modal-jugador').classList.remove('seccion-oculta');
}

function tancarModalJugador() { document.getElementById('modal-jugador').classList.add('seccion-oculta'); }
function tancarFitxaJugador() { document.getElementById('modal-fitxa-jugador').classList.add('seccion-oculta'); }

// ==========================================
// 8. ACTES DE PARTIT I RECOMPTE DE MINUTS
// ==========================================
function crearPartidoRapido() {
    const r = document.getElementById('partido-rival').value.trim(); if(!r) return;
    DB_PARTITS.push({ 
        id: "par-" + Date.now(), 
        equip_id: EQUIP_ACTIU_ID, 
        rival: r, 
        campo: document.getElementById('partido-campo').value, 
        fecha: document.getElementById('partido-fecha').value, 
        hora: document.getElementById('partido-hora').value, 
        valoracio: "", golsRival: 0, convocats: [], posicionsCamp: {}, subs: [] 
    });
    localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS)); 
    document.getElementById('partido-rival').value = ""; 
    renderitzarPartits();
}

function renderitzarPartits() {
    const c = document.getElementById('lista-partidos'); 
    const f = DB_PARTITS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    
    if(f.length === 0) { 
        c.innerHTML = `<p class="text-xs text-slate-500 text-center py-4 bg-slate-900 border border-slate-850 rounded-xl italic">Cap acta oberta.</p>`; 
        return; 
    }
    c.innerHTML = f.map(p => `
        <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
            <div><b class="text-white">vs ${p.rival}</b> (${p.fecha || 'S/D'})</div>
            <button onclick="obrirGestioAvançadaPartit('${p.id}')" class="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer">Obrir Acta</button>
        </div>`).join('');
}

function obrirGestioAvançadaPartit(id) {
    const p = DB_PARTITS.find(x => x.id === id); if(!p) return;
    partitIdActualGestio = id; 
    cambiarPestana('detalles-partido');
    
    document.getElementById('det-partido-rival').innerText = "vs " + p.rival; 
    document.getElementById('det-partido-info').innerText = `${p.campo} | ${p.fecha} | ${p.hora}h`;
    document.getElementById('acta-valoracion').value = p.valoracio; 
    document.getElementById('acta-gols-rival-auto').innerText = p.golsRival;
    
    llistaSubstitucionsTmp = p.subs || [];
    if (!p.convocats) p.convocats = [];
    
    renderitzarLlistaConvocatoriaActa();
    recalcularMarcadorsTotalsAutomàtics(); 
    seleccionarQuartFitxa(2); 
    calcularMinutsAutomaticament(); 
    actualitzarSelectorsDeCanvi(); 
    renderitzarHistorialSubstitucionsVisual();
}

function renderitzarLlistaConvocatoriaActa() {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const alumnes = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    const cont = document.getElementById('lista-convocatoria-check');
    
    cont.innerHTML = alumnes.map(j => {
        const c = p.convocats.find(x => x.jugadorId === j.id);
        const estaConvocat = !!c;
        return `
            <div class="p-2 border rounded-xl flex items-center justify-between text-xs gap-2 shadow-sm transition ${estaConvocat ? 'bg-slate-900 border-indigo-500/50' : 'bg-slate-950/40 border-slate-850 opacity-50'}">
                <div class="flex items-center space-x-2 truncate">
                    <button onclick="commutarConvocatoria('${j.id}')" class="w-5 h-5 rounded-md border flex items-center justify-center font-bold text-[10px] transition cursor-pointer ${estaConvocat ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900 text-transparent'}">
                        <i class="fas fa-check"></i>
                    </button>
                    <span class="text-white font-medium truncate">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</span>
                </div>
                <div class="flex items-center space-x-1.5 shrink-0 ${estaConvocat ? '' : 'invisible'}">
                    <div class="border rounded px-1.5 py-0.5 font-mono text-[10px] text-teal-400 bg-teal-950/20 border-teal-900/40" id="badge-minuts-${j.id}">${c ? c.minuts : 0} min</div>
                    <input type="hidden" id="num-minuts-${j.id}" value="${c ? c.minuts : 0}">
                    <span class="text-[11px]">⚽</span>
                    <input type="number" id="num-gols-${j.id}" value="${c ? c.golsMarcats : 0}" min="0" oninput="actualitzarGolsConvocat('${j.id}', this.value)" class="w-8 bg-slate-950 border border-slate-800 text-center text-white rounded font-mono p-0.5 focus:outline-none">
                </div>
            </div>`;
    }).join('');
}

function commutarConvocatoria(jugadorId) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const idx = p.convocats.findIndex(x => x.jugadorId === jugadorId);
    
    if (idx !== -1) p.convocats.splice(idx, 1);
    else p.convocats.push({ jugadorId: jugadorId, minuts: 0, golsMarcats: 0 });
    
    localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS));
    renderitzarLlistaConvocatoriaActa(); 
    calcularMinutsAutomaticament(); 
    actualitzarSelectorsDeCanvi(); 
    recalcularMarcadorsTotalsAutomàtics();
}

function actualitzarGolsConvocat(jugadorId, valor) {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    const c = p.convocats.find(x => x.jugadorId === jugadorId);
    if (c) { 
        c.golsMarcats = parseInt(valor) || 0; 
        recalcularMarcadorsTotalsAutomàtics(); 
        localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS));
    }
}

function recalcularMarcadorsTotalsAutomàtics() {
    let n = 0; 
    DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID).forEach(j => { 
        let g = document.getElementById(`num-gols-${j.id}`); 
        if(g) n += parseInt(g.value) || 0; 
    });
    document.getElementById('acta-gols-nostres').innerText = n;
}

// ==========================================
// 9. CÀLCUL DE ROTACIONS I CRONOMETRATGE
// ==========================================
function seleccionarQuartFitxa(q) {
    document.getElementById('cambio-quarto-actiu').value = q;
    [2, 3, 4, 'int4'].forEach(s => {
        const b = document.getElementById(`btn-q-${s}`);
        if(b) b.className = (s === q) ? "py-1 bg-teal-600 text-white font-mono font-bold text-xs rounded border border-teal-500 shadow-sm" : "py-1 bg-slate-800 text-slate-400 font-mono font-bold text-xs rounded border border-slate-700";
    });
    if(q === 'int4') document.getElementById('wrapper-minuto-q4').classList.remove('seccion-oculta');
    else document.getElementById('wrapper-minuto-q4').classList.add('seccion-oculta');
}

function actualitzarSelectorsDeCanvi() {
    const sale = document.getElementById('cambio-sale-select'); 
    const entra = document.getElementById('cambio-entra-select'); 
    if(!sale || !entra) return;
    
    let o = `<option value="">-- Tria --</option>`;
    DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID).forEach(j => { 
        o += `<option value="${j.id}">#${j.dorsal || '0'} ${j.nombre.split(' ')[0]}</option>`; 
    });
    sale.innerHTML = o; entra.innerHTML = o;
}

function afegirSubstitucioCronologica() {
    const q = document.getElementById('cambio-quarto-actiu').value; 
    const sId = document.getElementById('cambio-sale-select').value; 
    const eId = document.getElementById('cambio-entra-select').value;
    if(!sId || !eId || sId === eId) { alert("Tria dos alumnes diferents."); return; }
    
    let t = q === '2' ? "Inici Q2 (12')" : q === '3' ? "Inici Q3 (24')" : q === '4' ? "Inici Q4 (36')" : `Min ${document.getElementById('cambio-minuto-real').value}'`;
    const jS = DB_JUGADORS.find(x => x.id === sId); 
    const jE = DB_JUGADORS.find(x => x.id === eId);
    
    llistaSubstitucionsTmp.push({ quarto: q, sale: sId, entra: eId, text: `${t}: ❌ #${jS.dorsal || '0'} ➔ ✅ #${jE.dorsal || '0'}` });
    
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio);
    if(p) { p.subs = llistaSubstitucionsTmp; localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS)); }
    
    renderitzarHistorialSubstitucionsVisual(); 
    calcularMinutsAutomaticament();
}

function renderitzarHistorialSubstitucionsVisual() {
    const h = document.getElementById('historial-cambios-linea'); 
    if(llistaSubstitucionsTmp.length === 0) { h.innerHTML = `<p class="text-slate-600 italic text-[11px]">Cap canvi.</p>`; return; }
    h.innerHTML = llistaSubstitucionsTmp.map((s, idx) => `
        <div class="flex justify-between items-center bg-slate-950 p-1.5 border border-slate-850 rounded font-mono text-[10px] text-slate-300">
            <span>${s.text}</span>
            <button onclick="llistaSubstitucionsTmp.splice(${idx},1); renderitzarHistorialSubstitucionsVisual(); calcularMinutsAutomaticament();" class="text-rose-400 font-bold px-1">✕</button>
        </div>`).join('');
}

function calcularMinutsAutomaticament() {
    const p = DB_PARTITS.find(x => x.id === partitIdActualGestio); if(!p) return;
    let mAcum = {}; 
    p.convocats.forEach(c => { mAcum[c.jugadorId] = 0; });
    
    p.convocats.forEach((c, idx) => {
        let minsBase = 24; 
        llistaSubstitucionsTmp.forEach(sub => {
            if(sub.sale === c.jugadorId) minsBase -= 6;
            if(sub.entra === c.jugadorId) minsBase += 6;
        });
        c.minuts = Math.max(0, Math.min(48, minsBase));
        const badge = document.getElementById(`badge-minuts-${c.jugadorId}`);
        if(badge) badge.innerText = `${c.minuts} min`;
    });
    localStorage.setItem('fc_partits_multi', JSON.stringify(DB_PARTITS));
}

// ==========================================
// 10. PANEL D'ESTADÍSTIQUES TOTALS
// ==========================================
function calcularIAnalisarEstadistiquesGlobals() {
    const partits = DB_PARTITS.filter(x => x.equip_id === EQUIP_ACTIU_ID); 
    const jugadors = DB_JUGADORS.filter(x => x.equip_id === EQUIP_ACTIU_ID);
    let favor = 0; let contra = 0; let guanyats = 0; let empatats = 0; let perduts = 0;
    
    let mConvocat = {}; let mMinutsTotals = {}; let mGols = {};
    jugadors.forEach(j => { mConvocat[j.id] = 0; mMinutsTotals[j.id] = 0; mGols[j.id] = 0; });
    
    partits.forEach(p => {
        contra += p.golsRival || 0; 
        let golsNostresPartit = 0;
        if (p.convocats) {
            p.convocats.forEach(cx => {
                golsNostresPartit += cx.golsMarcats || 0;
                if (mConvocat[cx.jugadorId] !== undefined) {
                    mConvocat[cx.jugadorId]++; 
                    mMinutsTotals[cx.jugadorId] += cx.minuts || 0; 
                    mGols[cx.jugadorId] += cx.golsMarcats || 0;
                }
            });
        }
        favor += golsNostresPartit;
        if (p.convocats && p.convocats.length > 0) {
            if (golsNostresPartit > p.golsRival) guanyats++; 
            else if (golsNostresPartit === p.golsRival) empatats++; 
            else perduts++;
        }
    });
    
    document.getElementById('stat-gols-favor').innerText = favor; 
    document.getElementById('stat-gols-contra').innerText = contra; 
    document.getElementById('stat-total-encontres').innerText = partits.length;
    document.getElementById('stat-partidos-ganados').innerText = guanyats; 
    document.getElementById('stat-partidos-empatados').innerText = empatats;
    document.getElementById('stat-partidos-perdidos').innerText = perduts;
    
    document.getElementById('stat-tabla-completa-jugadores').innerHTML = jugadors.map(j => {
        let partitsConvocat = mConvocat[j.id] || 0; 
        let minutsTotals = mMinutsTotals[j.id] || 0;
        let minutsPerPartitConvocat = partitsConvocat > 0 ? (minutsTotals / partitsConvocat).toFixed(1) : "0.0";
        let percentatgeMinuts = partitsConvocat > 0 ? ((minutsTotals / (partitsConvocat * 48)) * 100).toFixed(0) : "0";
        
        return `
            <tr class="border-b border-slate-850 text-center text-xs hover:bg-slate-900/40">
                <td class="p-2.5 text-left font-semibold text-white pl-4">#${j.dorsal || '0'} - ${j.nombre}</td>
                <td>${partitsConvocat}</td>
                <td class="text-amber-500 font-mono font-bold">${partitsConvocat > 0 ? Math.round(partitsConvocat*0.6) : 0}</td>
                <td class="text-teal-400 font-mono font-bold">${partitsConvocat > 0 ? Math.round(partitsConvocat*0.4) : 0}</td>
                <td class="text-indigo-400 font-bold font-mono">${minutsTotals} min</td>
                <td class="font-mono">${minutsPerPartitConvocat} m</td>
                <td class="text-sky-400 font-black font-mono">${percentatgeMinuts}%</td>
                <td class="text-emerald-400 font-black font-mono">${mGols[j.id] || 0}</td>
            </tr>`;
    }).join('');
}

// ==========================================
// 11. PANEL GESTIÓ DINÀMICA D'EQUIPS (COORDINADOR)
// ==========================================
function actualitzarConfiguracioEntitat() {
    const nouNomClub = document.getElementById('cfg-nom-club').value.trim();
    if (!nouNomClub) return;
    CONFIG_CLUB.nomClub = nouNomClub; 
    localStorage.setItem('fc_config_multi', JSON.stringify(CONFIG_CLUB)); 
    document.getElementById('nav-nom-club').innerText = CONFIG_CLUB.nomClub.toUpperCase();
    alert("Nom de la institució actualitzat!");
}

function crearEquipIDosierDinamic() {
    const nomEquip = document.getElementById('cfg-nou-equip-nom').value.trim();
    const emailEntrenador = document.getElementById('cfg-nou-equip-email').value.trim();
    const passEntrenador = document.getElementById('cfg-nou-equip-pass').value;

    if (!nomEquip || !emailEntrenador || !passEntrenador) {
        alert("Siusplau, omple tots els camps (Nom, Email i Contrasenya).");
        return;
    }

    if (USUARIS_CREDENTIALS.some(x => x.email.toLowerCase() === emailEntrenador.toLowerCase())) {
        alert("Aquest correu electrònic ja existeix al sistema.");
        return;
    }

    const nouIdEquip = "eq-" + Date.now();

    // 1. Guardar l'equip a la llista
    LLISTA_EQUIPS.push({ id: nouIdEquip, nom: nomEquip });
    localStorage.setItem('fc_equips_multi', JSON.stringify(LLISTA_EQUIPS));

    // 2. Crear les credencials de l'entrenador enllaçades
    USUARIS_CREDENTIALS.push({
        email: emailEntrenador,
        pass: passEntrenador,
        rol: "entrenador",
        equip_id: nouIdEquip
    });
    localStorage.setItem('fc_usuaris_multi', JSON.stringify(USUARIS_CREDENTIALS));

    document.getElementById('cfg-nou-equip-nom').value = "";
    document.getElementById('cfg-nou-equip-email').value = "";
    document.getElementById('cfg-nou-equip-pass').value = "";

    alert(`Equip "${nomEquip}" donat d'alta correctament!`);
    
    actualitzarSelectorFiltreCoordinadorDinamit();
    renderitzarLlistaEquipsConfiguracio();
}

function renderitzarLlistaEquipsConfiguracio() {
    const cont = document.getElementById('cfg-llista-equips-sistema');
    if(!cont) return;

    if(LLISTA_EQUIPS.length === 0) {
        cont.innerHTML = `<p class="text-[11px] text-slate-500 italic">No hi ha equips creats.</p>`;
        return;
    }

    cont.innerHTML = LLISTA_EQUIPS.map(e => {
        const creds = USUARIS_CREDENTIALS.find(u => u.equip_id === e.id) || { email: "Sense accés", pass: "-" };
        return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex justify-between items-center text-[11px]">
                <div>
                    <div class="font-bold text-white mb-0.5">${e.nom}</div>
                    <div class="text-slate-400 text-[10px]">Accés: <span class="text-indigo-400 font-mono">${creds.email}</span> | Clau: <span class="text-slate-500 font-mono">${creds.pass}</span></div>
                </div>
                <button onclick="eliminarEquipDelSistema('${e.id}')" class="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
    }).join('');
}

function eliminarEquipDelSistema(idEquip) {
    if(!confirm("Estàs segur d'eliminar aquest equip i el seu usuari?")) return;

    LLISTA_EQUIPS = LLISTA_EQUIPS.filter(x => x.id !== idEquip);
    USUARIS_CREDENTIALS = USUARIS_CREDENTIALS.filter(x => x.equip_id !== idEquip);

    localStorage.setItem('fc_equips_multi', JSON.stringify(LLISTA_EQUIPS));
    localStorage.setItem('fc_usuaris_multi', JSON.stringify(USUARIS_CREDENTIALS));

    if(EQUIP_ACTIU_ID === idEquip) {
        EQUIP_ACTIU_ID = LLISTA_EQUIPS[0] ? LLISTA_EQUIPS[0].id : "";
    }

    actualitzarSelectorFiltreCoordinadorDinamit();
    canviarEquipActiuGeneral();
    renderitzarLlistaEquipsConfiguracio();
}

// ==========================================
// 12. INICIALITZACIÓ AUTOMÀTICA
// ==========================================
setTimeout(() => {
    const e = document.getElementById('login-email'); 
    if(e) { e.value = "coordinador@club.com"; executarLoginSimulat(); }
}, 300);
