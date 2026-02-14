<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel Dra. Luna - Administración</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body class="admin-body">

    <section id="login-section" class="login-overlay">
        <div class="login-card">
            <h2>Consultorio Luna</h2>
            <p>Acceso Administrativo</p>
            <form id="login-form">
                <input type="email" id="email" placeholder="Usuario" required>
                <input type="password" id="password" placeholder="Contraseña" required>
                <button type="submit" class="btn-login">Ingresar</button>
            </form>
            <p id="error-login" class="error-msg"></p>
            <a href="index.html" class="back-link">Volver al sitio web</a>
        </div>
    </section>

    <div id="admin-dashboard" class="dashboard-container" style="display: none;">
        
        <aside class="sidebar">
            <div class="sidebar-brand">
                <h3>Dra. Luna</h3>
                <span>Admin Panel</span>
            </div>
            
            <nav class="sidebar-menu">
                <button class="menu-item active" data-target="view-resumen">
                    <i class="fas fa-chart-pie"></i> Resumen
                </button>
                <button class="menu-item" data-target="view-agenda">
                    <i class="fas fa-calendar-check"></i> Agenda de Turnos
                </button>
                <button class="menu-item" data-target="view-finanzas">
                    <i class="fas fa-wallet"></i> Finanzas & Pagos
                </button>
                <button class="menu-item" data-target="view-pacientes">
                    <i class="fas fa-users"></i> Histórico Pacientes
                </button>
            </nav>

            <div class="sidebar-footer">
                <button id="logout-btn" class="btn-logout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
            </div>
        </aside>

        <main class="main-content">
            
            <section id="view-resumen" class="view-panel active">
                <header class="panel-header">
                    <h1>Hola, Daniela 👋</h1>
                    <p>Resumen de actividad del consultorio.</p>
                </header>

                <div class="kpi-grid">
                    <div class="kpi-card blue">
                        <div class="kpi-icon"><i class="fas fa-calendar-day"></i></div>
                        <div class="kpi-info">
                            <h3>Turnos Hoy</h3>
                            <p class="kpi-number" id="kpi-turnos-hoy">0</p>
                        </div>
                    </div>
                    <div class="kpi-card green">
                        <div class="kpi-icon"><i class="fas fa-dollar-sign"></i></div>
                        <div class="kpi-info">
                            <h3>Ingresos Este Mes</h3>
                            <small>(Consultorios + Externos)</small>
                            <p class="kpi-number" id="kpi-ingresos-mes">$0</p>
                        </div>
                    </div>
                    <div class="kpi-card purple">
                        <div class="kpi-icon"><i class="fas fa-user-injured"></i></div>
                        <div class="kpi-info">
                            <h3>Próximo Paciente</h3>
                            <p class="kpi-text" id="kpi-prox-paciente">-</p>
                            <small id="kpi-prox-hora">-</small>
                        </div>
                    </div>
                </div>
            </section>

            <section id="view-agenda" class="view-panel" style="display: none;">
                <header class="panel-header">
                    <h1>Agenda de Turnos</h1>
                </header>
                
                <div class="split-layout">
                    <div class="card-form">
                        <h3 id="form-title"><i class="fas fa-plus-circle"></i> Nuevo Turno</h3>
                        <form id="turno-form">
                            <input type="hidden" id="edit-id">

                            <label>Sede (Consultorio)</label>
                            <select id="sede" required>
                                <option value="" disabled selected>Seleccionar Sede...</option>
                                <option value="Consultorio Vélez Sarsfield">Consultorio Vélez Sarsfield</option>
                                <option value="Consultorio Julio Arboleda">Consultorio Julio Arboleda</option>
                            </select>

                            <label>Paciente</label>
                            <input type="text" id="paciente" placeholder="Nombre completo" required>
                            
                            <label>Estudio</label>
                            <select id="estudio" required>
                                <option value="" disabled selected>Seleccionar...</option>
                                <option value="Ecografía Abdominal">Ecografía Abdominal</option>
                                <option value="Ecografía Ginecológica">Ecografía Ginecológica</option>
                                <option value="Ecografía Obstétrica">Ecografía Obstétrica</option>
                                <option value="Ecografía 4D/5D">Ecografía 4D/5D</option>
                                <option value="Ecografía Mamaria">Ecografía Mamaria</option>
                                <option value="Ecografía Musculoesquelética">Ecografía Musculoesquelética</option>
                                <option value="Doppler Vascular">Doppler Vascular</option>
                                <option value="Ecografía Pediátrica">Ecografía Pediátrica</option>
                                <option value="Otro">Otro</option>
                            </select>
                            
                            <div class="row-2">
                                <div>
                                    <label>Fecha</label>
                                    <input type="date" id="fecha" required>
                                </div>
                                <div>
                                    <label>Hora</label>
                                    <select id="hora" required></select>
                                </div>
                            </div>

                            <label>Costo ($)</label>
                            <input type="number" id="costo" placeholder="0" required>

                            <button type="submit" id="btn-save-turno" class="btn-action">Agendar Turno</button>
                            <button type="button" id="btn-cancel-edit" class="btn-action secondary" style="display: none; margin-top: 10px;">Cancelar Edición</button>
                            
                            <p id="success-turno" class="success-msg"></p>
                            <p id="error-turno" class="error-msg"></p>
                        </form>
                    </div>

                    <div class="agenda-tables-container">
                        
                        <div class="card-table-container mb-20">
                            <h3 class="sede-title velez">📍 Vélez Sarsfield</h3>
                            <div class="table-responsive">
                                <table class="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Paciente</th>
                                            <th>Estudio</th>
                                            <th>Costo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="turnos-velez-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="card-table-container">
                            <h3 class="sede-title arboleda">📍 Julio Arboleda</h3>
                            <div class="table-responsive">
                                <table class="modern-table">
                                    <thead>
                                        <tr>
                                            <th>Hora</th>
                                            <th>Paciente</th>
                                            <th>Estudio</th>
                                            <th>Costo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody id="turnos-arboleda-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <section id="view-finanzas" class="view-panel" style="display: none;">
                <header class="panel-header">
                    <h1>Finanzas y Pagos Externos</h1>
                </header>

                <div class="split-layout">
                    <div class="card-form">
                        <h3><i class="fas fa-hand-holding-usd"></i> Registrar Ingreso Externo</h3>
                        <p class="text-muted">Pagos de Ospia, Ferreyra, etc.</p>
                        
                        <form id="facturacion-form">
                            <label>Sede / Origen</label>
                            <select id="sede-externa" required>
                                <option value="" disabled selected>Seleccionar sede...</option>
                                <option value="Ospia">Ospia</option>
                                <option value="Ferreyra">Ferreyra</option>
                            </select>

                            <label>Fecha de Cobro</label>
                            <input type="date" id="fecha-externa" required>

                            <label>Monto Cobrado ($)</label>
                            <input type="number" id="monto-externa" placeholder="0" required>

                            <label>Notas (Opcional)</label>
                            <input type="text" id="notas-externa" placeholder="Detalles extra...">

                            <button type="submit" class="btn-action secondary">Registrar Ingreso</button>
                            <p id="success-facturacion" class="success-msg"></p>
                        </form>

                        <div class="mini-list-container">
                            <h4>Últimos Cargados</h4>
                            <ul id="lista-ultimos-externos" class="mini-list"></ul>
                        </div>
                    </div>

                    <div class="stats-overview">
                        <div class="card-table-container">
                            <h3><i class="fas fa-building"></i> Total por Sede (Externos)</h3>
                            <table class="modern-table">
                                <thead>
                                    <tr>
                                        <th>Mes</th>
                                        <th>Sede</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody id="stats-externos-tbody"></tbody>
                            </table>
                        </div>

                        <div class="card-table-container" style="margin-top: 20px;">
                            <h3><i class="fas fa-home"></i> Ingresos Consultorios Propios</h3>
                            <p class="text-muted small">(Vélez Sarsfield + Julio Arboleda)</p>
                            <table class="modern-table">
                                <thead>
                                    <tr>
                                        <th>Mes</th>
                                        <th>Pacientes</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody id="stats-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <section id="view-pacientes" class="view-panel" style="display: none;">
                <header class="panel-header">
                    <h1>Historial de Pacientes</h1>
                </header>
                <div class="card-table-container full-width">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Sede</th>
                                <th>Paciente</th>
                                <th>Estudio</th>
                                <th>Costo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="historico-tbody"></tbody>
                    </table>
                </div>
            </section>

        </main>
    </div>

    <script src="admin.js"></script>
</body>
</html>
