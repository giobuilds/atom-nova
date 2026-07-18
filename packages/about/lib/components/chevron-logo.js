const etch = require('etch');
const EtchComponent = require('../etch-component');

const $ = etch.dom;

/** In-app Chevron wordmark: mark + word, currentColor for theme adaptation. */
module.exports = class ChevronLogo extends EtchComponent {
  render() {
    return $.svg(
      {
        className: 'about-logo',
        width: '280px',
        height: '64px',
        viewBox: '0 0 280 64',
        'aria-label': 'Chevron'
      },
      // Double-chevron mark
      $.g(
        { fill: 'currentColor', transform: 'translate(4, 8)' },
        $.path({
          d:
            'M4 4 L22 24 L4 44 L12 44 L30 24 L12 4 Z M26 4 L44 24 L26 44 L34 44 L52 24 L34 4 Z'
        })
      ),
      // Wordmark
      $.text({
        x: '72',
        y: '42',
        fill: 'currentColor',
        'font-family':
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        'font-size': '36',
        'font-weight': '600',
        'letter-spacing': '-0.5'
      }, 'Chevron')
    );
  }
};
