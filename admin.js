// --- 1. Configuración de Supabase ---
// ¡Reemplaza esto con tus propias claves de Supabase!
const SUPABASE_URL = 'https://xyckhqxcipgdvkdmjifg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a elementos del DOM ---
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

// Pestañas
const tabTurnos = document.getElementById('tab-turnos');
const tabHistorico = document.getElementById('tab-historico');
const tabEstadisticas = document.getElementById('tab-estadisticas'); // Nuevo
const panelTurnos = document.getElementById('panel-turnos');
const panelHistorico = document.getElementById('panel-historico');
const panelEstadisticas = document.getElementById('panel-estadisticas'); // Nuevo

// Formulario y Tablas
const turnoForm = document.getElementById('turno-form');
const successTurno = document.getElementById('success-turno');
const errorTurno = document.getElementById('error-turno');
const horaSelect = document.getElementById('hora');
const turnosTbody = document.getElementById('turnos-tbody');
const historicoTbody = document.getElementById('historico-tbody');

// Elementos de Estadísticas (Nuevos)
const statTotalDinero = document.getElementById('stat-total-dinero');
const statTotalPacientes = document.getElementById('stat-total-pacientes');
const statTopEstudio = document.getElementById('stat-top-estudio');
const statsTbody = document.getElementById('stats-tbody');

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
    cargarTurnos(); // Carga por defecto la agenda
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
    panelHistorico.style.display = 'none';
    panelEstadisticas.style.display = 'none';
    tabTurnos.classList.remove('active');
    tabHistorico.classList.remove('active');
    tabEstadisticas.classList.remove('active');
}

tabTurnos.addEventListener('click', () => {
    ocultarPaneles();
    panelTurnos.style.display = 'flex';
    tabTurnos.classList.add('active');
    cargarTurnos();
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
    cargarEstadisticas(); // Nueva función
});


// --- 5. Lógica de Datos (CRUD y Stats) ---

async function cargarTurnos() {
    turnosTbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
    
    // Filtro corregido: desde las 00:00 de hoy
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
            <td><button class="btn-eliminar" data-id="${turno.id}">Eliminar</button></td>
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
            <td><button class="btn-eliminar-historico" data-id="${turno.id}">Eliminar</button></td>
        `;
        historicoTbody.appendChild(tr);
    });
}

// --- NUEVA FUNCIÓN: ESTADÍSTICAS ---
async function cargarEstadisticas() {
    // Ponemos cargando...
    statTotalDinero.textContent = '...';
    statsTbody.innerHTML = '<tr><td colspan="4">Calculando estadísticas...</td></tr>';

    // 1. Traemos TODOS los turnos (históricos y actuales)
    const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    // --- VARIABLES PARA CÁLCULOS ---
    let totalGeneral = 0;
    let conteoEstudios = {};
    let desgloseMensual = {}; // Clave será "2025-10", Valor será el total

    turnos.forEach(turno => {
        // A. Sumar al total general
        const monto = Number(turno.costo) || 0;
        totalGeneral += monto;

        // B. Contar estudios para el ranking
        const estudio = turno.tipo_estudio || 'Desconocido';
        conteoEstudios[estudio] = (conteoEstudios[estudio] || 0) + 1;

        // C. Agrupar por Mes y Año
        const fecha = new Date(turno.fecha_hora);
        const año = fecha.getFullYear();
        const mes = fecha.getMonth() + 1; // getMonth es 0-11
        const claveFecha = `${año}-${mes.toString().padStart(2, '0')}`; // "2025-10"

        if (!desgloseMensual[claveFecha]) {
            desgloseMensual[claveFecha] = {
                dinero: 0,
                pacientes: 0,
                año: año,
                mes: mes
            };
        }
        desgloseMensual[claveFecha].dinero += monto;
        desgloseMensual[claveFecha].pacientes += 1;
    });

    // --- RENDERIZAR TARJETAS (KPIs) ---
    
    // 1. Total Dinero
    statTotalDinero.textContent = formatearCosto(totalGeneral);
    
    // 2. Total Pacientes
    statTotalPacientes.textContent = turnos.length;

    // 3. Estudio Top
    let estudioTopNombre = "N/A";
    let estudioTopCant = 0;
    for (const [nombre, cantidad] of Object.entries(conteoEstudios)) {
        if (cantidad > estudioTopCant) {
            estudioTopCant = cantidad;
            estudioTopNombre = nombre;
        }
    }
    statTopEstudio.textContent = estudioTopNombre;

    // --- RENDERIZAR TABLA MENSUAL ---
    
    // Convertimos el objeto desglose a un array y lo ordenamos (más reciente primero)
    const arrayMensual = Object.values(desgloseMensual).sort((a, b) => {
        if (a.año !== b.año) return b.año - a.año; // Ordenar por año desc
        return b.mes - a.mes; // Ordenar por mes desc
    });

    statsTbody.innerHTML = '';
    
    // Helper para nombre de mes
    const nombreMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (arrayMensual.length === 0) {
        statsTbody.innerHTML = '<tr><td colspan="4">No hay datos suficientes.</td></tr>';
    } else {
        arrayMensual.forEach(dato => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dato.año}</td>
                <td>${nombreMeses[dato.mes - 1]}</td>
                <td>${dato.pacientes}</td>
                <td><strong>${formatearCosto(dato.dinero)}</strong></td>
            `;
            statsTbody.appendChild(tr);
        });
    }
}

// --- Manejo de Formularios y Botones (Turnos) ---

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

    // Insertar
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

// Delegación de eventos para botones eliminar (Agenda y Histórico)
const manejarEliminacion = async (e, callbackRecarga) => {
    if (e.target.tagName === 'BUTTON' && e.target.textContent === 'Eliminar') {
        const id = e.target.dataset.id;
        if (confirm('¿Eliminar este turno permanentemente?')) {
            const { error } = await supabase.from('turnos').delete().match({ id: id });
            if (!error) callbackRecarga();
        }
    }
};

turnosTbody.addEventListener('click', (e) => manejarEliminacion(e, cargarTurnos));
historicoTbody.addEventListener('click', (e) => manejarEliminacion(e, cargarHistorico));
