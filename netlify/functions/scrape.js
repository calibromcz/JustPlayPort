import { scrapeStorePrice } from '../../src/server/scraperCore.js'

export async function handler(event, context) {
  // Gestione preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    }
  }

  const gameName = event.queryStringParameters?.gameName || ''
  const storeName = event.queryStringParameters?.storeName || ''

  if (!gameName || !storeName) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Parametri gameName e storeName mancanti',
      }),
    }
  }

  try {
    const result = await scrapeStorePrice(gameName, storeName)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: err.message || 'Errore interno scraping',
      }),
    }
  }
}
