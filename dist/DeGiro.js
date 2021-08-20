"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeGiro = void 0;
var async = require("async");
var api_1 = require("./api");
var DeGiro = (function () {
    function DeGiro(params) {
        var _this = this;
        if (params === void 0) { params = {}; }
        this.hasSessionId = function () { return !!_this.accountConfig && !!_this.accountConfig.data && !!_this.accountConfig.data.sessionId; };
        this.getJSESSIONID = function () { return _this.hasSessionId() ? _this.accountConfig.data.sessionId : undefined; };
        var username = params.username, pwd = params.pwd, oneTimePassword = params.oneTimePassword, jsessionId = params.jsessionId;
        username = username || process.env['DEGIRO_USER'];
        pwd = pwd || process.env['DEGIRO_PWD'];
        oneTimePassword = oneTimePassword || process.env['DEGIRO_OTP'];
        jsessionId = jsessionId || process.env['DEGIRO_JSESSIONID'];
        if (!username && !jsessionId)
            throw new Error('DeGiro api needs an username to access');
        if (!pwd && !jsessionId)
            throw new Error('DeGiro api needs an password to access');
        this.username = username;
        this.pwd = pwd;
        this.oneTimePassword = oneTimePassword;
        this.jsessionId = jsessionId;
    }
    DeGiro.create = function (params) {
        return new DeGiro(params);
    };
    DeGiro.prototype.login = function () {
        var _this = this;
        if (this.jsessionId)
            return this.loginWithJSESSIONID(this.jsessionId);
        return new Promise(function (resolve, reject) {
            api_1.loginRequest({
                username: _this.username,
                pwd: _this.pwd,
                oneTimePassword: _this.oneTimePassword,
            })
                .then(function (loginResponse) {
                if (!loginResponse.sessionId)
                    reject('Login response have not a sessionId field');
                else
                    return _this.getAccountConfig(loginResponse.sessionId);
            })
                .then(function () { return _this.getAccountData(); })
                .then(resolve)
                .catch(reject);
        });
    };
    DeGiro.prototype.logout = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.accountData || !_this.accountConfig) {
                return reject('You must log in first');
            }
            api_1.logoutRequest(_this.accountData, _this.accountConfig)
                .then(function () {
                delete _this.accountData;
                delete _this.accountConfig;
                resolve();
            })
                .catch(reject);
        });
    };
    DeGiro.prototype.isLogin = function (options) {
        var _this = this;
        if (!options || !options.secure)
            return this.hasSessionId() && !!this.accountData;
        return new Promise(function (resolve) {
            _this.getAccountConfig()
                .then(function () { return resolve(true); })
                .catch(function () { return resolve(false); });
        });
    };
    DeGiro.prototype.loginWithJSESSIONID = function (jsessionId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getAccountConfig(jsessionId)
                .then(function () { return _this.getAccountData(); })
                .then(function (accountData) {
                _this.jsessionId = undefined;
                resolve(accountData);
            })
                .catch(reject);
        });
    };
    DeGiro.prototype.getAccountConfig = function (sessionId) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!sessionId && !_this.hasSessionId()) {
                return reject('You must log in first or provide a JSESSIONID');
            }
            api_1.getAccountConfigRequest(sessionId || _this.accountConfig.data.sessionId)
                .then(function (accountConfig) {
                _this.accountConfig = accountConfig;
                resolve(accountConfig);
            })
                .catch(reject);
        });
    };
    DeGiro.prototype.getAccountData = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.hasSessionId()) {
                return reject('You must log in first');
            }
            api_1.getAccountDataRequest(_this.accountConfig)
                .then(function (accountData) {
                _this.accountData = accountData;
                resolve(accountData);
            })
                .catch(reject);
        });
    };
    DeGiro.prototype.getAccountState = function (options) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getAccountStateRequest(this.accountData, this.accountConfig, options);
    };
    DeGiro.prototype.getAccountReports = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getAccountReportsRequest(this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getAccountInfo = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getAccountInfoRequest(this.accountData, this.accountConfig);
    };
    DeGiro.prototype.searchProduct = function (options) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.searchProductRequest(options, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getCashFunds = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getCashFundstRequest(this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getPortfolio = function (config) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this.hasSessionId()) {
                return reject('You must log in first');
            }
            api_1.getPortfolioRequest(_this.accountData, _this.accountConfig, config)
                .then(function (portfolio) { return _this.completePortfolioDetails(portfolio, config.getProductDetails || false); })
                .then(resolve)
                .catch(reject);
        });
    };
    DeGiro.prototype.completePortfolioDetails = function (portfolio, getProductDetails) {
        var _this = this;
        if (!getProductDetails)
            return Promise.resolve(portfolio);
        return new Promise(function (resolve, reject) {
            async.map(portfolio, function (position, next) {
                if (position.positionType !== 'PRODUCT')
                    return next(null, position);
                _this.getProductsByIds([(position.id)])
                    .then(function (product) {
                    position.productData = product[position.id];
                    next(null, position);
                })
                    .catch(function (error) { return next(error); });
            }, function (error, portfolio) {
                if (error)
                    return reject(error);
                resolve(portfolio);
            });
        });
    };
    DeGiro.prototype.getFavouriteProducts = function () {
        return new Promise(function (resolve, reject) {
            reject('Method not implemented');
        });
    };
    DeGiro.prototype.getPopularStocks = function (config) {
        if (config === void 0) { config = {}; }
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getPopularStocksRequest(this.accountData, this.accountConfig, config);
    };
    DeGiro.prototype.getOrders = function (config) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getOrdersRequest(this.accountData, this.accountConfig, config);
    };
    DeGiro.prototype.getHistoricalOrders = function (options) {
        return new Promise(function (resolve, reject) {
            reject('Method not implemented');
        });
    };
    DeGiro.prototype.createOrder = function (order) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.createOrderRequest(order, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.executeOrder = function (order, executeId) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.executeOrderRequest(order, executeId, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.deleteOrder = function (orderId) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.deleteOrderRequest(orderId, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getTransactions = function (options) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getTransactionsRequest(this.accountData, this.accountConfig, options);
    };
    DeGiro.prototype.getProductsByIds = function (ids) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getProductsByIdsRequest(ids, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getNews = function (options) {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getNewsRequest(options, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getWebi18nMessages = function (lang) {
        if (lang === void 0) { lang = 'es_ES'; }
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getWebi18nMessagesRequest(lang, this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getWebSettings = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getWebSettingsRequest(this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getWebUserSettings = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getWebUserSettingsRequest(this.accountData, this.accountConfig);
    };
    DeGiro.prototype.getConfigDictionary = function () {
        if (!this.hasSessionId()) {
            return Promise.reject('You must log in first');
        }
        return api_1.getConfigDictionaryRequest(this.accountData, this.accountConfig);
    };
    return DeGiro;
}());
exports.DeGiro = DeGiro;
//# sourceMappingURL=DeGiro.js.map