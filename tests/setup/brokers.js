import { findImplementation } from '@/index';

export function validateAllSamples(implementation, samples) {
  describe('Validate all', () => {
    test('Can all documents parsed with implementation', () => {
      samples.forEach(pages => {
        expect(implementation.canParseDocument(pages, 'pdf')).toEqual(true);
      });
    });

    test('Can identify the expected implementation from document', () => {
      samples.forEach(pages => {
        const implementations = findImplementation(pages, 'pdf');

        expect(implementations.length).toEqual(1);
        expect(implementations[0]).toEqual(implementation);
      });
    });
  });
}
