// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://xyckhqxcipgdvkdmjifg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';

const { createClient } = window.supabase;
supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// --- DOM ELEMENTS ---
// Login
const loginSection = document.getElementById('login-section');
const dashboardContainer = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

// Navegación (Sidebar)
const menuItems = document.querySelectorAll('.menu-item');
const viewPanels = document.querySelectorAll('.view-panel');

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

// KPIs Dashboard
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

// --- NAVEGACIÓN ---
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(btn => btn.classList.remove('active'));
        item.classList.add('active');
        
        viewPanels.forEach(panel => panel.style.display = 'none');
        const targetId = item.dataset.target;
        document.getElementById(targetId).style.display = 'block';

        // Al cambiar de pestaña, limpiamos cualquier edición pendiente
        cancelarEdicion();
        cargarDatosGenerales();
    });
});

// --- LÓGICA DE DATOS Y CACHÉ ---
let turnosCache = [];

async function cargarDatosGenerales() {
    // 1. Traer Turnos (Agenda + Histórico)
    const { data: turnos } = await supabase
        .from('turnos')
        .select('*')
        .order('fecha_hora', { ascending: true });
    
    turnosCache = turnos || [];

    // 2. Traer Externos
    const { data: externos } = await supabase
        .from('facturacion_externa')
        .select('*')
        .order('fecha', { ascending: false });

    if(turnos && externos) {
        renderAgenda(turnos);
        renderHistorico(turnos);
        renderFinanzas(turnos, externos);
        renderDashboardKPIs(turnos, externos);
    }
}

// --- RENDERIZADO: AGENDA (DIVIDIDA) ---
function renderAgenda(turnos) {
    turnosVelezTbody.innerHTML = '';
    turnosArboledaTbody.innerHTML = '';
    
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    // Filtrar solo futuros o de hoy
    const futuros = turnos.filter(t => new Date(t.fecha_hora) >= hoy);

    if (futuros.length === 0) {
        turnosVelezTbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay turnos próximos.</td></tr>';
        turnosArboledaTbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay turnos próximos.</td></tr>';
        return;
    }

    futuros.forEach(t => {
        const fecha = new Date(t.fecha_hora);
        const hora = fecha.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
        const dia = fecha.toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit'});

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${hora}</strong> <small>(${dia})</small></td>
            <td>${t.nombre_paciente}</td>
            <td>${t.tipo_estudio}</td>
            <td>$${t.costo}</td>
            <td>
                <button class="btn-icon edit" onclick="cargarTurnoParaEditar('${t.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="eliminarRegistro('${t.id}', 'turnos')" title="Borrar"><i class="fas fa-trash"></i></button>
            </td>
        `;

        // Clasificar por Sede
        if (t.sede === 'Consultorio Julio Arboleda') {
            turnosArboledaTbody.appendChild(tr);
        } else {
            turnosVelezTbody.appendChild(tr);
        }
    });
}

// --- RENDERIZADO: HISTÓRICO ---
function renderHistorico(turnos) {
    historicoTbody.innerHTML = '';
    // Copiar y ordenar descendente (más recientes primero)
    const historico = [...turnos].sort((a,b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

    historico.forEach(t => {
        const tr = document.createElement('tr');
        let sedeCorta = t.sede ? t.sede.replace('Consultorio ', '') : 'Vélez (Def)'; 
        
        tr.innerHTML = `
            <td>${new Date(t.fecha_hora).toLocaleDateString()}</td>
            <td><span class="badge gray">${sedeCorta}</span></td>
            <td>${t.nombre_paciente}</td>
            <td>${t.tipo_estudio}</td>
            <td>$${t.costo}</td>
            <td>
                <button class="btn-icon edit" onclick="cargarTurnoParaEditar('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete" onclick="eliminarRegistro('${t.id}', 'turnos')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        historicoTbody.appendChild(tr);
    });
}

// --- LOGICA DE EDICIÓN (SOLUCIÓN A HISTÓRICOS) ---
window.cargarTurnoParaEditar = function(id) {
    const turno = turnosCache.find(t => t.id == id);
    if(!turno) return;

    // 1. Forzar vista de Agenda
    menuItems.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-target="view-agenda"]').classList.add('active');
    viewPanels.forEach(p => p.style.display = 'none');
    document.getElementById('view-agenda').style.display = 'block';

    // 2. Llenar campos básicos
    document.getElementById('edit-id').value = turno.id;
    document.getElementById('paciente').value = turno.nombre_paciente;
    document.getElementById('estudio').value = turno.tipo_estudio;
    document.getElementById('sede').value = turno.sede || 'Consultorio Vélez Sarsfield';
    document.getElementById('costo').value = turno.costo;
    
    // 3. MANEJO SEGURO DE FECHA Y HORA (CORREGIDO)
    const fechaObj = new Date(turno.fecha_hora);
    
    // Fecha segura YYYY-MM-DD
    const fechaStr = fechaObj.toISOString().split('T')[0];
    document.getElementById('fecha').value = fechaStr;
    
    // Hora segura HH:MM (Sin depender del navegador)
    const hh = String(fechaObj.getHours()).padStart(2, '0');
    const mm = String(fechaObj.getMinutes()).padStart(2, '0');
    const horaStr = `${hh}:${mm}`;
    
    // Verificamos si la hora existe en el select; si no, la creamos temporalmente
    let optionExists = false;
    for (let i = 0; i < horaSelect.options.length; i++) {
        if (horaSelect.options[i].value === horaStr) {
            optionExists = true;
            break;
        }
    }
    
    if (!optionExists) {
        const op = document.createElement('option');
        op.value = horaStr;
        op.innerText = horaStr + " (Original)";
        op.selected = true; 
        horaSelect.appendChild(op);
    }
    document.getElementById('hora').value = horaStr;

    // 4. Cambiar interfaz a modo "Edición"
    formTitle.innerHTML = '<i class="fas fa-edit"></i> Editando Turno';
    btnSaveTurno.textContent = 'Actualizar Datos';
    btnSaveTurno.classList.add('warning');
    btnCancelEdit.style.display = 'inline-block';

    document.querySelector('.main-content').scrollTop = 0;
};

function cancelarEdicion() {
    turnoForm.reset();
    document.getElementById('edit-id').value = '';
    formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Turno';
    btnSaveTurno.textContent = 'Agendar Turno';
    btnSaveTurno.classList.remove('warning');
    btnCancelEdit.style.display = 'none';
    
    // Limpiar horas temporales restaurando las originales
    popularHorarios();
}

btnCancelEdit.addEventListener('click', cancelarEdicion);

// --- GUARDAR TURNO (NUEVO O ACTUALIZACIÓN) ---
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

    // VALIDACIÓN DE COLISIÓN BLINDADA
    let hayColision = false;

    // Solo verificamos colisión si es NUEVO o si es EDITAR pero excluyendo el actual
    let query = supabase.from('turnos').select('id').eq('fecha_hora', fecha_hora);
    
    if (id) {
        query = query.neq('id', id); // Si edito, excluyo mi propio ID
    }

    const { data: dup, error: errorDup } = await query; //

    // Si hubo error en la consulta (ej: formato fecha), lo vemos en consola pero no rompemos todo
    if (errorDup) {
        console.error("Error validando horario:", errorDup);
        // Opcional: alertar al usuario o dejar pasar (depende de qué tan estricto quieras ser)
    }

    // Verificación segura: Si 'dup' existe y tiene elementos, hay colisión
    if (dup && dup.length > 0) {
        document.getElementById('error-turno').innerText = "¡Horario ya ocupado por otro paciente!";
        return;
    }

    let error = null;

    if (id) {
        // ACTUALIZAR (UPDATE)
        const res = await supabase.from('turnos').update({
            nombre_paciente: paciente, 
            tipo_estudio: estudio, 
            sede: sede,
            costo: costo, 
            fecha_hora: fecha_hora
        }).eq('id', id);
        error = res.error;
    } else {
        // CREAR (INSERT)
        const res = await supabase.from('turnos').insert({
            nombre_paciente: paciente, 
            tipo_estudio: estudio, 
            sede: sede,
            costo: costo, 
            fecha_hora: fecha_hora
        });
        error = res.error;
    }

    if(!error) {
        document.getElementById('success-turno').innerText = id ? "¡Datos actualizados!" : "¡Turno agendado!";
        cancelarEdicion(); 
        cargarDatosGenerales(); 
        setTimeout(()=> document.getElementById('success-turno').innerText = "", 2000);
    } else {
        document.getElementById('error-turno').innerText = "Error al guardar: " + error.message;
        console.error(error);
    }
});


// --- ELIMINAR ---
window.eliminarRegistro = async (id, tabla) => {
    if(confirm("¿Estás segura de borrar esto permanentemente?")) {
        await supabase.from(tabla).delete().eq('id', id);
        cargarDatosGenerales();
    }
};

// --- RENDERIZADO DE FINANZAS ---
function renderFinanzas(turnos, externos) {
    // Stats Propio (Agrupado por Mes)
    let statsPropio = {};
    turnos.forEach(t => {
        const d = new Date(t.fecha_hora);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`; 
        if(!statsPropio[key]) statsPropio[key] = {pacientes: 0, total: 0, mes: d.getMonth(), anio: d.getFullYear()};
        statsPropio[key].pacientes++;
        statsPropio[key].total += Number(t.costo);
    });

    statsTbody.innerHTML = '';
    Object.values(statsPropio)
        .sort((a,b) => b.anio - a.anio || b.mes - a.mes)
        .forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${obtenerNombreMes(s.mes)} ${s.anio}</td>
                <td>${s.pacientes}</td>
                <td><strong>$${s.total.toLocaleString()}</strong></td>
            `;
            statsTbody.appendChild(tr);
        });

    // Stats Externo (Agrupado por Mes y Sede)
    let statsExterno = {};
    externos.forEach(e => {
        const [anio, mes, dia] = e.fecha.split('-');
        const key = `${anio}-${mes}-${e.sede}`;
        if(!statsExterno[key]) statsExterno[key] = {total: 0, mes: parseInt(mes)-1, anio: anio, sede: e.sede};
        statsExterno[key].total += Number(e.monto);
    });

    statsExternosTbody.innerHTML = '';
    Object.values(statsExterno)
        .sort((a,b) => b.anio - a.anio || b.mes - a.mes)
        .forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${obtenerNombreMes(s.mes)} ${s.anio}</td>
                <td><span class=\"badge\">${s.sede}</span></td>
                <td><strong>$${s.total.toLocaleString()}</strong></td>
            `;
            statsExternosTbody.appendChild(tr);
        });
        
    // Mini lista últimos cargados
    listaUltimosExternos.innerHTML = '';
    externos.slice(0, 5).forEach(e => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${e.sede} (${formatearFechaCorta(e.fecha)})</span>
            <span class=\"money\">$${e.monto} <i class=\"fas fa-trash\" style=\"cursor:pointer; color:#ccc; margin-left:5px;\" onclick=\"eliminarRegistro('${e.id}', 'facturacion_externa')\"></i></span>
        `;
        listaUltimosExternos.appendChild(li);
    });
}

// --- RENDERIZADO KPIs (DASHBOARD) ---
function renderDashboardKPIs(turnos, externos) {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    // KPI 1: Turnos Hoy
    const turnosHoy = turnos.filter(t => {
        const d = new Date(t.fecha_hora);
        return d.getDate() === hoy.getDate() && d.getMonth() === mesActual && d.getFullYear() === anioActual;
    });
    kpiTurnosHoy.innerText = turnosHoy.length;

    // KPI 2: Ingresos Mes (Propio + Externo)
    let totalMes = 0;
    
    // Sumar Propio
    turnos.forEach(t => {
        const d = new Date(t.fecha_hora);
        if(d.getMonth() === mesActual && d.getFullYear() === anioActual) totalMes += Number(t.costo);
    });
    // Sumar Externo
    externos.forEach(e => {
        const [anio, mes, dia] = e.fecha.split('-');
        if(parseInt(mes)-1 === mesActual && parseInt(anio) === anioActual) totalMes += Number(e.monto);
    });

    kpiIngresosMes.innerText = `$${totalMes.toLocaleString()}`;

    // KPI 3: Próximo Paciente
    const ahora = new Date();
    // Filtramos solo futuros y ordenamos por fecha más cercana
    const prox = turnos.filter(t => new Date(t.fecha_hora) > ahora).sort((a,b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))[0];
    
    if(prox) {
        kpiProxPaciente.innerText = prox.nombre_paciente;
        const d = new Date(prox.fecha_hora);
        // Mostrar sede corta en el KPI
        let sedeCorta = prox.sede ? prox.sede.replace('Consultorio ', '') : 'Vélez';
        kpiProxHora.innerText = `${d.toLocaleDateString()} - ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${sedeCorta})`;
    } else {
        kpiProxPaciente.innerText = "No hay pendientes";
        kpiProxHora.innerText = "";
    }
}

// --- MANEJADORES DE EVENTOS GLOBALES ---

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { errorLogin.innerText = "Credenciales incorrectas"; } else { initDashboard(); }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

// Guardar Pago Externo
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
        document.getElementById('fecha-externa').valueAsDate = new Date(); // Reset a hoy
        cargarDatosGenerales();
        setTimeout(()=> document.getElementById('success-facturacion').innerText = "", 2000);
    }
});

// --- UTILIDADES ---
function popularHorarios() {
    horaSelect.innerHTML = ''; // Limpiar opciones previas
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


