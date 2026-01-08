module.exports = function (RED) {
  'use strict'

  function ThresholdControl (config) {
    RED.nodes.createNode(this, config)

    const node = this
    node.config = config
    let hasReceivedInput = false
    let sendOutput = false
    let countDown = false
    let counter = 0
    let desiredState = 'unknown'
    let State = desiredState
    let fill = 'yellow'

    let onThreshold = Number(config.onThreshold)
    let offThreshold = Number(config.offThreshold)
    let onDelay = Math.round(Number(config.onDelay))
    let offDelay = Math.round(Number(config.offDelay))
    let ignoreFirstIfOn = config.ignoreFirstIfOn
    let ignoreFirstIfOff = config.ignoreFirstIfOff
    let message = null;

    const intervalId = setInterval(function () {
      if (countDown) {
        if (counter % 2 === 0) {
          node.status({
            fill: 'yellow',
            shape: 'dot',
            text: `Switching ${desiredState} in ${counter} sec`
          })
        } else {
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Switching ${desiredState} in ${counter} sec`
          })
        }
        if (counter > 0) {
          counter--
        } else {
          sendOutput = true
        }
        if (sendOutput) {
          if (desiredState === 'on' && node.config.payloadOnType !== 'nul') {
            message.payload = RED.util.evaluateNodeProperty(node.config.onPayload, node.config.payloadOnType, node);
            node.send([message, null]);
          }
          if (desiredState === 'off' && node.config.payloadOffType !== 'nul') {
            message.payload = RED.util.evaluateNodeProperty(node.config.offPayload, node.config.payloadOffType, node)
            node.send([null, message]);
          }
          sendOutput = false
          countDown = false
          if (desiredState === 'on') {
            fill = 'green'
          }
          if (desiredState === 'off') {
            fill = 'red'
          }
          node.status({
            fill,
            shape: 'dot',
            text: `${desiredState}`
          })
          State = desiredState
        }
      }
    }, 1000)

    node.on('input', function (msg) {
      if ('onThreshold' in msg && !(isNaN(msg.onThreshold) || msg.onThreshold === "")) {
        onThreshold = msg.onThreshold
      }

      if ('offThreshold' in msg  && !(isNaN(msg.offThreshold) || msg.offThreshold === "")) {
        offThreshold = msg.offThreshold
      }

      if ('onDelay' in msg  && !(isNaN(msg.onDelay) || msg.onDelay === "")) {
        onDelay = Math.round(msg.onDelay)
      }

      if ('offDelay' in msg  && !(isNaN(msg.offDelay) || msg.offDelay === "")) {
        offDelay = Math.round(msg.offDelay)
      }

      if ('payload' in msg  && (isNaN(msg.payload) || msg.payload === "")) {
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'Non-numerical input'
        })
        return
      }

      if (isNaN(onThreshold)) {
        node.status({ fill: 'red', shape: 'dot', text: 'No or non-mumerical ON threshold set' })
        return
      }

      if (isNaN(offThreshold)) {
        node.status({ fill: 'red', shape: 'dot', text: 'No or non-mumerical OFF threshold set' })
        return
      }

      if (State === 'unknown') {
        fill = 'blue'
      }

      msg.topic = 'Threshold'

      if (countDown && desiredState === 'on' && msg.payload < onThreshold) {
        //desiredState = State
        countDown = false
        counter = 0
      }

      if (countDown && desiredState === 'off' && msg.payload > offThreshold) {
        desiredState = State
        countDown = false
        counter = 0
      }

      if (!countDown) {
        node.status({ fill, shape: 'dot', text: `${desiredState}` })
      }

      if (msg.payload >= onThreshold && desiredState !== 'on' && counter === 0) {
        desiredState = 'on'

        if (ignoreFirstIfOn && !hasReceivedInput) {
          State = desiredState
          node.status({
            fill: 'green',
            shape: 'dot',
            text: `${desiredState}`
          })
        } else {
          counter = onDelay
          countDown = true
        }
      }

      if (msg.payload <= offThreshold && desiredState !== 'off' && counter === 0) {
        desiredState = 'off'

        if (ignoreFirstIfOff && !hasReceivedInput) {
          State = desiredState
          node.status({
            fill: 'red',
            shape: 'dot',
            text: `${desiredState}`
          })
        } else {
          counter = offDelay
          countDown = true
        }
      }
      hasReceivedInput = true
      message = msg;
    })

    node.on('close', function () {
      clearInterval(intervalId)
    })

    if (config.verbose) {
      node.warn('verbose')
    }
  }

  RED.nodes.registerType('threshold', ThresholdControl)
}
