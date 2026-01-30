// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://xyckhqxcipgdvkdmjifg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';

const { createClient } = window.supabase;
supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a elementos del DOM ---
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

// Pestañas
const tabTurnos = document.getElementById('tab-turnos');
const tabFacturacion = document.getElementById('tab-facturacion'); // NUEVO
const tabHistorico = document.getElementById('tab-historico');
const tabEstadisticas = document.getElementById('tab-estadisticas');

const panelTurnos = document.getElementById('panel-turnos');
const panelFacturacion = document.getElementById('panel-facturacion'); // NUEVO
const panelHistorico = document.getElementById('panel-historico');
const panelEstadisticas = document.getElementById('panel-estadisticas');

// Formulario y Tablas (Turnos)
const turnoForm = document.getElementById('turno-form');
const successTurno = document.getElementById('success-turno');
const errorTurno = document.getElementById('error-turno');
const horaSelect = document.getElementById('hora');
const turnosTbody = document.getElementById('turnos-tbody');
const historicoTbody = document.getElementById('historico-tbody');

// Formulario y Tablas (Facturación Externa - NUEVO)
const facturacionForm = document.getElementById('facturacion-form');
const successFacturacion = document.getElementById('success-facturacion');
const errorFacturacion = document.getElementById('error-facturacion');
const facturacionTbody = document.getElementById('facturacion-tbody');

// Estadísticas
const statTotalDinero = document.getElementById('stat-total-dinero');
const statTotalPacientes = document.getElementById('stat-total-pacientes');
const statTopEstudio = document.getElementById('stat-top-estudio');
const statsTbody = document.getElementById('stats-tbody');
const statsExternosTbody = document.getElementById('stats-externos-tbody'); // NUEVO

// --- 3. Funciones de Ayuda ---

function popularHorarios() {
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const horaStr = h.toString().padStart(2, '0');
            const minStr = m.toString().padStart(2, '0');
            const time = `${horaStr}:${minStr}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            horaSelect.appendChild(option);
        }
    }
}

function formatearFechaHora(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Argentina/Buenos_Aires'
    });
}

function formatearFechaSola(fechaISO) { // NUEVA: Para facturación externa que no tiene hora
    if (!fechaISO) return '-';
    // Truco para evitar problemas de zona horaria con fechas solas (YYYY-MM-DD)
    const [year, month, day] = fechaISO.split('-');
    return `${day}/${month}/${year}`;
}

function formatearCosto(costo) {
    if (costo === null || costo === undefined) return '$ 0';
    return Number(costo).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });
}

// --- 4. Lógica de Autenticación y Navegación ---

document.addEventListener('DOMContentLoaded', async () => {
    popularHorarios();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        mostrarPanelAdmin();
    } else {
        loginSection.style.display = 'block';
    }
});

function mostrarPanelAdmin() {
    loginSection.style.display = 'none';
    adminDashboard.style.display = 'block';
    cargarTurnos(); 
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        errorLogin.textContent = 'Error: Email o contraseña incorrectos.';
        errorLogin.style.display = 'block';
    } else {
        errorLogin.style.display = 'none';
        mostrarPanelAdmin();
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

// --- Lógica de Pestañas ---
function ocultarPaneles() {
    panelTurnos.style.display = 'none';
    panelFacturacion.style.display = 'none';
    panelHistorico.style.display = 'none';
    panelEstadisticas.style.display = 'none';
    
    tabTurnos.classList.remove('active');
    tabFacturacion.classList.remove('active');
    tabHistorico.classList.remove('active');
    tabEstadisticas.classList.remove('active');
}

tabTurnos.addEventListener('click', () => {
    ocultarPaneles();
    panelTurnos.style.display = 'flex';
    tabTurnos.classList.add('active');
    cargarTurnos();
});

tabFacturacion.addEventListener('click', () => { // NUEVO
    ocultarPaneles();
    panelFacturacion.style.display = 'flex';
    tabFacturacion.classList.add('active');
    cargarFacturacionExterna();
});

tabHistorico.addEventListener('click', () => {
    ocultarPaneles();
    panelHistorico.style.display = 'block';
    tabHistorico.classList.add('active');
    cargarHistorico();
});

tabEstadisticas.addEventListener('click', () => {
    ocultarPaneles();
    panelEstadisticas.style.display = 'block';
    tabEstadisticas.classList.add('active');
    cargarEstadisticas();
});

// --- 5. Lógica de Datos (CRUD Turnos) ---

async function cargarTurnos() {
    turnosTbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .gte('fecha_hora', hoy.toISOString())
        .order('fecha_hora', { ascending: true }); 

    if (error || !turnos.length) {
        turnosTbody.innerHTML = `<tr><td colspan="5">${error ? 'Error' : 'No hay próximos turnos.'}</td></tr>`;
        return;
    }

    turnosTbody.innerHTML = '';
    turnos.forEach(turno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${turno.nombre_paciente}</td>
            <td>${turno.tipo_estudio}</td>
            <td>${formatearFechaHora(turno.fecha_hora)}</td>
            <td>${formatearCosto(turno.costo)}</td>
            <td><button class="btn-eliminar" data-id="${turno.id}" data-type="turno">Eliminar</button></td>
        `;
        turnosTbody.appendChild(tr);
    });
}

async function cargarHistorico() {
    historicoTbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
    const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .order('fecha_hora', { ascending: false });

    if (error || !turnos.length) {
        historicoTbody.innerHTML = `<tr><td colspan="5">${error ? 'Error' : 'Histórico vacío.'}</td></tr>`;
        return;
    }

    historicoTbody.innerHTML = '';
    turnos.forEach(turno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${turno.nombre_paciente}</td>
            <td>${turno.tipo_estudio}</td>
            <td>${formatearFechaHora(turno.fecha_hora)}</td>
            <td>${formatearCosto(turno.costo)}</td>
            <td><button class="btn-eliminar" data-id="${turno.id}" data-type="turno">Eliminar</button></td>
        `;
        historicoTbody.appendChild(tr);
    });
}

// --- 6. Lógica de Datos (Facturación Externa - NUEVO) ---

async function cargarFacturacionExterna() {
    facturacionTbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
    
    const { data: pagos, error } = await supabase
        .from('facturacion_externa')
        .select('*')
        .order('fecha', { ascending: false }); // Más recientes primero

    if (error) {
        facturacionTbody.innerHTML = `<tr><td colspan="5">Error cargando datos.</td></tr>`;
        return;
    }
    if (!pagos.length) {
        facturacionTbody.innerHTML = `<tr><td colspan="5">No hay registros externos aún.</td></tr>`;
        return;
    }

    facturacionTbody.innerHTML = '';
    pagos.forEach(pago => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pago.sede}</td>
            <td>${formatearFechaSola(pago.fecha)}</td>
            <td>${formatearCosto(pago.monto)}</td>
            <td>${pago.notas || '-'}</td>
            <td><button class="btn-eliminar" data-id="${pago.id}" data-type="externo">Eliminar</button></td>
        `;
        facturacionTbody.appendChild(tr);
    });
}

facturacionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorFacturacion.style.display = 'none';
    successFacturacion.style.display = 'none';

    const sede = document.getElementById('sede-externa').value;
    const fecha = document.getElementById('fecha-externa').value;
    const monto = document.getElementById('monto-externa').value;
    const notas = document.getElementById('notas-externa').value;

    const { error } = await supabase
        .from('facturacion_externa')
        .insert({ sede, fecha, monto, notas });

    if (error) {
        errorFacturacion.textContent = 'Error al guardar.';
        errorFacturacion.style.display = 'block';
    } else {
        successFacturacion.textContent = '¡Ingreso registrado!';
        successFacturacion.style.display = 'block';
        facturacionForm.reset();
        // Ponemos la fecha de hoy por defecto para agilizar
        document.getElementById('fecha-externa').valueAsDate = new Date();
        cargarFacturacionExterna();
        setTimeout(() => { successFacturacion.style.display = 'none'; }, 3000);
    }
});


// --- 7. ESTADÍSTICAS (Actualizado para incluir externos) ---

async function cargarEstadisticas() {
    statTotalDinero.textContent = '...';
    statsTbody.innerHTML = '<tr><td colspan="4">Calculando...</td></tr>';
    statsExternosTbody.innerHTML = '<tr><td colspan="4">Calculando...</td></tr>';

    // 1. Traer datos del Consultorio (Turnos)
    const { data: turnos } = await supabase.from('turnos').select('*');
    
    // 2. Traer datos Externos
    const { data: externos } = await supabase.from('facturacion_externa').select('*');

    // --- A. Procesar Consultorio ---
    let totalGeneral = 0;
    let conteoEstudios = {};
    let desgloseMensual = {}; 

    if (turnos) {
        turnos.forEach(turno => {
            const monto = Number(turno.costo) || 0;
            totalGeneral += monto;

            const estudio = turno.tipo_estudio || 'Desconocido';
            conteoEstudios[estudio] = (conteoEstudios[estudio] || 0) + 1;

            const fecha = new Date(turno.fecha_hora);
            const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`; // "2025-01"
            
            if (!desgloseMensual[key]) {
                desgloseMensual[key] = { dinero: 0, pacientes: 0, year: fecha.getFullYear(), month: fecha.getMonth() };
            }
            desgloseMensual[key].dinero += monto;
            desgloseMensual[key].pacientes += 1;
        });
    }

    // --- B. Procesar Externos ---
    let desgloseExterno = {}; // Clave: "2025-01-Ospia"
    
    if (externos) {
        externos.forEach(pago => {
            const monto = Number(pago.monto) || 0;
            // Fecha viene como "YYYY-MM-DD"
            const [year, month] = pago.fecha.split('-'); // "2025", "01"
            const key = `${year}-${month}-${pago.sede}`; // "2025-01-Ospia"

            if (!desgloseExterno[key]) {
                desgloseExterno[key] = { monto: 0, year: parseInt(year), month: parseInt(month) - 1, sede: pago.sede };
            }
            desgloseExterno[key].monto += monto;
        });
    }

    // --- C. Renderizar Consultorio ---
    statTotalDinero.textContent = formatearCosto(totalGeneral);
    statTotalPacientes.textContent = turnos ? turnos.length : 0;
    
    // Estudio Top
    let topEstudio = "N/A";
    let max = 0;
    for (const [est, cant] of Object.entries(conteoEstudios)) {
        if (cant > max) { max = cant; topEstudio = est; }
    }
    statTopEstudio.textContent = topEstudio;

    // Tabla Mensual Consultorio
    const arrayMensual = Object.values(desgloseMensual).sort((a, b) => (b.year - a.year) || (b.month - a.month));
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    statsTbody.innerHTML = '';
    arrayMensual.forEach(d => {
        statsTbody.innerHTML += `
            <tr>
                <td>${d.year}</td>
                <td>${nombresMeses[d.month]}</td>
                <td>${d.pacientes}</td>
                <td><strong>${formatearCosto(d.dinero)}</strong></td>
            </tr>`;
    });

    // --- D. Renderizar Tabla Externos ---
    const arrayExterno = Object.values(desgloseExterno).sort((a, b) => (b.year - a.year) || (b.month - a.month));
    
    statsExternosTbody.innerHTML = '';
    if (arrayExterno.length === 0) {
        statsExternosTbody.innerHTML = '<tr><td colspan="4">Sin datos externos.</td></tr>';
    } else {
        arrayExterno.forEach(d => {
            statsExternosTbody.innerHTML += `
                <tr>
                    <td>${d.year}</td>
                    <td>${nombresMeses[d.month]}</td>
                    <td>${d.sede}</td>
                    <td><strong>${formatearCosto(d.monto)}</strong></td>
                </tr>`;
        });
    }
}

// --- 8. Manejo de Turnos (Agregar) ---
turnoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorTurno.style.display = 'none';
    successTurno.style.display = 'none';
    
    const paciente = document.getElementById('paciente').value;
    const estudio = document.getElementById('estudio').value;
    const costo = document.getElementById('costo').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const fecha_hora = `${fecha}T${hora}:00`;

    // Validar colisión
    const { data: existente } = await supabase
        .from('turnos')
        .select('id')
        .eq('fecha_hora', fecha_hora)
        .limit(1);

    if (existente && existente.length > 0) {
        errorTurno.textContent = '¡Ya existe un turno en esa fecha y hora!';
        errorTurno.style.display = 'block';
        return;
    }

    const { error } = await supabase
        .from('turnos')
        .insert({ nombre_paciente: paciente, tipo_estudio: estudio, fecha_hora: fecha_hora, costo: costo });

    if (error) {
        errorTurno.textContent = 'Error al guardar.';
        errorTurno.style.display = 'block';
    } else {
        successTurno.textContent = 'Turno agendado!';
        successTurno.style.display = 'block';
        turnoForm.reset();
        cargarTurnos();
        setTimeout(() => { successTurno.style.display = 'none'; }, 3000);
    }
});

// --- 9. Eliminación Unificada (Delegación) ---
document.body.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const id = e.target.dataset.id;
        const type = e.target.dataset.type; // 'turno' o 'externo'
        const tabla = type === 'externo' ? 'facturacion_externa' : 'turnos';

        if (confirm('¿Eliminar este registro permanentemente?')) {
            const { error } = await supabase.from(tabla).delete().eq('id', id);
            
            if (!error) {
                if (type === 'externo') cargarFacturacionExterna();
                else {
                    // Si estamos en la pestaña Agenda, recargar Agenda, si no Historico
                    if (tabTurnos.classList.contains('active')) cargarTurnos();
                    else cargarHistorico();
                }
            } else {
                alert("Error al eliminar");
            }
        }
    }
});
