'use strict'

const {
  PoolBase,
  kClients,
  kNeedDrain,
  kAddClient,
  kDispatch
} = require('./pool-base')
const Client = require('./client')
const {
  InvalidArgumentError
} = require('./core/errors')
const util = require('./core/util')
const { kUrl } = require('./core/symbols')
const buildConnector = require('./core/connect')

const kOptions = Symbol('options')
const kConnections = Symbol('connections')
const kFactory = Symbol('factory')

function defaultFactory (origin, opts) {
  return new Client(origin, opts)
}

class Pool extends PoolBase {
  constructor (origin, {
    connections,
    factory = defaultFactory,
    connect,
    connectTimeout,
    tls,
    maxCachedSessions,
    socketPath,
    ...options
  } = {}) {
    super()

    if (connections != null && (!Number.isFinite(connections) || connections < 0)) {
      throw new InvalidArgumentError('invalid connections')
    }

    if (typeof factory !== 'function') {
      throw new InvalidArgumentError('factory must be a function.')
    }

    if (connect != null && typeof connect !== 'function' && typeof connect !== 'object') {
      throw new InvalidArgumentError('connect must be a function or an object')
    }

    if (typeof connect !== 'function') {
      connect = buildConnector({
        ...tls,
        maxCachedSessions,
        socketPath,
        timeout: connectTimeout == null ? 10e3 : connectTimeout,
        ...connect
      })
    }

    this[kConnections] = connections || null
    this[kUrl] = util.parseOrigin(origin)
    this[kOptions] = { ...util.deepClone(options), connect }
    this[kFactory] = factory
  }

  [kDispatch] () {
    let dispatcher = this[kClients].find(dispatcher => !dispatcher[kNeedDrain])

    if (dispatcher) {
      return dispatcher
    }

    if (!this[kConnections] || this[kClients].length < this[kConnections]) {
      dispatcher = this[kFactory](this[kUrl], this[kOptions])
      this[kAddClient](dispatcher)
    }

    return dispatcher
  }
}

module.exports = Pool
