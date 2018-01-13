import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import { compareArrays, constructMessage, fetchJSON, sendSlackMessage } from '../helpersV2';

const API_URL = 'https://api.binance.com/api/v1/ticker/allPrices';
const EXCHANGE = 'Binance';
const INTERVAL = 10000;

interface IData {
  symbol: string;
}

function handleData(newData: IData[], latestData: IData[]): string[] {
  const diffs: string[] = compareArrays(latestData, newData, 'symbol');
  const mergedDiffs: string[] = [];

  if (!get(newData, '[0].symbol')) throw new Error(`An error occurred while fetching data from ${EXCHANGE}.`);
  // Skip if nothing changed
  if (isEmpty(diffs)) return;

  // Remove duplicates from the diff.
  for (let diff of diffs) {
    diff = diff.replace(new RegExp('BTC' + '$'), '');
    diff = diff.replace(new RegExp('ETH' + '$'), '');
    diff = diff.replace(new RegExp('BNB' + '$'), '');

    if (mergedDiffs.includes(diff) === false) mergedDiffs.push(diff);
  }

  return mergedDiffs;
}

// Send the slack notification
async function sendResponse(diffs: string[]): Promise<void> {
  if (isEmpty(diffs)) {
    console.trace(`Nothing changed on ${EXCHANGE}.`);
    return;
  }

  const message = constructMessage(diffs, EXCHANGE, (currency) => {
    return 'https://www.binance.com/tradeDetail.html?symbol=' + currency + '_BTC';
  });

  await sendSlackMessage(message);
  console.log(`Slack notification sent successfully for ${EXCHANGE}:`, diffs);
}

export function init() {
  let latestData;

  setInterval(async () => {
    try {
      const data: IData[] = await fetchJSON(API_URL);
      if (!data) return latestData = data;
      const diffs: string[] = handleData(data, latestData);

      await sendResponse(diffs);
    } catch (err) {
      console.error(err);
    }
  }, INTERVAL);
}