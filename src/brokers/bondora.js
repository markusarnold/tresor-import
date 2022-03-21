import {
  createActivityDateTime,
  parseGermanNum,
  validateActivity,
} from '@/helper';

const isGowGrowStatement = (/** @type {Importer.Page} */ contents) => {
  return (
    contents.some(line => line.includes('Referenznummer')) &&
    contents.some(line => line.includes('Zusammenfassung')) &&
    contents.some(line => line.includes('Go & Grow Zinsen'))
  );
};

const parseGowGrowStatement = (/** @type {Importer.Page} */ contents) => {
  const startLineNumber = contents.indexOf('Guthaben') + 1;
  const holdingName = contents[startLineNumber - 6];

  const activities = [];
  for (
    let lineNumber = startLineNumber;
    lineNumber < contents.length;
    lineNumber += 4
  ) {
    const amount = parseGermanNum(contents[lineNumber + 2]);

    /** @type {Partial<Importer.Activity>} */
    let activity = {
      broker: 'bondora',
      company: holdingName,
      shares: amount,
      amount,
      price: 1,
      fee: 0,
      tax: 0,
    };

    switch (contents[lineNumber + 1]) {
      case 'Überweisen':
        activity.type = 'TransferIn';
        break;

      case 'Go & Grow Zinsen':
        activity.type = 'Interest';
        break;

      default:
        // Unknown type.
        continue;
    }

    [activity.date, activity.datetime] = createActivityDateTime(
      contents[lineNumber],
      '00:00'
    );

    activities.push(validateActivity(activity, true));
  }

  return activities;
};

export const canParseDocument = (
  /** @type {Importer.Page[]} */ pages,
  /** @type {string} */ extension
) => {
  const firstPageContent = pages[0];

  return extension === 'pdf' && isGowGrowStatement(firstPageContent);
};

export const parsePages = (/** @type {Importer.Page[]} */ pages) => {
  const content = pages.flat();
  let activities = [];

  if (isGowGrowStatement(content)) {
    activities = parseGowGrowStatement(content);
  } else {
    return {
      activities: undefined,
      status: 5,
    };
  }

  return {
    activities,
    status: 0,
  };
};

export const parsingIsTextBased = () => true;
