/**
 * Lógica principal de la SPA:
 *  - Vista principal: LISTA (tabla)
 *  - Formulario dentro de un MODAL
 *  - Modal de DETALLE al hacer clic en una celda
 *  - CRUD contra Google Apps Script
 *  - Búsqueda inteligente multi-palabra (sin orden estricto)
 */

const $ = (sel) => document.querySelector(sel);

const state = {
  registros: [],
  editando: false
};

/* ==================== UTILIDADES ==================== */

function showToast(msg, tipo = 'success') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${tipo}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function abrirModal() {
  $('#modal').classList.remove('hidden');
}

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
  const requeridos = [
    'descripcion', 'empresa', 'valor', 'paquete',
    'visto', 'documento', 'nombre', 'especialidad'
  ];
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
  return n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ==================== BÚSQUEDA INTELIGENTE ==================== */

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function coincideBusqueda(registro, termino) {
  const palabras = normalizar(termino).split(' ').filter(Boolean);
  if (palabras.length === 0) return true;

  const campos = [
    normalizar(registro.cups),
    normalizar(registro.descripcion),
    normalizar(registro.empresa),
    normalizar(registro.especialidad)
  ].join(' ');

  return palabras.every(p => campos.includes(p));
}

/* ==================== RENDER DE LA TABLA ==================== */

function renderTabla(filtro = '') {
  const tbody = $('#tbody');
  const datos = state.registros.filter(r => coincideBusqueda(r, filtro));

  if (datos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty">No se encontraron registros.</td>
      </tr>`;
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

/* ==================== MODAL DE DETALLE ==================== */

function abrirDetalle(rowId) {
  const r = state.registros.find(x => String(x.rowId) === String(rowId));
  if (!r) return;

  const campos = [
    ['Código CUPS',        r.cups],
    ['Descripción',        r.descripcion],
    ['Especialidad',       r.especialidad],
    ['Empresa',            r.empresa],
    ['Valor',              formatoMoneda(r.valor)],
    ['Paquete Qx',         r.paquete],
    ['Visto bueno por',    r.visto],
    ['Documento paciente', r.documento],
    ['Nombre paciente',    r.nombre]
  ];

  $('#detalle-contenido').innerHTML = campos.map(([label, valor]) => `
    <dt>${label}</dt>
    <dd>${escapeHtml(valor) || '—'}</dd>
  `).join('');

  $('#detalle-title').textContent = `Detalle de ${r.nombre || 'la gestión'}`;
  $('#modal-detalle').classList.remove('hidden');
}

function cerrarDetalle() {
  $('#modal-detalle').classList.add('hidden');
}

/* ==================== CRUD ==================== */

async function cargarDatos() {
  try {
    const res = await API.listar();
    state.registros = res.data || [];
    renderTabla($('#search').value);
  } catch (err) {
    showToast('Error al cargar datos: ' + err.message, 'error');
    $('#tbody').innerHTML = `
      <tr>
        <td colspan="10" class="empty">
          ⚠️ No se pudo conectar con la API. Revisa la consola (F12).
        </td>
      </tr>`;
  }
}

async function guardar(e) {
  e.preventDefault();

  const data = {
    cups:         $('#cups').value.trim(),
    descripcion:  $('#descripcion').value.trim(),
    empresa:      $('#empresa').value.trim(),
    valor:        $('#valor').value.trim(),
    paquete:      $('#paquete').value.trim(),
    visto:        $('#visto').value.trim(),
    documento:    $('#documento').value.trim(),
    nombre:       $('#nombre').value.trim(),
    especialidad: $('#especialidad').value.trim()
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

  $('#row-id').value       = r.rowId;
  $('#cups').value         = r.cups || '';
  $('#descripcion').value  = r.descripcion || '';
  $('#empresa').value      = r.empresa || '';
  $('#valor').value        = r.valor || '';
  $('#paquete').value      = r.paquete || '';
  $('#visto').value        = r.visto || '';
  $('#documento').value    = r.documento || '';
  $('#nombre').value       = r.nombre || '';
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

  // Botones del header
  $('#btn-nueva').addEventListener('click', () => {
    limpiarFormulario();
    abrirModal();
  });
  $('#btn-refresh').addEventListener('click', cargarDatos);

  // Modal Nueva Gestión
  $('#btn-close').addEventListener('click', cerrarModal);
  $('#btn-cancel').addEventListener('click', cerrarModal);
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') cerrarModal();
  });

  // Modal Detalle
  $('#btn-close-detalle').addEventListener('click', cerrarDetalle);
  $('#btn-cerrar-detalle').addEventListener('click', cerrarDetalle);
  $('#modal-detalle').addEventListener('click', (e) => {
    if (e.target.id === 'modal-detalle') cerrarDetalle();
  });

  // ESC cierra cualquier modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#modal').classList.contains('hidden')) cerrarModal();
      if (!$('#modal-detalle').classList.contains('hidden')) cerrarDetalle();
    }
  });

  // Formulario
  $('#form-gestion').addEventListener('submit', guardar);

  // Búsqueda en tiempo real
  $('#search').addEventListener('input', (e) => renderTabla(e.target.value));

  // Delegación de eventos en la tabla
  $('#tbody').addEventListener('click', (e) => {
    // Botones de acción (Editar / Eliminar) tienen prioridad
    const btn = e.target.closest('button[data-action]');
    if (btn) {
      const { action, id } = btn.dataset;
      if (action === 'editar')   cargarEnFormulario(id);
      if (action === 'eliminar') eliminar(id);
      return;
    }

    // Clic en cualquier celda clicable → abrir detalle
    const celda = e.target.closest('td.clickable');
    if (celda) {
      abrirDetalle(celda.dataset.id);
    }
  });

  // Carga inicial
  cargarDatos();
});
