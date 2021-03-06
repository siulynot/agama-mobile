import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { electrumServers } from './actions/electrumServers';

import actions from './actions/actions';
import {
  setLocalStorageVar,
  getLocalStorageVar,
  sortBy,
} from './actions/utils';
import { translate } from './translate/translate';

import SendCoin from './components/SendCoin';
import MyAddress from './components/MyAddress';
import AddCoin from './components/AddCoin';
import Login from './components/Login';
import Transactions from './components/Transactions';
import Balance from './components/Balance';
import Spinner from './components/Spinner';
import ServerSelect from './components/ServerSelect';
import CreateSeed from './components/CreateSeed';

const DASHBOARD_UPDATE_INTERVAL = 120000;

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      address: null,
      balance: null,
      transactions: null,
      utxo: null,
      errors: null,
      displayMenu: false,
      loading: false,
      coin: null,
      coins: {},
      pubKeys: {},
      activeSection: null,
      saveSeed: null,
      auth: false,
      updateInterval: null,
      conError: false,
      proxyError: false,
    };
    this.defaultState = JSON.parse(JSON.stringify(this.state));
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.lock = this.lock.bind(this);
    // this.getKeys = this.getKeys.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.toggleSend = this.toggleSend.bind(this);
    this.toggleCreateSeed = this.toggleCreateSeed.bind(this);
    this.toggleAddCoin = this.toggleAddCoin.bind(this);
    this.dashboardRefresh = this.dashboardRefresh.bind(this);
    this.switchCoin = this.switchCoin.bind(this);
    this.addCoin = this.addCoin.bind(this);
    this.changeActiveSection = this.changeActiveSection.bind(this);
    this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
    this.toggleLogin = this.toggleLogin.bind(this);
  }

  componentWillMount() {
    const _localStorageCoins = getLocalStorageVar('coins');

    if (_localStorageCoins) {
      this.setState({
        coins: _localStorageCoins,
      });
    }
  }

  addCoin(coin) {
    let coins = this.state.coins;
    coins[coin] = {
      // defaults
    };

    this.setState({
      coins,
    });

    setLocalStorageVar('coins', this.state.coins);
  }

  changeActiveSection(section, toggleMenu) {
    if (toggleMenu) {
      this.setState({
        displayMenu: false,
        activeSection: section,
      });
    } else {
      this.setState({
        activeSection: section,
      });
    }

    document.getElementById('body').style.overflow = 'inherit';
  }

  switchCoin(coin) {
    this.setState({
      coin: coin,
      address: this.state.pubKeys[coin],
      activeSection: this.state.activeSection !== 'send' ? 'dashboard' : 'send',
    });

    // toggle refresh and update in-mem coins cache obj
    setTimeout(() => {
      this.toggleMenu();
      this.dashboardRefresh();
    }, 10);
  }

  toggleAutoRefresh(disable) {
    if (disable) {
      clearInterval(this.state.updateInterval);

      this.setState({
        updateInterval: null,
      });
    } else {
      const _updateInterval = setInterval(() => {
        if (this.state.activeSection === 'dashboard') {
          this.dashboardRefresh();
        }
      }, DASHBOARD_UPDATE_INTERVAL);

      this.setState({
        updateInterval: _updateInterval,
      });
    }
  }

  dashboardRefresh() {
    this.getBalance();
    this.getTransactions();
  }

  /*getKeys() {
    const { actions } = this.props;

    actions.getKeys()
    .then((res) => {
      console.warn(res);
    });
  }*/

  getBalance() {
    const { actions } = this.props;

    actions.balance(this.state.coin)
    .then((res) => {
      if (res &&
          res === 'proxy-error') {
        this.setState({
          proxyError: true,
        });
      } else {
        if (res &&
            !res.hasOwnProperty('balance') &&
            res.indexOf('error') > -1) {
          this.setState({
            balance: null,
            transactions: null,
            conError: true,
          });
        } else {
          this.setState({
            balance: res,
            conError: false,
            proxyError: false,
          });
        }
      }
    });
  }

  getTransactions() {
    const { actions } = this.props;

    this.setState({
      loading: true,
    });

    actions.transactions(this.state.coin)
    .then((res) => {
      if (res &&
          res.indexOf('error') > -1) {
        this.setState({
          balance: null,
          transactions: null,
          loading: false,
          conError: true,
        });
      } else {
        res = sortBy(res, 'confirmations');

        this.setState({
          transactions: res,
          loading: false,
          conError: false,
          proxyError: false,
        });
      }
    });
  }

  // purge keys and added coins
  logout() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      this.toggleAutoRefresh(true);
      setLocalStorageVar('coins', {});

      setTimeout(() => {
        this.toggleMenu();
      }, 10);
      setTimeout(() => {
        this.setState(this.defaultState);
      }, 20);
    });
  }

  // lock is logout when list of added coins is persistent
  lock() {
    const { actions } = this.props;

    actions.clearKeys()
    .then((res) => {
      const lockState = Object.assign({}, this.defaultState);
      lockState.coins = this.state.coins;

      this.toggleAutoRefresh(true);
      setTimeout(() => {
        this.toggleMenu();
      }, 10);
      setTimeout(() => {
        this.setState(lockState);
      }, 20);
    });
  }

  login(passphrase) {
    const { actions } = this.props;

    actions.auth(passphrase)
    .then((res) => {
      // select a coin and an address
      let coin;
      let address;

      if (this.state.coins.kmd) {
        coin = 'kmd';
        address = res.kmd;
      } else {
        coin = Object.keys(this.state.coins)[0];
        address = res[coin];
      }

      this.setState({
        auth: true,
        pubKeys: res,
        coin,
        address,
        activeSection: 'dashboard',
      });

      this.dashboardRefresh();
      this.toggleAutoRefresh();
    });
  }

  toggleMenu() {
    if (!this.state.displayMenu) {
      document.getElementById('body').style.overflow = 'hidden';
    } else {
      document.getElementById('body').style.overflow = 'inherit';
    }

    this.setState({
      displayMenu: !this.state.displayMenu,
    });
  }

  toggleSend() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'send' ? 'dashboard' : 'send',
    });
  }

  toggleAddCoin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'addcoin' ? 'dashboard' : 'addcoin',
    });
  }

  toggleCreateSeed() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'create-seed' ? 'dashboard' : 'create-seed',
    });
  }

  toggleLogin() {
    setTimeout(() => {
      this.toggleMenu();
    }, 10);

    this.setState({
      activeSection: this.state.activeSection === 'login' ? 'dashboard' : 'login',
    });
  }

  renderActiveCoins() {
    let _items = [];

    if (this.state.coins &&
        this.state.coins.kmd) {
      _items.push(
        <div
          onClick={ () => this.state.coin !== 'kmd' ? this.switchCoin('kmd') : null }
          key={ `active-coins-kmd` }
          className="active-coins">
          <img
            src={ `/images/cryptologo/kmd.png` } /> <span>KMD</span>
          { this.state.coin === 'kmd' &&
            <i className="fa fa-check"></i>
          }
        </div>
      );
    }

    for (let key in this.state.coins) {
      if (key !== 'kmd') {
        _items.push(
          <div
            onClick={ () => key !== this.state.coin ? this.switchCoin(key) : null }
            key={ `active-coins-${key}` }
            className="active-coins">
            <img
              src={ `/images/cryptologo/${key}.png` } /> <span>{ key.toUpperCase() }</span>
            { key === this.state.coin &&
              <i className="fa fa-check"></i>
            }
          </div>
        );
      }
    }

    return _items;
  }

  renderMenu() {
    if (this.state.displayMenu) {
      return (
        <div className="nav-menu">
          <div
            onClick={ this.toggleMenu }
            className="nav-menu-overlay"></div>
          <div
            id="nav-menu-inner"
            className="nav-menu-inner">
            <i
              onClick={ this.toggleMenu }
              className="fa fa-bars"></i>
            { this.state.auth &&
              <div className="nav-menu-items">
                <div onClick={ this.logout }>{ translate('DASHBOARD.LOGOUT') }</div>
                <div onClick={ this.lock }>{ translate('DASHBOARD.LOCK') }</div>
                { this.state.activeSection !== 'dashboard' &&
                  <div onClick={ () => this.changeActiveSection('dashboard', true) }>{ translate('DASHBOARD.DASHBOARD') }</div>
                }
                { this.state.activeSection !== 'send' &&
                  <div onClick={ this.toggleSend }>{ translate('DASHBOARD.SEND') }</div>
                }
                <div>
                { this.renderActiveCoins() }
                </div>
                { this.state.activeSection !== 'addcoin' &&
                  Object.keys(this.state.coins).length !== Object.keys(electrumServers).length &&
                  <div onClick={ this.toggleAddCoin }>{ translate('DASHBOARD.ADD_COIN') }</div>
                }
              </div>
            }
            { !this.state.auth &&
              <div className="nav-menu-items">
                { (this.state.activeSection === 'addcoin' || this.state.activeSection === 'create-seed') &&
                  <div onClick={ this.toggleLogin }>{ translate('DASHBOARD.LOGIN') }</div>
                }
                { this.state.activeSection !== 'addcoin' &&
                  <div onClick={ this.toggleAddCoin }>{ translate('DASHBOARD.ADD_COIN') }</div>
                }
                { this.state.activeSection !== 'create-seed' &&
                  <div onClick={ this.toggleCreateSeed }>{ translate('DASHBOARD.CREATE_SEED') }</div>
                }
              </div>
            }
          </div>
        </div>
      );
    } else {
      return null;
    }
  }

  render() {
    return (
      <div className="app-container">
        <div className="app-header">
          <img src="/images/agama-logo-side.svg" />
          { this.state.auth &&
            <img
              className="margin-left-20"
              src={ `/images/cryptologo/${this.state.coin}.png` } />
          }
          <i
            onClick={ this.toggleMenu }
            className="fa fa-bars"></i>
        </div>
        <div className="app-main">
          <Login
            { ...this.state }
            login={ this.login } />
          <CreateSeed
            { ...this.state }
            login={ this.login } />
          { this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            <MyAddress { ...this.state } />
          }
          { this.renderMenu() }
          <SendCoin
            { ...this.state }
            sendtx={ this.props.actions.sendtx } />
          <AddCoin
            { ...this.state }
            addCoin={ this.addCoin }
            changeActiveSection={ this.changeActiveSection } />
          { !this.state.loading &&
            this.state.auth &&
            this.state.activeSection === 'dashboard' &&
            <i
              onClick={ this.dashboardRefresh }
              className="fa fa-refresh dashboard-refresh"></i>
          }
          { this.state.loading &&
            this.state.activeSection === 'dashboard' &&
            <Spinner />
          }
          { this.state.conError &&
            <ServerSelect
              { ...this.state }
              dashboardRefresh={ this.dashboardRefresh }
              getServersList={ this.props.actions.getServersList }
              setDefaultServer={ this.props.actions.setDefaultServer } />
          }
          { this.state.proxyError &&
            <div className="con-error">
              <i className="fa fa-warning error"></i> <span className="error">{ translate('DASHBOARD.PROXY_ERROR') }</span>
            </div>
          }
          <Balance { ...this.state } />
          <Transactions { ...this.state } />
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    keys: state.keys,
  }
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch),
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);