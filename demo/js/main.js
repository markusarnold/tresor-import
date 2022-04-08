import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale';
import parse from 'date-fns/parse';
// Use the webpack version to ensure, that the published version works fine and not only the src/ one.
import { parseActivitiesFromPages, parseFile } from '../bundle/tresor-import';
//import { parseActivitiesFromPages, parseFile } from '../../src/index.js';
// To use the published version, uncomment the following line after running: npm run build
// import { parseFile, parseActivitiesFromPages } from '../../dist/tresor-import';

new Vue({
  el: '#app',
  data: {
    errors: [],
    activities: [],
    jsonInputActive: false,
    jsonContent: '',
    jsonExtension: 'pdf',
  },
  computed: {
    // a computed getter
    remappedActivities() {
      /* Parquet Activity format
      {
        "broker": "comdirect",
        "type": "Buy",
        "fee": 12.4,
        "tax": 0,
        "isin": "US5949181045",
        "wkn": "870747",
        "company": "Microsoft Corp.",
        "amount": 568.2,
        "shares": 2,
        "price": 284.1,
        "date": "2022-01-05",
        "datetime": "2022-01-05T14:43:00.000Z"
        },
      };
      */
      return this.activities.map(act => {
        const numbr = Intl.NumberFormat('de-DE');
        return {
          Date: act.date,
          StockId: act.company,
          Note: act.note,
          CouponPerc: null,
          Maturity: null,
          Notional: null,
          Coupon_Payment: null,
          AVG_Filter: null,
          ISIN: act.isin,
          TransactionType: this.getTransactionTypeNum(act.type),
          Quantity: numbr.format(act.shares),
          Price: numbr.format(act.price),
          rawAmount: numbr.format(
            act.type === 'Buy' ? -act.amount : act.amount
          ),
          fee: numbr.format(
            act.type === 'Buy' ? -Number(act.fee) : Number(act.fee)
          ),
          PayedOrReceived: numbr.format(
            act.type === 'Buy' ? -act.amount - act.fee : act.amount + act.fee
          ),
        };
      });
    },
  },
  methods: {
    showHoldingWarning(a) {
      return !a.filename && !a.holding;
    },
    activitiesToMyExcel() {
      const items = this.remappedActivities;
      const replacer = (key, value) => (value === null ? '' : value); // specify how you want to handle null values here
      const header = Object.keys(items[0]);
      const csv = [
        header.join('\t'), // header row first
        ...items.map(row =>
          header
            .map(fieldName => JSON.stringify(row[fieldName], replacer))
            .join('\t')
        ),
      ].join('\r\n');
      return csv;
    },
    getTransactionTypeNum(type) {
      if (type === 'Dividend') {
        return 0;
      } else if (type === 'Buy') {
        return -1;
      } else if (type === 'Sell') {
        return 1;
      } else {
        return 999;
      }
    },
    getRawAmount(act) {
      return act.type === 'Buy' ? -act.amount : act.amount;
    },
    getPriceColor(type) {
      if (type === 'Dividend' || type === 'Buy' || type === 'Import') {
        return 'has-text-success';
      } else {
        return 'has-text-danger';
      }
    },
    getTypeColor(type) {
      if (type === 'Dividend' || type === 'Buy' || type === 'Import') {
        return 'is-success';
      } else {
        return 'is-danger';
      }
    },
    formatDate(d) {
      return formatDistanceToNow(parse(d, 'yyyy-MM-dd', new Date()), {
        locale: de,
        addSuffix: true,
      });
    },
    numberWithCommas(x) {
      var parts = x.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return parts.join(',');
    },
    formatPrice(p = 0) {
      return this.numberWithCommas(p.toFixed(2));
    },
    handleParserResults(result) {
      if (result.activities && result.activities.length) {
        console.table(result.activities);
      }

      if (!result.successful) {
        this.errors.push(result);
        return;
      }

      this.activities.push(...result.activities);
    },
    loadJson() {
      let content = undefined;

      try {
        content = JSON.parse(this.jsonContent);
      } catch (exception) {
        console.error(exception);
      }

      if (content === undefined) {
        return;
      }

      let activities = [];
      let status = 0;

      try {
        activities = parseActivitiesFromPages(
          content,
          `demo_file.${this.jsonExtension}`,
          this.jsonExtension
        );
      } catch (e) {
        console.error(e);
        if (e.data && e.data.status) {
          status = e.data.status;
        } else {
          status = 3; // unexpected error parsing (e.g. JSON.parse didn't work)
        }
      }

      this.clearResults();

      this.handleParserResults({
        file: 'json.' + this.jsonExtension,
        content: this.jsonContent,
        activities,
        status,
        successful: activities !== undefined && status === 0,
      });
    },
    copyContentToClipboard(name) {
      const copyText = document.getElementById('content-' + name);

      copyText.style.display = 'block';

      copyText.select();
      copyText.setSelectionRange(0, 99999);

      document.execCommand('copy');

      copyText.style.display = 'none';
    },
    async fileHandler() {
      this.clearResults();
      Array.from(this.$refs.myFiles.files).forEach(file => {
        parseFile(file).then(parsedFile => {
          /*  DOES NOT WORK !
          const result = parseActivitiesFromPages(
            parsedFile.pages,
            file.name,
            parsedFile.extension
          );

          result.file = file.name;
          result.content = parsedFile.pages;
          result.successful =
            result.activities !== undefined && result.status === 0;

          this.handleParserResults(result);
          */
          // copied and adapted from loadJson:

          let activities = [];
          let status = 0;

          try {
            activities = parseActivitiesFromPages(
              parsedFile.pages,
              file.name,
              parsedFile.extension
            );
          } catch (e) {
            console.error(e);
            console.log("file content:"+file);
            if (e.data && e.data.status) {
              status = e.data.status;
            } else {
              status = 3; // unexpected error parsing (e.g. JSON.parse didn't work)
            }
          }

          this.clearResults();

          this.handleParserResults({
            file: file.name,
            content: parsedFile.pages,
            activities,
            status,
            successful: activities !== undefined && status === 0,
          });
        });
      });
    },
    clearResults() {
      this.errors = [];
      this.activities = [];
    },
  },
});
