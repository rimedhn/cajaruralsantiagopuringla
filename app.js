// URL CSV PUBLICADO de tu hoja TransaccionesAhorros
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBWbtz-r2EGTQd76o3XNyPZvdQLzugsli0MV5u-TouM5Hx8pzlReiLNByH7OOwq0tGMZkloURfN6Uu/pub?gid=0&single=true&output=csv";


// Orden y campos a mostrar
const CAMPOS = [
  'idTransacción', 'FechaHora', 'Cliente', 'NombreCliente',
  'Cuenta', 'Tipo', 'Monto', 'Interes', 'Saldo',
  'Caja', 'Sucursal', 'Observaciones'
];

const MONEDA_CAMPOS = ['Monto', 'Interes', 'Saldo'];
const REGISTROS_POR_PAGINA = 10;
let resultadosFiltrados = [];
let paginaActual = 1;

// Formatea valores monetarios con símbolo L y dos decimales
function formatoMoneda(valor) {
  if (valor === undefined || valor === null || valor === '') return 'L 0.00';
  let num = parseFloat(valor.toString().replace(/[^\d.-]/g, ''));
  if (isNaN(num)) num = 0;
  return `L ${num.toFixed(2)}`;
}

document.getElementById('consultaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const cliente = document.getElementById('cliente').value.trim();
    if (!cliente) return;

    document.getElementById('resultados').innerHTML = `
      <div class="text-center">
        <div class="spinner-border"></div> Buscando...
      </div>`;
    document.getElementById('paginacion').innerHTML = '';

    fetch(SHEET_CSV_URL)
        .then(response => {
            if (!response.ok) throw new Error('No se pudo acceder a los datos');
            return response.text();
        })
        .then(csv => {
            const data = Papa.parse(csv, { header: true }).data;

            resultadosFiltrados = data.filter(row =>
                row['Cliente'] === cliente && row['Estado'] === 'Activo'
            );

            resultadosFiltrados.forEach((row, idx) => row._rowNum = idx + 2);
            resultadosFiltrados.sort((a, b) => b._rowNum - a._rowNum);

            paginaActual = 1;
            mostrarPagina(paginaActual);

        })
        .catch(error => {
            document.getElementById('resultados').innerHTML = `
              <div class="alert alert-warning text-center">
                Error al consultar los datos. Intente nuevamente más tarde.
              </div>`;
        });
});

function mostrarPagina(numPagina) {
    const totalPaginas = Math.ceil(resultadosFiltrados.length / REGISTROS_POR_PAGINA);
    if (resultadosFiltrados.length === 0) {
        document.getElementById('resultados').innerHTML = `
          <div class="alert alert-danger text-center">
            No se encontraron transacciones para este cliente con estado "Activo".
          </div>`;
        document.getElementById('paginacion').innerHTML = '';
        return;
    }

    // Render tabla estilizada
    let html = `<table class="table-financiera"><thead><tr>`;
    CAMPOS.forEach(campo => {
        let align = MONEDA_CAMPOS.includes(campo) ? ' class="moneda-th"' : '';
        html += `<th${align}>${campo}</th>`;
    });
    html += `</tr></thead><tbody>`;
    const inicio = (numPagina - 1) * REGISTROS_POR_PAGINA;
    resultadosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA).forEach(fila => {
        html += `<tr>`;
        CAMPOS.forEach(campo => {
            if (MONEDA_CAMPOS.includes(campo)) {
                html += `<td class="moneda-td">${formatoMoneda(fila[campo])}</td>`;
            } else {
                html += `<td>${fila[campo] ?? ''}</td>`;
            }
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
    paginaActual = numPagina;
}

// Exportar PDF
document.getElementById('btn-pdf').addEventListener('click', function () {
    if (resultadosFiltrados.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Reporte de Transacciones', 14, 14);

    let rows = resultadosFiltrados.map(fila =>
        CAMPOS.map(c =>
            MONEDA_CAMPOS.includes(c) ? formatoMoneda(fila[c]) : (fila[c] ?? '')
        )
    );

    doc.autoTable({
        head: [CAMPOS],
        body: rows,
        startY: 24,
        styles: { fontSize: 9, halign: 'right' },
        columnStyles: MONEDA_CAMPOS.reduce((acc, campo) => {
            acc[CAMPOS.indexOf(campo)] = { halign: 'right' };
            return acc;
        }, {})
    });

    doc.save('transacciones.pdf');
});

// Exportar Excel
document.getElementById('btn-excel').addEventListener('click', function () {
    if (resultadosFiltrados.length === 0) return;
    const ws_data = [
        CAMPOS,
        ...resultadosFiltrados.map(fila =>
          CAMPOS.map(campo =>
            MONEDA_CAMPOS.includes(campo) ? formatoMoneda(fila[campo]) : (fila[campo] ?? '')
          )
        )
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Alinea a la derecha los campos de moneda en Excel
    MONEDA_CAMPOS.forEach(campo => {
        const colIdx = CAMPOS.indexOf(campo);
        for (let i = 1; i <= resultadosFiltrados.length; i++) {
            const cell = XLSX.utils.encode_cell({ c: colIdx, r: i });
            if (ws[cell]) ws[cell].s = { alignment: { horizontal: 'right' } };
        }
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    XLSX.writeFile(wb, 'transacciones.xlsx');
});

// jsPDF autoTable CDN loader
(function loadAutoTable() {
    if (!window.jspdf || window.jspdf.autoTable) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js';
    document.head.appendChild(script);
})();

// Hacer paginación global
window.mostrarPagina = mostrarPagina;
