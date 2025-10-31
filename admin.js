// --- 1. Configuración de Supabase ---
// ¡Reemplaza esto con tus propias claves de Supabase!
const SUPABASE_URL = 'https://xyckhqxcipgdvkdmjifg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';

// Corrección de inicialización
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a elementos del DOM ---
// Login
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

// Pestañas (NUEVO)
const tabTurnos = document.getElementById('tab-turnos');
const tabHistorico = document.getElementById('tab-historico');
const panelTurnos = document.getElementById('panel-turnos');
const panelHistorico = document.getElementById('panel-historico');

// Formulario de Turnos
const turnoForm = document.getElementById('turno-form');
const successTurno = document.getElementById('success-turno');
const errorTurno = document.getElementById('error-turno'); // Nuevo
const horaSelect = document.getElementById('hora'); // Nuevo

// Tablas
const turnosTbody = document.getElementById('turnos-tbody');
const historicoTbody = document.getElementById('historico-tbody'); // Nuevo

// --- 3. Funciones de Ayuda (NUEVO) ---

/**
 * Genera la lista de horarios cada 15 minutos (00:00 a 23:45)
 */
function popularHorarios() {
    for (let h = 14; h < 19; h++) {
        for (let m = 0; m < 60; m += 15) {
            // Formatea la hora y los minutos para que tengan 2 dígitos
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

/**
 * Formatea la fecha y hora a un formato legible
 */
function formatearFechaHora(fechaISO) {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Argentina/Buenos_Aires' // Ajusta tu zona horaria
    });
}

/**
 * Formatea el costo a un formato de moneda
 */
function formatearCosto(costo) {
    if (costo === null || costo === undefined) {
        return 'N/A';
    }
    return costo.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });
}

// --- 4. Lógica de Autenticación y Pestañas ---

// Al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    popularHorarios(); // Genera la lista de horarios

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Si hay sesión, mostrar el panel de admin y cargar turnos
        loginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        cargarTurnos(); // Carga los próximos turnos por defecto
    } else {
        // Si no, mostrar el login
        loginSection.style.display = 'block';
        adminDashboard.style.display = 'none';
    }
});

// Manejar el envío del formulario de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorLogin.textContent = 'Error: Email o contraseña incorrectos.';
        errorLogin.style.display = 'block';
    } else {
        // Si el login es exitoso
        loginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        errorLogin.style.display = 'none';
        cargarTurnos(); // Carga los próximos turnos
    }
});

// Manejar el clic en "Cerrar Sesión"
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload(); // Recargar la página para volver al login
});

// Manejar Pestañas (NUEVO)
tabTurnos.addEventListener('click', () => {
    panelTurnos.style.display = 'flex'; // 'flex' por las columnas
    panelHistorico.style.display = 'none';
    tabTurnos.classList.add('active');
    tabHistorico.classList.remove('active');
});

tabHistorico.addEventListener('click', () => {
    panelTurnos.style.display = 'none';
    panelHistorico.style.display = 'block';
    tabTurnos.classList.remove('active');
    tabHistorico.classList.add('active');
    cargarHistorico(); // Carga el histórico al hacer clic
});


// --- 5. Lógica de la Agenda (CRUD) ---

/**
 * Carga SÓLO los próximos turnos (CORREGIDO)
 */
async function cargarTurnos() {
    turnosTbody.innerHTML = `<tr><td colspan("5">Cargando...</td></tr>`;

    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
    // 1. Creamos un objeto de fecha para "hoy"
    const hoy = new Date();
    // 2. Lo configuramos a las 00:00:00 de la mañana
    hoy.setHours(0, 0, 0, 0);
    // 3. Convertimos esa fecha de inicio del día a un string ISO
    const filtroFechaISO = hoy.toISOString();
    // --- FIN DE LA CORRECCIÓN ---

    const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .gte('fecha_hora', filtroFechaISO) // <-- USAMOS LA NUEVA VARIABLE
        .order('fecha_hora', { ascending: true }); 

    if (error) {
        console.error('Error cargando turnos:', error);
        turnosTbody.innerHTML = `<tr><td colspan="5">Error al cargar turnos.</td></tr>`;
        return;
    }

    if (turnos.length === 0) {
        turnosTbody.innerHTML = `<tr><td colspan="5">No hay próximos turnos agendados.</td></tr>`;
        return;
    }

    turnosTbody.innerHTML = ''; // Limpiar la tabla
    turnos.forEach(turno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${turno.nombre_paciente}</td>
            <td>${turno.tipo_estudio}</td>
            <td>${formatearFechaHora(turno.fecha_hora)}</td>
            <td>${formatearCosto(turno.costo)}</td>
            <td>
                <button class="btn-eliminar" data-id="${turno.id}">Eliminar</button>
            </td>
        `;
        turnosTbody.appendChild(tr);
    });
}

/**
 * Carga TODOS los turnos (Histórico)
 */
async function cargarHistorico() {
    historicoTbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`; // 1. Cambiado a 5

    const { data: turnos, error } = await supabase
        .from('turnos')
        .select('*')
        .order('fecha_hora', { ascending: false }); // Descendente (más nuevos primero)

    if (error) {
        console.error('Error cargando histórico:', error);
        historicoTbody.innerHTML = `<tr><td colspan="5">Error al cargar.</td></tr>`; // 2. Cambiado a 5
        return;
    }

    if (turnos.length === 0) {
        historicoTbody.innerHTML = `<tr><td colspan="5">No hay pacientes en el histórico.</td></tr>`; // 3. Cambiado a 5
        return;
    }

    historicoTbody.innerHTML = ''; // Limpiar la tabla
    turnos.forEach(turno => {
        const tr = document.createElement('tr');
        // 4. Añadido el <td> con el botón
        tr.innerHTML = `
            <td>${turno.nombre_paciente}</td>
            <td>${turno.tipo_estudio}</td>
            <td>${formatearFechaHora(turno.fecha_hora)}</td>
            <td>${formatearCosto(turno.costo)}</td>
            <td>
                <button class="btn-eliminar-historico" data-id="${turno.id}">Eliminar</button>
            </td>
        `;
        historicoTbody.appendChild(tr);
    });
}


/**
 * Manejar el formulario para agregar un nuevo turno (CON DETECCIÓN DE COLISIÓN)
 */
turnoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Ocultar mensajes previos
    errorTurno.style.display = 'none';
    successTurno.style.display = 'none';
    
    // 1. Obtener valores
    const paciente = document.getElementById('paciente').value;
    const estudio = document.getElementById('estudio').value;
    const costo = document.getElementById('costo').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    // 2. Combinar fecha y hora en un string ISO 8601
    const fecha_hora = `${fecha}T${hora}:00`;

    // 3. DETECCIÓN DE COLISIÓN: Verificar si ya existe un turno
    try {
        const { data: existente, error: checkError } = await supabase
            .from('turnos')
            .select('id')
            .eq('fecha_hora', fecha_hora)
            .limit(1);

        if (checkError) {
            throw new Error(`Error al verificar turno: ${checkError.message}`);
        }

        // 4. Si ya existe, mostrar error y detener
        if (existente.length > 0) {
            errorTurno.textContent = '¡Error! Ya existe un turno agendado en esa fecha y hora.';
            errorTurno.style.display = 'block';
            return; // Detiene la ejecución
        }

        // 5. Si no existe, CREAR el nuevo turno
        const { error: insertError } = await supabase
            .from('turnos')
            .insert({
                nombre_paciente: paciente,
                tipo_estudio: estudio,
                fecha_hora: fecha_hora,
                costo: costo // Nueva columna
            });

        if (insertError) {
            throw new Error(`Error al agendar turno: ${insertError.message}`);
        }

        // 6. Éxito
        successTurno.textContent = '¡Turno agendado con éxito!';
        successTurno.style.display = 'block';
        turnoForm.reset(); // Limpiar el formulario
        cargarTurnos(); // Recargar la tabla de próximos turnos
        
        // Ocultar el mensaje de éxito después de 3 segundos
        setTimeout(() => { successTurno.style.display = 'none'; }, 3000);

    } catch (error) {
        console.error(error.message);
        errorTurno.textContent = 'Ocurrió un error. Intenta de nuevo.';
        errorTurno.style.display = 'block';
    }
});

// Manejar la eliminación de turnos (en la tabla de Próximos Turnos)
turnosTbody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const id = e.target.dataset.id;
        
        if (confirm('¿Estás segura de que quieres eliminar este turno?')) {
            const { error } = await supabase
                .from('turnos')
                .delete()
                .match({ id: id });

            if (error) {
                console.error('Error al eliminar:', error);
                alert('No se pudo eliminar el turno.');
            } else {
                cargarTurnos(); // Recargar la tabla
            }
        }
    }
});


// NUEVO: Manejar la eliminación de turnos (en la tabla de Histórico)
historicoTbody.addEventListener('click', async (e) => {
    // Usamos una clase diferente para no tener conflictos
    if (e.target.classList.contains('btn-eliminar-historico')) {
        const id = e.target.dataset.id;
        
        if (confirm('¿Estás segura de que quieres eliminar este turno del HISTÓRICO? (Esta acción es permanente)')) {
            const { error } = await supabase
                .from('turnos')
                .delete()
                .match({ id: id });

            if (error) {
                console.error('Error al eliminar:', error);
                alert('No se pudo eliminar el turno.');
            } else {
                cargarHistorico(); // Recargar la tabla de histórico
            }
        }
    }
});