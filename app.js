// URL CSV PUBLICADO de tu hoja TransaccionesAhorros
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBWbtz-r2EGTQd76o3XNyPZvdQLzugsli0MV5u-TouM5Hx8pzlReiLNByH7OOwq0tGMZkloURfN6Uu/pub?gid=0&single=true&output=csv";

// Datos del negocio
const NEGOCIO = {
  nombre: "Inversiones y Servicios para el desarrollo de Santiago Puringla",
  direccion: "Santiago Puringla, La Paz, Bo. El Centro. Honduras.",
  telefono: "2774-5283",
  whatsapp: "9762-4974",
  email: "puringlense@gmail.com"
};
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

// Formatea valores monetarios con símbolo L, comas de miles y dos decimales
function formatoMoneda(valor) {
  if (valor === undefined || valor === null || valor === '') return 'L 0.00';
  let num = parseFloat(valor.toString().replace(/[^\d.-]/g, ''));
  if (isNaN(num)) num = 0;
  // Formato con comas de miles y dos decimales
  return 'L ' + num.toLocaleString('es-HN', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Filtra por rango de fecha usando el campo FechaHora
function filtrarPorFechas(data, fechaInicial, fechaFinal) {
  if (!fechaInicial && !fechaFinal) return data;
  // Se espera que FechaHora esté en formato "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss"
  return data.filter(row => {
    if (!row['FechaHora']) return false;
    const fecha = row['FechaHora'].slice(0,10); // Solo la fecha
    if (fechaInicial && fecha < fechaInicial) return false;
    if (fechaFinal && fecha > fechaFinal) return false;
    return true;
  });
}

document.getElementById('consultaForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const cliente = document.getElementById('cliente').value.trim();
    const fechaInicial = document.getElementById('fecha-inicial').value;
    const fechaFinal = document.getElementById('fecha-final').value;

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

            // Filtrar por cliente y Estado Activo
            let filtrados = data.filter(row =>
                row['Cliente'] === cliente && row['Estado'] === 'Activo'
            );

            // Filtrar por fechas si se seleccionan
            filtrados = filtrarPorFechas(filtrados, fechaInicial, fechaFinal);

            filtrados.forEach((row, idx) => row._rowNum = idx + 2);
            filtrados.sort((a, b) => b._rowNum - a._rowNum);

            resultadosFiltrados = filtrados;
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
            No se encontraron transacciones para este cliente con estado "Activo" en el rango de fechas seleccionado.
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
                let valor = formatoMoneda(fila[campo]);
                html += `<td class="moneda-td"><span class="moneda-simbolo">L</span><span class="moneda-num">${valor.slice(2)}</span></td>`;
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
    doc.setFontSize(14);
    doc.text(NEGOCIO.nombre, 14, 14);
    doc.setFontSize(10);
    doc.text(`Dirección: ${NEGOCIO.direccion}`, 14, 22);
    doc.text(`Tel: ${NEGOCIO.telefono} | Whatsapp: ${NEGOCIO.whatsapp} | Email: ${NEGOCIO.email}`, 14, 28);
    doc.setFontSize(13);
    doc.text('Reporte de Transacciones', 14, 38);

    let rows = resultadosFiltrados.map(fila =>
        CAMPOS.map(c =>
            MONEDA_CAMPOS.includes(c) ? formatoMoneda(fila[c]) : (fila[c] ?? '')
        )
    );

    doc.autoTable({
        head: [CAMPOS],
        body: rows,
        startY: 44,
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

window.mostrarPagina = mostrarPagina;
