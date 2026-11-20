const $ = (sel) => document.querySelector(sel);

const state = {
  registros: [],
  editando: false,
  filtroEmpresa: 'Todas' // Estado para el filtro lateral
};

/* ==================== UTILIDADES ==================== */
function showToast(msg, tipo = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${tipo}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function abrirModal() { $('#modal').classList.remove('hidden'); }
function cerrarModal() {
  $('#modal').classList.add('hidden');
  limpiarFormulario();
}

function limpiarFormulario() {
  $('#form-gestion').reset();
  $('#row-id').value = '';
  state.editando = false;
  $('#form-title').textContent = 'Registrar Nueva Gestión';
  $('#btn-submit').textContent = 'Guardar';
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function validarFormulario(data) {
  const requeridos = ['descripcion', 'empresa', 'valor', 'paquete', 'visto', 'documento', 'nombre', 'especialidad'];
  let ok = true;
  requeridos.forEach(campo => {
    const el = document.getElementById(campo);
    if (!el) return;
    const valor = String(data[campo] ?? '').trim();
    if (valor === '' || valor.startsWith('Selecciona')) {
      el.classList.add('invalid');
      ok = false;
    } else {
      el.classList.remove('invalid');
    }
  });
  return ok;
}

function formatoMoneda(valor) {
  const n = Number(valor);
  if (isNaN(n)) return valor;
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ==================== BÚSQUEDA ==================== */
function normalizar(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function coincideBusqueda(registro, termino) {
  const palabras = normalizar(termino).split(' ').filter(Boolean);
  if (palabras.length === 0) return true;
  const campos = [normalizar(registro.cups), normalizar(registro.descripcion), normalizar(registro.empresa), normalizar(registro.especialidad)].join(' ');
  return palabras.every(p => campos.includes(p));
}

/* ==================== RENDER SIDEBAR (EMPRESAS) ==================== */
function renderSidebar() {
  const lista = $('#lista-empresas');
  const badgeTotal = $('#badge-total');
  
  // Badge de "Todas"
  badgeTotal.textContent = state.registros.length;
  badgeTotal.setAttribute('data-count', state.registros.length);

  // Contar registros por empresa
  const conteo = {};
  state.registros.forEach(r => {
    const emp = r.empresa || 'Sin Empresa';
    conteo[emp] = (conteo[emp] || 0) + 1;
  });

  const empresasOrdenadas = Object.keys(conteo).sort();

  // Inyectar HTML
  lista.innerHTML = empresasOrdenadas.map(emp => `
    <button class="sidebar-item ${state.filtroEmpresa === emp ? 'active' : ''}" data-empresa="${escapeHtml(emp)}">
      <div class="item-left">
        <span class="dot"></span>
        <span>${escapeHtml(emp)}</span>
      </div>
      <span class="badge" data-count="${conteo[emp]}">${conteo[emp]}</span>
    </button>
  `).join('');
  
  // Actualizar el estado visual del botón "Todas"
  $('#btn-filtro-todas').classList.toggle('active', state.filtroEmpresa === 'Todas');
}

/* ==================== RENDER TABLA ==================== */
function renderTabla(filtroTexto = '') {
  const tbody = $('#tbody');
  
  // 1. Filtrar por menú lateral
  let datos = state.registros;
  if (state.filtroEmpresa !== 'Todas') {
    datos = datos.filter(r => (r.empresa || 'Sin Empresa') === state.filtroEmpresa);
  }

  // 2. Filtrar por barra de búsqueda
  datos = datos.filter(r => coincideBusqueda(r, filtroTexto));

  if (datos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">No se encontraron registros.</td></tr>`;
    return;
  }

  tbody.innerHTML = datos.map(r => `
    <tr>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.cups) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}" title="${escapeHtml(r.descripcion)}">${escapeHtml(r.descripcion) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.especialidad) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.empresa) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${formatoMoneda(r.valor)}</td>
      <td class="clickable" data-id="${r.rowId}" title="${escapeHtml(r.paquete)}">${escapeHtml(r.paquete) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.visto) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.documento) || '—'}</td>
      <td class="clickable" data-id="${r.rowId}">${escapeHtml(r.nombre) || '—'}</td>
      <td class="actions-cell">
        <button class="btn edit" data-action="editar" data-id="${r.rowId}">✏️ Editar</button>
        <button class="btn danger" data-action="eliminar" data-id="${r.rowId}">🗑️ Eliminar</button>
      </td>
    </tr>
  `).join('');
}

/* ==================== MODAL DETALLE ==================== */
function abrirDetalle(rowId) {
  const r = state.registros.find(x => String(x.rowId) === String(rowId));
  if (!r) return;
  const campos = [
    ['Código CUPS', r.cups], ['Descripción', r.descripcion], ['Especialidad', r.especialidad],
    ['Empresa', r.empresa], ['Valor', formatoMoneda(r.valor)], ['Paquete Qx', r.paquete],
    ['Visto bueno por', r.visto], ['Documento paciente', r.documento], ['Nombre paciente', r.nombre]
  ];
  $('#detalle-contenido').innerHTML = campos.map(([label, valor]) => `
    <dt>${label}</dt><dd>${escapeHtml(valor) || '—'}</dd>
  `).join('');
  $('#detalle-title').textContent = `Detalle de ${r.nombre || 'la gestión'}`;
  $('#modal-detalle').classList.remove('hidden');
}

function cerrarDetalle() { $('#modal-detalle').classList.add('hidden'); }

/* ==================== CRUD ==================== */
async function cargarDatos() {
  try {
    const res = await API.listar();
    state.registros = res.data || [];
    
    // Una vez cargados los datos, actualizamos el sidebar y la tabla
    renderSidebar();
    renderTabla($('#search').value);
    
  } catch (err) {
    showToast('Error al cargar datos: ' + err.message, 'error');
    $('#tbody').innerHTML = `<tr><td colspan="10" class="empty">⚠️ No se pudo conectar con la API.</td></tr>`;
  }
}

async function guardar(e) {
  e.preventDefault();
  const data = {
    cups: $('#cups').value.trim(), descripcion: $('#descripcion').value.trim(), empresa: $('#empresa').value.trim(),
    valor: $('#valor').value.trim(), paquete: $('#paquete').value.trim(), visto: $('#visto').value.trim(),
    documento: $('#documento').value.trim(), nombre: $('#nombre').value.trim(), especialidad: $('#especialidad').value.trim()
  };

  if (!validarFormulario(data)) {
    showToast('Complete los campos obligatorios.', 'error');
    return;
  }

  try {
    if (state.editando) {
      data.rowId = $('#row-id').value;
      await API.actualizar(data);
      showToast('Registro actualizado ✅');
    } else {
      await API.crear(data);
      showToast('Registro creado ✅');
    }
    cerrarModal();
    await cargarDatos();
  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

function cargarEnFormulario(rowId) {
  const r = state.registros.find(x => String(x.rowId) === String(rowId));
  if (!r) return;
  $('#row-id').value = r.rowId;
  $('#cups').value = r.cups || '';
  $('#descripcion').value = r.descripcion || '';
  $('#empresa').value = r.empresa || '';
  $('#valor').value = r.valor || '';
  $('#paquete').value = r.paquete || '';
  $('#visto').value = r.visto || '';
  $('#documento').value = r.documento || '';
  $('#nombre').value = r.nombre || '';
  $('#especialidad').value = r.especialidad || '';
  
  state.editando = true;
  $('#form-title').textContent = 'Editar Gestión';
  $('#btn-submit').textContent = 'Actualizar';
  abrirModal();
}

async function eliminar(rowId) {
  const r = state.registros.find(x => String(x.rowId) === String(rowId));
  const nombre = r ? r.nombre : 'este registro';
  if (!confirm(`¿Eliminar definitivamente la gestión de "${nombre}"?`)) return;
  try {
    await API.eliminar(rowId);
    showToast('Registro eliminado 🗑️');
    await cargarDatos();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

/* ==================== EVENTOS ==================== */
document.addEventListener('DOMContentLoaded', () => {
  
  // Crear overlay para el menú móvil
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  const sidebar = $('#sidebar');
  const toggleSidebar = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  };

  $('#btn-toggle-sidebar').addEventListener('click', toggleSidebar);
  $('#btn-close-sidebar').addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);

  // Clic en los items del Sidebar (Empresas)
  $('.sidebar').addEventListener('click', (e) => {
    const btn = e.target.closest('.sidebar-item');
    if (!btn) return;
    
    state.filtroEmpresa = btn.dataset.empresa;
    
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');

    // Si estamos en móvil, cerramos el menú automáticamente
    if (window.innerWidth <= 900) toggleSidebar();

    renderTabla($('#search').value);
  });

  // Botones principales
  $('#btn-nueva').addEventListener('click', () => { limpiarFormulario(); abrirModal(); });
  $('#btn-refresh').addEventListener('click', cargarDatos);

  // Modales
  $('#btn-close').addEventListener('click', cerrarModal);
  $('#btn-cancel').addEventListener('click', cerrarModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  
  $('#btn-close-detalle').addEventListener('click', cerrarDetalle);
  $('#btn-cerrar-detalle').addEventListener('click', cerrarDetalle);
  $('#modal-detalle').addEventListener('click', (e) => { if (e.target.id === 'modal-detalle') cerrarDetalle(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').classList.contains('hidden')) cerrarModal();
      if (!$('#modal-detalle').classList.contains('hidden')) cerrarDetalle();
    }
  });

  // Formulario
  $('#form-gestion').addEventListener('submit', guardar);

  // Buscador de texto
  $('#search').addEventListener('input', (e) => renderTabla(e.target.value));

  // Delegación de eventos (Editar, Eliminar, Detalle)
  $('#tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (btn) {
      const { action, id } = btn.dataset;
      if (action === 'editar') cargarEnFormulario(id);
      if (action === 'eliminar') eliminar(id);
      return;
    }
    const celda = e.target.closest('td.clickable');
    if (celda) abrirDetalle(celda.dataset.id);
  });

  // Iniciar
  cargarDatos();
});
