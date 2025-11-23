// Dashboard Trabajo Remoto - Main Application

// Variable to store the refresh interval
let refreshInterval = null;

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Initialize app
    initializeApp();
});

function initializeApp() {
    // Load user data and setup UI
    loadUserData();
    loadDashboardStats();

    // Setup event listeners
    setupEventListeners();

    // Check user role and show appropriate panels
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol === 'admin') {
        showAdminPanel();
        showEmployeePanel(); // Also show employee panel for admin
        loadEmployees();
        loadCharts();
        loadEmployeeData(); // Load admin's own time records
    } else {
        showEmployeePanel();
        loadEmployeeData();
        // Start periodic refresh for employees (every 10 seconds)
        startPeriodicRefresh();
    }
}

function setupEventListeners() {
    console.log('Configurando event listeners...');

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('Event listener añadido a logoutBtn');
    }

    // Admin panel events
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => openEmployeeModal());
        console.log('Event listener añadido a addEmployeeBtn');
    }

    // Admin tabs
    const employeesTab = document.getElementById('employeesTab');
    const attendanceLogsTab = document.getElementById('attendanceLogsTab');
    if (employeesTab) {
        employeesTab.addEventListener('click', () => switchAdminTab('employees'));
    }
    if (attendanceLogsTab) {
        attendanceLogsTab.addEventListener('click', () => switchAdminTab('attendanceLogs'));
    }

    // Attendance logs filters
    const filterEmployee = document.getElementById('filterEmployee');
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (filterEmployee) {
        filterEmployee.addEventListener('change', loadAttendanceLogs);
    }
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', loadAttendanceLogs);
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchEmployees, 300));
        console.log('Event listener añadido a searchInput');
    }

    // Employee panel events
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');

    console.log('checkInBtn encontrado:', !!checkInBtn);
    console.log('checkOutBtn encontrado:', !!checkOutBtn);

    if (checkInBtn) {
        checkInBtn.addEventListener('click', checkIn);
        console.log('Event listener añadido a checkInBtn');
    }

    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', checkOut);
        console.log('Event listener añadido a checkOutBtn');
    }

    // Modal events
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const employeeForm = document.getElementById('employeeForm');

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeEmployeeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEmployeeModal);
    if (employeeForm) employeeForm.addEventListener('submit', saveEmployee);
}

function startPeriodicRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }

    // Set up periodic refresh every 10 seconds
    refreshInterval = setInterval(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.rol !== 'admin') {
            loadDashboardStats();
            loadEmployeeData();
        }
    }, 10000); // 10 seconds
}

function stopPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userInfo = document.getElementById('userInfo');

    if (userInfo && user.nombre) {
        userInfo.textContent = `Hola, ${user.nombre} (${user.rol})`;
    }
}

function loadDashboardStats() {
    console.log('Cargando estadísticas...');
    API.get('/dashboard/stats')
        .then(data => {
            console.log('Estadísticas cargadas:', data);
            renderStatsCards(data);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
            // Don't show toast error for periodic refreshes to avoid annoying notifications
        });
}

function renderStatsCards(stats) {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;

    // Ensure stats is an object
    if (!stats || typeof stats !== 'object') {
        console.error('Expected stats to be an object, but got:', stats);
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    let cards = [];

    if (user.rol === 'admin') {
        cards = [
            {
                title: 'Total Empleados',
                value: stats.totalEmpleados || 0,
                icon: 'fas fa-users',
                color: 'bg-blue-500'
            },
            {
                title: 'Conectados',
                value: stats.empleadosConectados || 0,
                icon: 'fas fa-circle',
                color: 'bg-green-500'
            },
            {
                title: 'Trabajo Remoto',
                value: stats.empleadosRemotos || 0,
                icon: 'fas fa-home',
                color: 'bg-purple-500'
            },
            {
                title: 'Registros Hoy',
                value: stats.registrosHoy || 0,
                icon: 'fas fa-clock',
                color: 'bg-yellow-500'
            }
        ];
    } else {
        cards = [
            {
                title: 'Estado Actual',
                value: stats.estadoActual || 'Desconectado',
                icon: 'fas fa-circle',
                color: stats.estadoActual === 'conectado' ? 'bg-green-500' : 'bg-gray-500'
            },
            {
                title: 'Registros Hoy',
                value: stats.registrosHoy || 0,
                icon: 'fas fa-clock',
                color: 'bg-blue-500'
            },
            {
                title: 'Horas este Mes',
                value: `${stats.horasTrabajadasMes || 0}h`,
                icon: 'fas fa-calendar',
                color: 'bg-purple-500'
            }
        ];
    }

    statsSection.innerHTML = cards.map(card => `
        <div class="bg-white rounded-lg shadow p-6 card-hover">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="${card.color} rounded-lg p-3">
                        <i class="${card.icon} text-white text-xl"></i>
                    </div>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-600">${card.title}</p>
                    <p class="text-2xl font-semibold text-gray-900">${card.value}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function showAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    const chartsSection = document.getElementById('chartsSection');

    if (adminPanel) adminPanel.classList.remove('hidden');
    if (chartsSection) chartsSection.classList.remove('hidden');

    // Load employees for the filter dropdown
    loadEmployeesForFilter();

    // Stop periodic refresh for admin
    stopPeriodicRefresh();
}

function showEmployeePanel() {
    const employeePanel = document.getElementById('employeePanel');

    if (employeePanel) employeePanel.classList.remove('hidden');

    // Start periodic refresh for employees
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.rol !== 'admin') {
        startPeriodicRefresh();
    }
}

function loadEmployees() {
    API.get('/employees')
        .then(data => {
            renderEmployeesTable(data);
        })
        .catch(error => {
            console.error('Error loading employees:', error);
            showToast('Error al cargar empleados', 'error');
        });
}

function renderEmployeesTable(employees) {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    tbody.innerHTML = employees.map(employee => `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-2 text-sm text-gray-900">${employee.nombre}</td>
            <td class="px-4 py-2 text-sm text-gray-600">${employee.usuario}</td>
            <td class="px-4 py-2 text-sm text-gray-600">${employee.departamento}</td>
            <td class="px-4 py-2 text-sm text-gray-600">
                <span class="px-2 py-1 text-xs rounded-full ${employee.tipo_trabajo === 'remoto' ? 'bg-blue-100 text-blue-800' :
            employee.tipo_trabajo === 'presencial' ? 'bg-green-100 text-green-800' :
                'bg-yellow-100 text-yellow-800'
        }">
                    ${employee.tipo_trabajo}
                </span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-600">
                <span class="flex items-center">
                    <i class="fas fa-circle text-xs mr-2 ${employee.estado_actual === 'conectado' ? 'text-green-500' : 'text-gray-400'
        }"></i>
                    ${employee.estado_actual}
                </span>
            </td>
            <td class="px-4 py-2 text-sm">
                <button onclick="editEmployee(${employee.id})" class="text-indigo-600 hover:text-indigo-900 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEmployee(${employee.id})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadEmployeeData(employeeId = null) {
    const url = employeeId ? `/dashboard/employee-time-records/${employeeId}` : '/attendance/my-today';

    API.get(url)
        .then(data => {
            renderTimeRecords(data);
        })
        .catch(error => {
            console.error('Error loading time records:', error);
            // Don't show toast error for periodic refreshes to avoid annoying notifications
        });
}

function renderTimeRecords(records) {
    const container = document.getElementById('timeRecords');
    if (!container) return;

    // Ensure records is an array
    if (!Array.isArray(records)) {
        console.warn('Expected records to be an array, but got:', records);
        // If it's an object, wrap it in an array
        if (records && typeof records === 'object') {
            records = [records];
        } else {
            container.innerHTML = '<p class="text-red-500 text-sm">Error al cargar registros</p>';
            return;
        }
    }

    if (records.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No hay registros para hoy</p>';
        return;
    }

    container.innerHTML = records.map(record => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
                <p class="text-sm font-medium">${record.fecha}</p>
                <p class="text-xs text-gray-600">
                    ${record.hora_entrada ? new Date(record.hora_entrada).toLocaleTimeString() : 'Pendiente'}
                    ${record.hora_salida ? ' - ' + new Date(record.hora_salida).toLocaleTimeString() : ''}
                    ${record.horas_trabajadas ? ` (${record.horas_trabajadas}h)` : ''}
                </p>
            </div>
            <span class="px-2 py-1 text-xs rounded-full ${record.estado === 'completado' ? 'bg-green-100 text-green-800' :
            record.estado === 'activo' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
        }">
                ${record.estado}
            </span>
        </div>
    `).join('');
}

function loadCharts() {
    // Obtener datos reales de la API y crear gráficos basados en ellos
    Promise.all([
        API.get('/employees'),
        API.get('/dashboard/charts')
    ])
        .then(([employeesData, chartsData]) => {
            renderRealCharts(employeesData, chartsData);
        })
        .catch(error => {
            console.error('Error loading real charts data:', error);
            // Mostrar gráficos de ejemplo si hay error
            renderExampleCharts();
        });
}

function renderRealCharts(employeesData, chartsData) {
    const chartsSection = document.getElementById('chartsSection');
    if (!chartsSection) return;

    // Procesar datos reales de empleados
    const workTypeData = {};
    const departmentData = {};

    employeesData.forEach(employee => {
        // Contar por tipo de trabajo
        const workType = employee.tipo_trabajo || 'No especificado';
        workTypeData[workType] = (workTypeData[workType] || 0) + 1;

        // Contar por departamento
        const department = employee.departamento || 'No especificado';
        departmentData[department] = (departmentData[department] || 0) + 1;
    });

    // Convertir objetos a arrays para los gráficos
    const workTypeLabels = Object.keys(workTypeData);
    const workTypeValues = Object.values(workTypeData);
    const departmentLabels = Object.keys(departmentData);
    const departmentValues = Object.values(departmentData);

    // Crear gráfico basado en datos reales
    chartsSection.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Estadísticas Reales</h3>
            
            <!-- Gráfico circular de tipo de trabajo -->
            <div class="mb-6">
                <h4 class="text-md font-medium text-gray-800 mb-3">Tipo de Trabajo</h4>
                <div class="flex items-center justify-center">
                    <div class="relative w-48 h-48 rounded-full" id="workTypeChartContainer">
                        <!-- El gráfico se generará aquí -->
                    </div>
                    <div class="ml-8">
                        ${workTypeLabels.map((label, index) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const color = colors[index % colors.length];
        const percentage = workTypeValues.length > 0 ?
            Math.round((workTypeValues[index] / workTypeValues.reduce((a, b) => a + b, 0)) * 100) : 0;
        return `
                                <div class="flex items-center mb-2">
                                    <div class="w-4 h-4 rounded mr-2" style="background-color: ${color};"></div>
                                    <span class="text-sm">${label} (${workTypeValues[index]} - ${percentage}%)</span>
                                </div>
                            `;
    }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Generar el gráfico circular con los datos reales
    generatePieChart('workTypeChartContainer', workTypeValues, workTypeLabels);
}

function generatePieChart(containerId, values, labels) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Colores para los segmentos
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Calcular ángulos para el gráfico circular
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) {
        container.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><span class="text-lg font-semibold">Sin datos</span></div>';
        return;
    }

    // Crear el elemento SVG
    const size = 192; // 48 * 4
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    let svgHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="rounded-full">`;

    let cumulativePercentage = 0;

    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const percentage = (value / total) * 100;
        const startAngle = (cumulativePercentage / 100) * 360;
        const endAngle = ((cumulativePercentage + percentage) / 100) * 360;

        // Convertir ángulos a coordenadas
        const startX = centerX + radius * Math.cos((Math.PI / 180) * (startAngle - 90));
        const startY = centerY + radius * Math.sin((Math.PI / 180) * (startAngle - 90));
        const endX = centerX + radius * Math.cos((Math.PI / 180) * (endAngle - 90));
        const endY = centerY + radius * Math.sin((Math.PI / 180) * (endAngle - 90));

        // Determinar si es un arco grande
        const largeArcFlag = percentage > 50 ? 1 : 0;

        // Crear el path del segmento
        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'Z'
        ].join(' ');

        const color = colors[i % colors.length];

        svgHTML += `<path d="${pathData}" fill="${color}" stroke="white" stroke-width="2"></path>`;

        cumulativePercentage += percentage;
    }

    // Círculo central blanco
    svgHTML += `<circle cx="${centerX}" cy="${centerY}" r="${radius - 20}" fill="white"></circle>`;
    svgHTML += `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="bold">${total}</text>`;
    svgHTML += '</svg>';

    container.innerHTML = svgHTML;
}

function renderExampleCharts() {
    const chartsSection = document.getElementById('chartsSection');
    if (!chartsSection) return;

    // Crear contenido HTML para los gráficos de ejemplo (solo gráfico circular)
    chartsSection.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Estadísticas de Ejemplo</h3>
            
            <!-- Gráfico circular simple -->
            <div class="mb-6">
                <h4 class="text-md font-medium text-gray-800 mb-3">Tipo de Trabajo</h4>
                <div class="flex items-center justify-center">
                    <div class="relative w-48 h-48 rounded-full" style="background: conic-gradient(#3b82f6 0% 40%, #10b981 40% 75%, #f59e0b 75% 100%);">
                        <div class="absolute inset-4 bg-white rounded-full"></div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="text-lg font-semibold">100%</span>
                        </div>
                    </div>
                    <div class="ml-8">
                        <div class="flex items-center mb-2">
                            <div class="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                            <span class="text-sm">Remoto (40%)</span>
                        </div>
                        <div class="flex items-center mb-2">
                            <div class="w-4 h-4 bg-green-500 rounded mr-2"></div>
                            <span class="text-sm">Presencial (35%)</span>
                        </div>
                        <div class="flex items-center">
                            <div class="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                            <span class="text-sm">Híbrido (25%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openEmployeeModal(employeeId = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    const title = document.getElementById('modalTitle');

    if (modal) modal.classList.remove('hidden');
    if (form) form.reset();

    if (employeeId) {
        title.textContent = 'Editar Empleado';
        loadEmployeeForEdit(employeeId);
    } else {
        title.textContent = 'Nuevo Empleado';
        document.getElementById('employeePassword').required = true;
    }
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) modal.classList.add('hidden');
}

function loadEmployeeForEdit(employeeId) {
    API.get(`/employees/${employeeId}`)
        .then(data => {
            document.getElementById('employeeId').value = data.id;
            document.getElementById('employeeName').value = data.nombre;
            document.getElementById('employeeUsername').value = data.usuario;
            document.getElementById('employeeEmail').value = data.email;
            document.getElementById('employeeDepartment').value = data.departamento;
            document.getElementById('employeeWorkType').value = data.tipo_trabajo;
            document.getElementById('employeePassword').required = false;
        })
        .catch(error => {
            console.error('Error loading employee:', error);
            showToast('Error al cargar empleado', 'error');
        });
}

function saveEmployee(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const employeeData = Object.fromEntries(formData);
    const employeeId = employeeData.employeeId;

    const url = employeeId ? `/employees/${employeeId}` : '/employees';
    const method = employeeId ? 'PUT' : 'POST';

    API.request(method, url, employeeData)
        .then(() => {
            closeEmployeeModal();
            loadEmployees();
            showToast(employeeId ? 'Empleado actualizado' : 'Empleado creado', 'success');
        })
        .catch(error => {
            console.error('Error saving employee:', error);
            showToast('Error al guardar empleado', 'error');
        });
}

function editEmployee(employeeId) {
    openEmployeeModal(employeeId);
}

function deleteEmployee(employeeId) {
    if (confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
        API.delete(`/employees/${employeeId}`)
            .then(() => {
                loadEmployees();
                showToast('Empleado eliminado', 'success');
            })
            .catch(error => {
                console.error('Error deleting employee:', error);
                showToast('Error al eliminar empleado: ' + error.message, 'error');
            });
    }
}

function searchEmployees(event) {
    const query = event.target.value.trim();

    if (query.length < 2) {
        loadEmployees();
        return;
    }

    API.get(`/employees/search/${query}`)
        .then(data => {
            renderEmployeesTable(data);
        })
        .catch(error => {
            console.error('Error searching employees:', error);
        });
}

function checkIn() {
    console.log('Iniciando check-in...');
    API.post('/attendance/checkin')
        .then(response => {
            console.log('Check-in exitoso:', response);
            showToast(response.message || 'Check-in registrado exitosamente', 'success');
            // Refresh stats and employee data immediately
            setTimeout(() => {
                loadDashboardStats();
                loadEmployeeData();
                // If user is admin, also refresh the employees table
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.rol === 'admin') {
                    loadEmployees();
                }
            }, 300); // Small delay to ensure database update is complete
        })
        .catch(error => {
            console.error('Error en check-in:', error);
            showToast(error.message || 'Error al registrar check-in', 'error');
        });
}

function checkOut() {
    API.post('/attendance/checkout')
        .then(response => {
            console.log('Check-out exitoso:', response);
            showToast(response.message || 'Check-out registrado exitosamente', 'success');
            // Refresh stats and employee data immediately
            setTimeout(() => {
                loadDashboardStats();
                loadEmployeeData();
                // If user is admin, also refresh the employees table
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.rol === 'admin') {
                    loadEmployees();
                }
            }, 300); // Small delay to ensure database update is complete
        })
        .catch(error => {
            console.error('Error en check-out:', error);
            showToast(error.message || 'Error al registrar check-out', 'error');
        });
}

function logout() {
    // Stop periodic refresh on logout
    stopPeriodicRefresh();

    API.post('/auth/logout')
        .then(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        })
        .catch(() => {
            // Even if logout fails, clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;

    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Admin tab switching
function switchAdminTab(tab) {
    const employeesView = document.getElementById('employeesView');
    const attendanceLogsView = document.getElementById('attendanceLogsView');
    const employeesTab = document.getElementById('employeesTab');
    const attendanceLogsTab = document.getElementById('attendanceLogsTab');

    if (tab === 'employees') {
        employeesView.classList.remove('hidden');
        attendanceLogsView.classList.add('hidden');
        employeesTab.classList.add('border-indigo-600', 'text-indigo-600');
        employeesTab.classList.remove('border-transparent', 'text-gray-500');
        attendanceLogsTab.classList.remove('border-indigo-600', 'text-indigo-600');
        attendanceLogsTab.classList.add('border-transparent', 'text-gray-500');
    } else if (tab === 'attendanceLogs') {
        employeesView.classList.add('hidden');
        attendanceLogsView.classList.remove('hidden');
        attendanceLogsTab.classList.add('border-indigo-600', 'text-indigo-600');
        attendanceLogsTab.classList.remove('border-transparent', 'text-gray-500');
        employeesTab.classList.remove('border-indigo-600', 'text-indigo-600');
        employeesTab.classList.add('border-transparent', 'text-gray-500');

        // Load attendance logs when switching to this tab
        loadAttendanceLogs();
    }
}

// Load employees for filter dropdown
function loadEmployeesForFilter() {
    API.get('/employees')
        .then(employees => {
            const filterSelect = document.getElementById('filterEmployee');
            if (!filterSelect) return;

            // Keep the "All employees" option and add employee options
            const employeeOptions = employees.map(emp =>
                `<option value="${emp.id}">${emp.nombre}</option>`
            ).join('');

            filterSelect.innerHTML = '<option value="">Todos los empleados</option>' + employeeOptions;
        })
        .catch(error => {
            console.error('Error loading employees for filter:', error);
        });
}

// Load attendance logs
function loadAttendanceLogs() {
    const filterEmployee = document.getElementById('filterEmployee');
    const employeeId = filterEmployee ? filterEmployee.value : '';

    const url = employeeId ? `/attendance/all?employeeId=${employeeId}` : '/attendance/all';

    API.get(url)
        .then(data => {
            renderAttendanceLogs(data);
        })
        .catch(error => {
            console.error('Error loading attendance logs:', error);
            showToast('Error al cargar registros de asistencia', 'error');
        });
}

// Render attendance logs table
function renderAttendanceLogs(records) {
    const tbody = document.getElementById('attendanceLogsTableBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No hay registros de asistencia</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(record => {
        const fecha = new Date(record.fecha).toLocaleDateString('es-ES');
        const horaEntrada = record.hora_entrada ? new Date(record.hora_entrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';
        const horaSalida = record.hora_salida ? new Date(record.hora_salida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '-';
        const horas = record.horas_trabajadas ? record.horas_trabajadas.toFixed(2) : '-';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-900">${record.empleado_nombre}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${record.departamento}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${fecha}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${horaEntrada}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${horaSalida}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${horas}</td>
                <td class="px-4 py-2 text-sm">
                    <span class="px-2 py-1 text-xs rounded-full ${record.estado === 'completado' ? 'bg-green-100 text-green-800' :
                record.estado === 'activo' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
            }">
                        ${record.estado}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}