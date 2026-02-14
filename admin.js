// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://xyckhqxcipgdvkdmjifg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';

const { createClient } = window.supabase;
supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM ELEMENTS ---
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

// Navegación
const menuItems = document.querySelectorAll('.menu-item');
const viewPanels = document.querySelectorAll('.view-panel');
// Elementos Móviles
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Formularios
const turnoForm = document.getElementById('turno-form');
const btnSaveTurno = document.getElementById('btn-save-turno');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const formTitle = document.getElementById('form-title');
const facturacionForm = document.getElementById('facturacion-form');
const horaSelect = document.getElementById('hora');

// Tablas
const turnosVelezTbody = document.getElementById('turnos-velez-tbody');
const turnosArboledaTbody = document.getElementById('turnos-arboleda-tbody');
const historicoTbody = document.getElementById('historico-tbody');
const statsTbody = document.getElementById('stats-tbody');
const statsExternosTbody = document.getElementById('stats-externos-tbody');
const listaUltimosExternos = document.getElementById('lista-ultimos-externos');

// KPIs
const kpiTurnosHoy = document.getElementById('kpi-turnos-hoy');
const kpiIngresosMes = document.getElementById('kpi-ingresos-mes');
const kpiProxPaciente = document.getElementById('kpi-prox-paciente');
const kpiProxHora = document.getElementById('kpi-prox-hora');


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    popularHorarios();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        initDashboard();
    }
});

function initDashboard() {
    loginSection.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    cargarDatosGenerales();
}

// --- LOGICA DE MENÚ MÓVIL ---
function toggleMenu() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}
if(mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMenu);
if(sidebarOverlay) sidebarOverlay.addEventListener('click', toggleMenu);

// --- NAVEGACIÓN ---
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        // Active visual
        menuItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');
        
        // Cambio de panel
        viewPanels.forEach(panel => panel.style.display = 'none');
        const targetId = item.dataset.target;
        document.getElementById(targetId).style.display = 'block';

        // Acciones extra
        cancelarEdicion();
        cargarDatosGenerales();
        
        // CERRAR MENU AUTOMÁTICAMENTE EN MÓVIL
        if (window.innerWidth <= 900) {
            toggleMenu();
        }
    });
});

// --- DATOS Y CACHÉ ---
let turnosCache = [];

async function cargarDatosGenerales() {
    const { data: turnos } = await supabase.from('turnos').select('*').order('fecha_hora', { ascending: true });
    turnosCache = turnos || [];
    const { data: externos } = await supabase.from('facturacion_externa').select('*').order('fecha', { ascending: false });

    if(turnos && externos) {
        renderAgenda(turnos);
        renderHistorico(turnos);
        renderFinanzas(turnos, externos);
        renderDashboardKPIs(turnos, externos);
    }
}

// --- RENDER AGENDA (CON DATA-LABELS PARA MÓVIL) ---
function renderAgenda(turnos) {
    turnosVelezTbody.innerHTML = '';
    turnosArboledaTbody.innerHTML = '';
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    const futuros = turnos.filter(t => new Date(t.fecha_hora) >= hoy);

    if (futuros.length === 0) {
        // Mensaje vacío
        const msg = '<tr><td colspan="5" style="text-align:center;">No hay turnos próximos.</td></tr>';
        turnosVelezTbody.innerHTML = msg;
        turnosArboledaTbody.innerHTML = msg;
        return;
    }

    futuros.forEach(t => {
        const fecha = new Date(t.fecha_hora);
        const hora = fecha.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
        const dia = fecha.toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit'});

        const tr = document.createElement('tr');
        // AQUI ESTA LA MAGIA: data-label
        tr.innerHTML = `
            <td data-label="Hora/Fecha"><strong>${hora}</strong> <small>(${dia})</small></td>
            <td data-label="Paciente">${t.nombre_paciente}</td>
            <td data-label="Estudio">${t.tipo_estudio}</td>
            <td data-label="Costo">$${t.costo}</td>
            <td data-label="Acciones">
                <button class="btn-icon edit" onclick="cargarTurnoParaEditar('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="eliminarRegistro('${t.id}', 'turnos')"><i class="fas fa-trash"></i></button>
            </td>
        `;

        if (t.sede === 'Consultorio Julio Arboleda') {
            turnosArboledaTbody.appendChild(tr);
        } else {
            turnosVelezTbody.appendChild(tr);
        }
    });
}

// --- RENDER HISTORICO ---
function renderHistorico(turnos) {
    historicoTbody.innerHTML = '';
    const historico = [...turnos].sort((a,b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

    historico.forEach(t => {
        const tr = document.createElement('tr');
        let sedeCorta = t.sede ? t.sede.replace('Consultorio ', '') : 'Vélez'; 
        
        tr.innerHTML = `
            <td data-label="Fecha">${new Date(t.fecha_hora).toLocaleDateString()}</td>
            <td data-label="Sede"><span class="badge gray">${sedeCorta}</span></td>
            <td data-label="Paciente">${t.nombre_paciente}</td>
            <td data-label="Estudio">${t.tipo_estudio}</td>
            <td data-label="Costo">$${t.costo}</td>
            <td data-label="Acciones">
                <button class="btn-icon edit" onclick="cargarTurnoParaEditar('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="eliminarRegistro('${t.id}', 'turnos')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        historicoTbody.appendChild(tr);
    });
}

// --- EDICIÓN ---
window.cargarTurnoParaEditar = function(id) {
    const turno = turnosCache.find(t => t.id == id);
    if(!turno) return;

    // Cambiar vista
    menuItems.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-target="view-agenda"]').classList.add('active');
    viewPanels.forEach(p => p.style.display = 'none');
    document.getElementById('view-agenda').style.display = 'block';

    // Llenar campos
    document.getElementById('edit-id').value = turno.id;
    document.getElementById('paciente').value = turno.nombre_paciente;
    document.getElementById('estudio').value = turno.tipo_estudio;
    document.getElementById('sede').value = turno.sede || 'Consultorio Vélez Sarsfield';
    document.getElementById('costo').value = turno.costo;
    
    // Fecha y Hora segura
    const fechaObj = new Date(turno.fecha_hora);
    const fechaStr = fechaObj.toISOString().split('T')[0];
    document.getElementById('fecha').value = fechaStr;
    
    const hh = String(fechaObj.getHours()).padStart(2, '0');
    const mm = String(fechaObj.getMinutes()).padStart(2, '0');
    const horaStr = `${hh}:${mm}`;
    
    let optionExists = false;
    for (let i = 0; i < horaSelect.options.length; i++) {
        if (horaSelect.options[i].value === horaStr) { optionExists = true; break; }
    }
    if (!optionExists) {
        const op = document.createElement('option');
        op.value = horaStr; op.innerText = horaStr + " (Orig)"; op.selected = true; 
        horaSelect.appendChild(op);
    }
    document.getElementById('hora').value = horaStr;

    // UI Edición
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Editando Turno';
    btnSaveTurno.textContent = 'Actualizar Datos';
    btnSaveTurno.classList.add('warning');
    btnCancelEdit.style.display = 'inline-block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir suave
};

function cancelarEdicion() {
    turnoForm.reset();
    document.getElementById('edit-id').value = '';
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Turno';
    btnSaveTurno.textContent = 'Agendar Turno';
    btnSaveTurno.classList.remove('warning');
    btnCancelEdit.style.display = 'none';
    popularHorarios();
}
btnCancelEdit.addEventListener('click', cancelarEdicion);

// --- GUARDAR ---
turnoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const paciente = document.getElementById('paciente').value;
    const estudio = document.getElementById('estudio').value;
    const sede = document.getElementById('sede').value;
    const costo = document.getElementById('costo').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const fecha_hora = `${fecha}T${hora}:00`;

    // Validación Colisión
    let query = supabase.from('turnos').select('id').eq('fecha_hora', fecha_hora);
    if (id) query = query.neq('id', id);
    const { data: dup } = await query;
    
    if (dup && dup.length > 0) {
        document.getElementById('error-turno').innerText = "¡Horario ocupado!";
        return;
    }

    let error = null;
    if (id) {
        const res = await supabase.from('turnos').update({
            nombre_paciente: paciente, tipo_estudio: estudio, sede: sede, costo: costo, fecha_hora: fecha_hora
        }).eq('id', id);
        error = res.error;
    } else {
        const res = await supabase.from('turnos').insert({
            nombre_paciente: paciente, tipo_estudio: estudio, sede: sede, costo: costo, fecha_hora: fecha_hora
        });
        error = res.error;
    }

    if(!error) {
        document.getElementById('success-turno').innerText = id ? "¡Actualizado!" : "¡Agendado!";
        cancelarEdicion();
        cargarDatosGenerales();
        setTimeout(()=> document.getElementById('success-turno').innerText = "", 2000);
    } else {
        document.getElementById('error-turno').innerText = "Error al guardar.";
    }
});

// --- ELIMINAR ---
window.eliminarRegistro = async (id, tabla) => {
    if(confirm("¿Borrar permanentemente?")) {
        await supabase.from(tabla).delete().eq('id', id);
        cargarDatosGenerales();
    }
};

// --- FINANZAS ---
function renderFinanzas(turnos, externos) {
    let statsPropio = {};
    turnos.forEach(t => {
        const d = new Date(t.fecha_hora);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`; 
        if(!statsPropio[key]) statsPropio[key] = {pacientes: 0, total: 0, mes: d.getMonth(), anio: d.getFullYear()};
        statsPropio[key].pacientes++;
        statsPropio[key].total += Number(t.costo);
    });

    statsTbody.innerHTML = '';
    Object.values(statsPropio).sort((a,b) => b.anio - a.anio || b.mes - a.mes).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Mes">${obtenerNombreMes(s.mes)} ${s.anio}</td>
            <td data-label="Pacientes">${s.pacientes}</td>
            <td data-label="Total"><strong>$${s.total.toLocaleString()}</strong></td>
        `;
        statsTbody.appendChild(tr);
    });

    let statsExterno = {};
    externos.forEach(e => {
        const [anio, mes, dia] = e.fecha.split('-');
        const key = `${anio}-${mes}-${e.sede}`;
        if(!statsExterno[key]) statsExterno[key] = {total: 0, mes: parseInt(mes)-1, anio: anio, sede: e.sede};
        statsExterno[key].total += Number(e.monto);
    });

    statsExternosTbody.innerHTML = '';
    Object.values(statsExterno).sort((a,b) => b.anio - a.anio || b.mes - a.mes).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Mes">${obtenerNombreMes(s.mes)} ${s.anio}</td>
            <td data-label="Sede"><span class="badge">${s.sede}</span></td>
            <td data-label="Total"><strong>$${s.total.toLocaleString()}</strong></td>
        `;
        statsExternosTbody.appendChild(tr);
    });
    
    listaUltimosExternos.innerHTML = '';
    externos.slice(0, 5).forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${e.sede} (${formatearFechaCorta(e.fecha)})</span>
            <span class="money">$${e.monto} <i class="fas fa-trash" style="cursor:pointer; color:#ccc; margin-left:5px;" onclick="eliminarRegistro('${e.id}', 'facturacion_externa')"></i></span>
        `;
        listaUltimosExternos.appendChild(li);
    });
}

// --- KPIs ---
function renderDashboardKPIs(turnos, externos) {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const turnosHoy = turnos.filter(t => {
        const d = new Date(t.fecha_hora);
        return d.getDate() === hoy.getDate() && d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });
    kpiTurnosHoy.innerText = turnosHoy.length;

    let totalMes = 0;
    turnos.forEach(t => {
        const d = new Date(t.fecha_hora);
        if(d.getMonth() === mesActual && d.getFullYear() === anioActual) totalMes += Number(t.costo);
    });
    externos.forEach(e => {
        const [anio, mes, dia] = e.fecha.split('-');
        if(parseInt(mes)-1 === mesActual && parseInt(anio) === anioActual) totalMes += Number(e.monto);
    });
    kpiIngresosMes.innerText = `$${totalMes.toLocaleString()}`;

    const ahora = new Date();
    const prox = turnos.filter(t => new Date(t.fecha_hora) > ahora).sort((a,b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))[0];
    
    if(prox) {
        kpiProxPaciente.innerText = prox.nombre_paciente;
        const d = new Date(prox.fecha_hora);
        let sedeCorta = prox.sede ? prox.sede.replace('Consultorio ', '') : 'Vélez';
        kpiProxHora.innerText = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${sedeCorta})`;
    } else {
        kpiProxPaciente.innerText = "No hay pendientes";
        kpiProxHora.innerText = "";
    }
}

// --- EVENTOS GLOBALES ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { errorLogin.innerText = "Credenciales incorrectas"; } else { initDashboard(); }
});
logoutBtn.addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });
facturacionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = document.getElementById('sede-externa').value;
    const f = document.getElementById('fecha-externa').value;
    const m = document.getElementById('monto-externa').value;
    const n = document.getElementById('notas-externa').value;
    const {error} = await supabase.from('facturacion_externa').insert({sede: s, fecha: f, monto: m, notas: n});
    if(!error) {
        document.getElementById('success-facturacion').innerText = "Registrado!";
        facturacionForm.reset();
        document.getElementById('fecha-externa').valueAsDate = new Date();
        cargarDatosGenerales();
        setTimeout(()=> document.getElementById('success-facturacion').innerText = "", 2000);
    }
});

// --- UTILS ---
function popularHorarios() {
    horaSelect.innerHTML = '';
    for (let h = 8; h < 21; h++) {
        for (let m = 0; m < 60; m += 15) {
            const time = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            const op = document.createElement('option');
            op.value = time; op.innerText = time;
            horaSelect.appendChild(op);
        }
    }
}
function obtenerNombreMes(numMes) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return meses[numMes];
}
function formatearFechaCorta(fechaStr) {
    const [y,m,d] = fechaStr.split('-');
    return `${d}/${m}`;
}

