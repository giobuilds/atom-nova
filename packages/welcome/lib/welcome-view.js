/** @babel */
/** @jsx etch.dom **/

import etch from 'etch';

export default class WelcomeView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);

    this.element.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (link && link.dataset.event) {
        this.props.reporterProxy.sendEvent(
          `clicked-welcome-${link.dataset.event}-link`
        );
      }
    });
  }

  didChangeShowOnStartup() {
    atom.config.set('welcome.showOnStartup', this.checked);
  }

  update() {}

  serialize() {
    return {
      deserializer: 'WelcomeView',
      uri: this.props.uri
    };
  }

  render() {
    return (
      <div className="welcome">
        <div className="welcome-container">
          <header className="welcome-header">
            <a href="https://github.com/builtbygio/chevron">
              <svg
                className="welcome-logo"
                width="280px"
                height="64px"
                viewBox="0 0 280 64"
                aria-label="Chevron"
              >
                <g fill="currentColor" transform="translate(4, 8)">
                  <path d="M4 4 L22 24 L4 44 L12 44 L30 24 L12 4 Z M26 4 L44 24 L26 44 L34 44 L52 24 L34 4 Z" />
                </g>
                <text
                  x="72"
                  y="42"
                  fill="currentColor"
                  font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif"
                  font-size="36"
                  font-weight="600"
                  letter-spacing="-0.5"
                >
                  Chevron
                </text>
              </svg>
              <h1 className="welcome-title">
                Hackable. Fast. Yours.
              </h1>
            </a>
          </header>

          <section className="welcome-panel">
            <p>
              Chevron is a modernised fork of Atom. Package APIs stay{' '}
              <code>atom://</code>-compatible.
            </p>
            <p>For help, please visit</p>
            <ul>
              <li>
                The{' '}
                <a
                  href="https://github.com/builtbygio/chevron"
                  dataset={{ event: 'chevron-repo' }}
                >
                  Chevron repository
                </a>{' '}
                for docs, issues, and releases.
              </li>
              <li>
                Community packages still work with the Atom package API (
                <code>global.atom</code>, <code>engines.atom</code>,{' '}
                <code>apm</code>).
              </li>
              <li>
                Historical Atom references:{' '}
                <a
                  href="https://github.com/atom/atom"
                  dataset={{ event: 'atom-archive' }}
                >
                  atom/atom archive
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="welcome-panel">
            <label>
              <input
                className="input-checkbox"
                type="checkbox"
                checked={atom.config.get('welcome.showOnStartup')}
                onchange={this.didChangeShowOnStartup}
              />
              Show Welcome Guide when opening Chevron
            </label>
          </section>

          <footer className="welcome-footer">
            <a
              href="https://github.com/builtbygio/chevron"
              dataset={{ event: 'footer-chevron' }}
            >
              builtbygio/chevron
            </a>{' '}
            <span className="text-subtle">×</span>{' '}
            <a
              className="icon icon-octoface"
              href="https://github.com/"
              dataset={{ event: 'footer-octocat' }}
            />
          </footer>
        </div>
      </div>
    );
  }

  getURI() {
    return this.props.uri;
  }

  getTitle() {
    return 'Welcome';
  }

  isEqual(other) {
    return other instanceof WelcomeView;
  }
}
