/**
 * Capa de comunicación con Google Apps Script.
 * Usa fetch con Content-Type: text/plain para evitar preflight CORS,
 * ya que Apps Script no maneja bien las peticiones preflight OPTIONS.
 */
const API = {
  async _request(method, params = {}) {
    try {
      let url = CONFIG.API_URL;
      const options = { method };

      if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        url += '?' + qs;
      } else {
        options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
        options.body = JSON.stringify(params);
      }

      const res = await fetch(url, options);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.error('[API Error]', err);
      throw err;
    }
  },

  listar() {
    return this._request('GET', { action: 'listar' });
  },

  crear(registro) {
    return this._request('POST', { action: 'crear', ...registro });
  },

  actualizar(registro) {
    return this._request('POST', { action: 'actualizar', ...registro });
  },

  eliminar(rowId) {
    return this._request('POST', { action: 'eliminar', rowId });
  }
};
