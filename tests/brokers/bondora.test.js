import * as bondora from '../../src/brokers/bondora';
import { validateAllSamples } from '../setup/brokers';
import Big from 'big.js';
import { allSamples, statementSamples } from './__mocks__/bondora';

describe('Source: Bondora', () => {
  let consoleErrorSpy;

  validateAllSamples(bondora, allSamples, 'bondora');

  describe('Statements', () => {
    test('an parse document: 2021_two_sided', () => {
      const activities = bondora.parsePages(statementSamples[0]).activities;

      expect(activities.length).toEqual(36);

      expect(activities.slice(0, 3)).toEqual([
        {
          broker: 'bondora',
          type: 'TransferIn',
          date: '2021-11-27',
          datetime: '2021-11-26T23:00:00.000Z',
          company: 'Zusätzliches Einkommen',
          shares: 500,
          price: 1,
          amount: 500,
          fee: 0,
          tax: 0,
        },
        {
          broker: 'bondora',
          type: 'TransferIn',
          date: '2021-11-27',
          datetime: '2021-11-26T23:00:00.000Z',
          company: 'Zusätzliches Einkommen',
          shares: 500,
          price: 1,
          amount: 500,
          fee: 0,
          tax: 0,
        },
        {
          broker: 'bondora',
          type: 'Interest',
          date: '2021-11-28',
          datetime: '2021-11-27T23:00:00.000Z',
          company: 'Zusätzliches Einkommen',
          shares: 0.18,
          price: 1,
          amount: 0.18,
          fee: 0,
          tax: 0,
        },
      ]);

      // First activity from page 2
      expect(activities[16]).toEqual({
        broker: 'bondora',
        type: 'Interest',
        date: '2021-12-12',
        datetime: '2021-12-11T23:00:00.000Z',
        company: 'Zusätzliches Einkommen',
        shares: 0.18,
        price: 1,
        amount: 0.18,
        fee: 0,
        tax: 0,
      });

      expect(1006.1).toEqual(
        +activities.reduce(
          (previousValue, activity) => previousValue.plus(Big(activity.amount)),
          Big(0)
        )
      );
    });
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
});
