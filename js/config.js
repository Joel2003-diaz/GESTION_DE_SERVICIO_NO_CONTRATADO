/**
 * Configuración global del sistema.
 * Reemplace API_URL con la URL de su implementación de Google Apps Script.
 */
const CONFIG = {
  // URL del Web App de Google Apps Script (termina en /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbw-XAPza_WBcWtC8h3rSmhHDlILbtdPGw7LyCib_Qp4A0PJDxfgPkrotaFOG-GJeAQh/exec',

  // Nombres de las columnas en Google Sheets (en orden)
  COLUMNS: [
    'rowId',
    'cups',
    'descripcion',
    'empresa',
    'valor',
    'paquete',
    'visto',
    'documento',
    'nombre',
    'especialidad'
  ]
};
