const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetsManager {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Inicializa autenticação com Google Sheets
   */
  async initialize(credentialsPath) {
    try {
      // Ler credenciais
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      // Criar cliente de autenticação
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Criar cliente da API Sheets
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      return { success: true };
    } catch (error) {
      console.error('Erro ao inicializar Google Sheets:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter dados de uma planilha
   */
  async getData(spreadsheetId, range) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets não inicializado');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return {
        success: true,
        data: response.data.values || [],
      };
    } catch (error) {
      console.error('Erro ao obter dados:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Atualizar dados em uma planilha
   */
  async updateData(spreadsheetId, range, values) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets não inicializado');
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
      });

      return {
        success: true,
        updatedCells: response.data.updatedCells,
      };
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Adicionar dados ao final de uma planilha
   */
  async appendData(spreadsheetId, range, values) {
    try {
      if (!this.sheets) {
        throw new Error('Google Sheets não inicializado');
      }

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
      });

      return {
        success: true,
        updatedCells: response.data.updates.updatedCells,
      };
    } catch (error) {
      console.error('Erro ao adicionar dados:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obter números de telefone de uma coluna específica
   */
  async getPhoneNumbers(spreadsheetId, sheetName, column) {
    try {
      const range = `${sheetName}!${column}:${column}`;
      const result = await this.getData(spreadsheetId, range);

      if (!result.success) {
        return result;
      }

      // Processar números (pular cabeçalho, normalizar)
      const numbers = result.data
        .slice(1) // Pular primeira linha (cabeçalho)
        .map(row => row[0])
        .filter(num => num && num.trim())
        .map(num => this.normalizePhoneNumber(num));

      // Remover duplicatas
      const uniqueNumbers = [...new Set(numbers)];

      return {
        success: true,
        numbers: uniqueNumbers,
      };
    } catch (error) {
      console.error('Erro ao obter números:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Normalizar número de telefone
   */
  normalizePhoneNumber(phone) {
    // Remover tudo que não é dígito
    const digits = phone.toString().replace(/\D/g, '');

    // Se já tem DDI 55, retornar
    if (digits.startsWith('55')) {
      return digits;
    }

    // Adicionar DDI 55
    return '55' + digits;
  }
}

module.exports = SheetsManager;

