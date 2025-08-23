// Reemplaza con el ID de tu Google Sheet
const SHEET_ID = '1n16PgN8ss5IxLkvDwukhYH1_Rvj0bx3qAmCt7wapvV8';
const SHEET_NAME = 'TransaccionesAhorros';

// Campos a mostrar
const CAMPOS = [
  'idTransacción', 'FechaHora', 'Cliente', 'NombreCliente',
  'Cuenta', 'Monto', 'Tipo', 'Caja', 'Sucursal',
  'Observaciones', 'Interes', 'Saldo'
];

const REGISTROS_POR_PAGINA = 10;
let resultadosFiltrados = []; // Para paginación y export

document.getElementById('consultaForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const cliente = document.getElementById('cliente').value.trim();
  if (!cliente) return;

  document.getElementById('resultados').innerHTML = '<p>Cargando...</p>';
  document.getElementById('paginacion').innerHTML = '';

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text.match(/(?<=\{)(.|\n)+(?=\}\);)/)[0]);

    const cols = json.table.cols.map(c => c.label);
    const rows = json.table.rows.map(r => r.c);

    resultadosFiltrados = [];
    for (let i = 0; i < rows.length; i++) {
      let fila = {};
      for (let j = 0; j < cols.length; j++) {
        fila[cols[j]] = rows[i][j] ? rows[i][j].v : '';
      }
      if (fila['Cliente'] == cliente && fila['Estado'] == 'Activo') {
        fila._rowNum = i + 2;
        resultadosFiltrados.push(fila);
      }
    }

    resultadosFiltrados.sort((a, b) => b._rowNum - a._rowNum);

    mostrarPagina(1);

  } catch (err) {
    document.getElementById('resultados').innerHTML = '<p>Error al consultar los datos.</p>';
    console.error(err);
  }
});

// Paginación
function mostrarPagina(numPagina) {
  const totalPaginas = Math.ceil(resultadosFiltrados.length / REGISTROS_POR_PAGINA);
  if (resultadosFiltrados.length === 0) {
    document.getElementById('resultados').innerHTML = '<p>No se encontraron transacciones para este cliente con estado "Activo".</p>';
    document.getElementById('paginacion').innerHTML = '';
    return;
  }
  // Render tabla
  let html = `<table class="table-financiera"><thead><tr>`;
  CAMPOS.forEach(campo => html += `<th>${campo}</th>`);
  html += `</tr></thead><tbody>`;
  const inicio = (numPagina - 1) * REGISTROS_POR_PAGINA;
  resultadosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA).forEach(fila => {
    html += `<tr>`;
    CAMPOS.forEach(campo => {
      html += `<td>${fila[campo] ?? ''}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('resultados').innerHTML = html;

  // Render paginación
  let pagHtml = `<div class="pagination">`;
  for (let i = 1; i <= totalPaginas; i++) {
    pagHtml += `<button class="${i === numPagina ? 'active' : ''}" onclick="mostrarPagina(${i})">${i}</button>`;
  }
  pagHtml += `</div>`;
  document.getElementById('paginacion').innerHTML = pagHtml;
}

// Exportar PDF
document.getElementById('btn-pdf').addEventListener('click', function () {
  if (resultadosFiltrados.length === 0) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  // Título
  doc.setFontSize(16);
  doc.text('Reporte de Transacciones', 14, 14);

  // Tabla
  let rows = resultadosFiltrados.map(fila => CAMPOS.map(c => fila[c] ?? ''));
  doc.autoTable({
    head: [CAMPOS],
    body: rows,
    startY: 24,
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 }
  });

  doc.save('transacciones.pdf');
});

// Exportar Excel
document.getElementById('btn-excel').addEventListener('click', function () {
  if (resultadosFiltrados.length === 0) return;
  const ws_data = [
    CAMPOS,
    ...resultadosFiltrados.map(fila => CAMPOS.map(c => fila[c] ?? ''))
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
  XLSX.writeFile(wb, 'transacciones.xlsx');
});

// Soporte para jsPDF autoTable (CDN)
(function loadAutoTable() {
  if (!window.jspdf || window.jspdf.autoTable) return;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';
  script.onload = () => {};
  document.head.appendChild(script);
})();

// Hacer paginación global
window.mostrarPagina = mostrarPagina;
