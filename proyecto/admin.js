// --- 1. Configuración de Supabase ---
// ¡Reemplaza esto con tus propias claves de Supabase!
const SUPABASE_URL = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwOTUxNzYsImV4cCI6MjA3NjY3MTE3Nn0.UvFfrKlXaW1bEPuXJfNw6mFU7JyfWDmAPF3GIfgJRtI';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Y2tocXhjaXBnZHZrZG1qaWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA5NTE3NiwiZXhwIjoyMDc2NjcxMTc2fQ.O0h9e7OjFKC4EB3hs1N6Da8e-in6HWw7a8fXFq8RAsc';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a elementos del DOM ---
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const errorLogin = document.getElementById('error-login');
const logoutBtn = document.getElementById('logout-btn');

const turnoForm = document.getElementById('turno-form');
const successTurno = document.getElementById('success-turno');
const turnosTbody = document.getElementById('turnos-tbody');

// --- 3. Lógica de Autenticación ---

// Al cargar la página, chequear si ya hay un usuario logueado
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Si hay sesión, mostrar el panel de admin y cargar turnos
        loginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        cargarTurnos();
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
        cargarTurnos();
    }
});

// Manejar el clic en "Cerrar Sesión"
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    // Recargar la página para volver al login
    location.reload();
});


// --- 4. Lógica de la Agenda (Base de Datos) ---

// Función para cargar los turnos desde Supabase
async function cargarTurnos() {
    turnosTbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

    const { data: turnos, error } = await supabase
        .from('turnos') // El nombre de tu tabla
        .select('*')
        .order('fecha_hora', { ascending: true }); // Ordenar por fecha

    if (error) {
        console.error('Error cargando turnos:', error);
        turnosTbody.innerHTML = '<tr><td colspan="4">Error al cargar turnos.</td></tr>';
        return;
    }

    if (turnos.length === 0) {
        turnosTbody.innerHTML = '<tr><td colspan="4">No hay turnos agendados.</td></tr>';
        return;
    }

    turnosTbody.innerHTML = ''; // Limpiar la tabla
    turnos.forEach(turno => {
        const tr = document.createElement('tr');
        
        // Formatear la fecha y hora
        const fechaHora = new Date(turno.fecha_hora);
        const fechaFormateada = fechaHora.toLocaleString('es-AR', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'America/Argentina/Buenos_Aires' // Ajusta tu zona horaria
        });

        tr.innerHTML = `
            <td>${turno.nombre_paciente}</td>
            <td>${turno.tipo_estudio}</td>
            <td>${fechaFormateada}</td>
            <td>
                <button class="btn-eliminar" data-id="${turno.id}">Eliminar</button>
            </td>
        `;
        turnosTbody.appendChild(tr);
    });
}

// Manejar el formulario para agregar un nuevo turno
turnoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const paciente = document.getElementById('paciente').value;
    const estudio = document.getElementById('estudio').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;

    // Combinar fecha y hora en un solo string ISO 8601
    const fecha_hora = `${fecha}T${hora}:00`;

    const { error } = await supabase
        .from('turnos')
        .insert({
            nombre_paciente: paciente,
            tipo_estudio: estudio,
            fecha_hora: fecha_hora
        });

    if (error) {
        console.error('Error al agendar turno:', error);
    } else {
        successTurno.textContent = '¡Turno agendado con éxito!';
        successTurno.style.display = 'block';
        turnoForm.reset(); // Limpiar el formulario
        cargarTurnos(); // Recargar la tabla
        
        // Ocultar el mensaje de éxito después de 3 segundos
        setTimeout(() => { successTurno.style.display = 'none'; }, 3000);
    }
});

// Manejar la eliminación de turnos (delegación de eventos)
turnosTbody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const id = e.target.dataset.id;
        
        // Pedir confirmación
        if (confirm('¿Estás segura de que quieres eliminar este turno?')) {
            const { error } = await supabase
                .from('turnos')
                .delete()
                .match({ id: id });

            if (error) {
                console.error('Error al eliminar:', error);
            } else {
                cargarTurnos(); // Recargar la tabla
            }
        }
    }
});