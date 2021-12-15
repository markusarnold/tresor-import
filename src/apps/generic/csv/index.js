import Big from 'big.js';
import { validateActivity } from '@/helper';
import { FIELD_MAP } from './utils';
import { ParqetParserError } from './errors';
import { DateTime } from 'luxon';

/**
 * Checks if document can be parsed by generic csv parser
 *
 * @param {Importer.page[]} doc - file to be parsed
 * @param {string} extension - extension of file to be parsed
 * @returns {boolean} - true if can be parsed, false otherwise
 */
export const canParseDocument = (doc, extension) =>
  extension === 'csv' &&
  doc.flat().some(line => {
    const l = line.toLowerCase();
    // check if all required fields are present
    return (
      (l.includes('datetime') || l.includes('date')) &&
      l.includes('price') &&
      l.includes('shares') &&
      l.includes('tax') &&
      l.includes('fee') &&
      l.includes('type') &&
      (l.includes('holding') || l.includes('isin') || l.includes('wkn'))
    );
  });

/**
 * Parses document content
 *
 * @param content
 * @returns {{activities: object[], status: number}}
 */
export const parsePages = content => {
  let activities = [];
  let headers = [];

  try {
    headers = content.splice(0, 1)[0].split(';');
  } catch (error) {
    // Could not extract headers from CSV file
    return {
      activities,
      status: 3, // Critical unforeseen error during parsing, abort.
    };
  }

  if (content.length === 0) {
    return {
      activities,
      status: 5, // No activities found for a valid document
    };
  }

  const lowerCaseHeaders = headers.map(header => header.toLowerCase().trim());

  // parse every content row
  // return empty activity array and status code on error
  for (let i = 0; i < content.length; i++) {
    // try catch for error here --> the further we throw, the better
    // --> just doing it here, to show what we could do with custom errors
    //     possibly better: catch error in function calling 'parsePages'
    try {
      const activity = parseRow(lowerCaseHeaders, content[i]);
      if (activity) activities.push(activity);
    } catch (error) {
      console.error(
        `${error.name} in row [${i}] reading [${error.data.input}]: ${error.message}`
      );
      return {
        activities: [],
        status: error.data.status,
      };
    }
  }

  return {
    activities,
    status: 0,
  };
};

/**
 *
 * @param {string[]} lowerCaseHeaders
 * @param {string} row
 * @returns {Importer.Activity | undefined}
 */
const parseRow = (lowerCaseHeaders, row) => {
  const values = row.split(';');
  const activity = {};

  // add default values to activity regardless if it is present in CSV
  FIELD_MAP.forEach(o => {
    const { fieldName, defaultValue } = o;
    if (defaultValue) activity[fieldName] = defaultValue;
  });

  // for every column, check if column is in list of accepted fields (FIELD_MAP)
  // if field is not present --> ignore
  // else grab activity fieldName and parserFunc from mapper
  // assign parsed value accordingly
  for (let i = 0; i < lowerCaseHeaders.length; i++) {
    const key = lowerCaseHeaders[i];
    if (FIELD_MAP.has(key)) {
      const { fieldName, parserFunc, defaultValue } = FIELD_MAP.get(key);
      let params = [values[i].trim()];
      if (defaultValue) params = [...params, defaultValue];
      const parsedValue = parserFunc(...params);
      // only assign defined values --> ignore undefined values
      if (parsedValue !== undefined) activity[fieldName] = parsedValue;
    }
  }

  if (!activity.datetime && !activity.date) {
    // return status code 7 (invalid document) --> might need a different code here
    throw new ParqetParserError(
      'One of datetime, or date must be supplied',
      JSON.stringify(activity),
      7
    );
  }

  if (!activity.datetime && activity.date && activity.time) {
    activity.datetime = DateTime.fromFormat(
      `${activity.date} ${activity.time}`,
      'yyyy-MM-dd HH:mm:ss'
    )
      .toUTC()
      .toISO();
  }

  if (!activity.holding && !activity.isin && !activity.wkn) {
    // return status code 7 (invalid document) --> might need a different code here
    throw new ParqetParserError(
      'One of holding, isin, or wkn must be supplied',
      JSON.stringify(activity),
      7
    );
  }

  if (!!activity.price && !!activity.shares) {
    const p = new Big(activity.price);
    const s = new Big(activity.shares);
    activity.amount = +p.times(s);
  }

  return validateActivity(activity);
};

export const parsingIsTextBased = () => true;
