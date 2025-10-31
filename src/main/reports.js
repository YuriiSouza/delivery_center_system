import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import SheetsManager from './sheets.js';
/**
 * Classe responsável por:
 * - Acessar o sistema web com Selenium
 * - Baixar relatórios
 * - Ler dados dos relatórios
 * - Atualizar o Google Sheets
 */
class UpdateReports {
  constructor({
    downloadDir = './downloads',
    credentialsPath = './credentials.json',
    spreadsheetId,
    sheetRange = 'Relatorio!A2',
  }) {
    this.downloadDir = path.resolve(downloadDir);
    this.credentialsPath = credentialsPath;
    this.spreadsheetId = spreadsheetId;
    this.sheetRange = sheetRange;
    this.driver = null;
    this.sheetsManager = new SheetsManager();
  }

  /**
   * Inicializa a automação e autenticação do Google
   */
  async initialize() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }

    // Inicializa Google Sheets
    const authResult = await this.sheetsManager.initialize(this.credentialsPath);
    if (!authResult.success) throw new Error('Erro ao autenticar Google Sheets');

    // Inicializa Selenium
    this.driver = await this.createDriver();
  }

  /**
   * Cria o driver Selenium configurado para download automático
   */
  async createDriver() {
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.setUserPreferences({
      'download.default_directory': this.downloadDir,
      'download.prompt_for_download': false,
      'download.directory_upgrade': true,
      'safebrowsing.enabled': true,
    });

    return await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  }

  /**
   * Faz login no sistema e baixa o relatório
   */
  async downloadReport({ url, username, password, selectors }) {
    console.log('🌐 Acessando sistema...');
    await this.driver.get(url);

    // Login
    await this.driver.wait(until.elementLocated(By.css(selectors.username)), 10000);
    await this.driver.findElement(By.css(selectors.username)).sendKeys(username);
    await this.driver.findElement(By.css(selectors.password)).sendKeys(password);
    await this.driver.findElement(By.css(selectors.loginButton)).click();

    // Espera o carregamento e botão de download
    await this.driver.wait(until.elementLocated(By.css(selectors.downloadButton)), 15000);
    await this.driver.findElement(By.css(selectors.downloadButton)).click();

    console.log('⏳ Aguardando download...');
    await new Promise(r => setTimeout(r, 10000)); // ajuste conforme a velocidade da rede
  }

  /**
   * Lê o arquivo Excel mais recente baixado
   */
  readLatestReport() {
    const files = fs.readdirSync(this.downloadDir)
      .filter(f => f.endsWith('.csv'))
      .map(f => ({ name: f, time: fs.statSync(path.join(this.downloadDir, f)).mtime }))
      .sort((a, b) => b.time - a.time);

    if (!files.length) throw new Error('Nenhum relatório encontrado.');

    const latestFile = path.join(this.downloadDir, files[0].name);
    console.log(`📄 Lendo relatório: ${latestFile}`);

    const workbook = xlsx.readFile(latestFile);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Remove cabeçalho e retorna linhas
    return data.slice(1);
  }

  /**
   * Envia dados para o Google Sheets
   */
  async updateGoogleSheets(rows) {
    console.log('📤 Enviando dados para o Google Sheets...');
    const result = await this.sheetsManager.appendData(this.spreadsheetId, this.sheetRange, rows);
    if (!result.success) throw new Error(result.error);
    console.log('✅ Dados enviados com sucesso!');
  }

  /**
   * Executa todo o fluxo de atualização
   */
  async run({ url, username, password, selectors }) {
    try {
      console.log('🚀 Iniciando atualização de relatórios...');
      await this.initialize();
      await this.downloadReport({ url, username, password, selectors });
      const data = this.readLatestReport();
      await this.updateGoogleSheets(data);
      console.log('🎯 Atualização concluída com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar relatórios:', error);
    } finally {
      if (this.driver) {
        await this.driver.quit();
      }
    }
  }
}

export default UpdateReports;
